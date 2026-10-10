import { ElementMapper } from '../constants/element-mapper';
import { ElementType } from '../constants/element-type.const';
import { getMonsterOffensiveSkills, MonsterOffensiveSkill } from '../constants/monster-offensive-skills';
import { EquipmentSummaryModel } from '../models/equipment-summary.model';
import { Attack } from '../models/monster.model';
import { defenderReductionSteps } from './pvp';

export interface MonsterAttackProfile {
  id: number;
  race: string;
  size: 's' | 'm' | 'l';
  type: 'normal' | 'boss';
  attack: Attack;
  magicAttack: Attack;
}

export interface IncomingDamageDefender {
  hp: number;
  def: number;
  softDef: number;
  mdef: number;
  softMdef: number;
  res: number;
  mres: number;
  bonus: Partial<EquipmentSummaryModel>;
  armorElement: ElementType;
}

export interface IncomingDamageProfile { attacker: MonsterAttackProfile; defender: IncomingDamageDefender; }
export interface IncomingDamageOptions {
  /** Distance from Comet's center, in cells (Chebyshev distance). */
  cometDistance?: number;
  /** Number of living targets sharing each Earthquake wave. */
  earthquakeTargets?: number;
  /** Meteors actually hitting the defender, not the number spawned. */
  meteors?: number;
  attackerDistance?: number;
  /** Optional simulation of an elemental armor/status change. Armor is level 1. */
  armorElement?: ElementType;
}
export interface IncomingDamageStep { label: string; min: number; max: number; keys: string[]; factor?: number; }
export interface IncomingDamageResult {
  skill: MonsterOffensiveSkill;
  min: number;
  max: number;
  perHit: { min: number; max: number };
  hits: number;
  hpPercent: { min: number; max: number } | null;
  steps: IncomingDamageStep[];
  armorElement: ElementType;
}

const boundedInteger = (value: number | undefined, fallback: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value!))) : fallback;

/** Pure incoming PvE damage. Uses the character sheet (including selected effects),
 * and the same equipment reductions as PvP, without a castle or monster aura layer.
 * The range assumes every selected hit connects; it is not an average over flee/procs. */
export function calculateMonsterDamageTaken(profile: IncomingDamageProfile, skillId: number,
  options: IncomingDamageOptions = {}): IncomingDamageResult | null {
  const skill = getMonsterOffensiveSkills(profile.attacker.id).find(entry => entry.id === skillId);
  if (!skill) return null;
  const { attacker, defender } = profile;
  const armorElement = options.armorElement ?? defender.armorElement;
  const steps: IncomingDamageStep[] = [];
  const range = skill.damageType === 'physical' || skill.formula === 'earthquake' ? attacker.attack : attacker.magicAttack;
  let min = skill.damageType === 'fixed' ? 10000 : range.minimum;
  let max = skill.damageType === 'fixed' ? 10000 : range.maximum;
  const push = (label: string, keys: string[] = [], factor?: number) => { steps.push({ label, min, max, keys, factor }); };
  const multiply = (label: string, factor: number, keys: string[] = []) => {
    min = Math.floor(min * factor); max = Math.floor(max * factor); push(label, keys, factor);
  };
  const applyEquipmentReductions = () => {
    if (skill.damageType === 'fixed') return;
    const bonus = skill.formula === 'earthquake'
      ? { dmg_taken_all: defender.bonus.dmg_taken_all, dmg_taken_magical: defender.bonus.dmg_taken_magical }
      : defender.bonus;
    for (const step of defenderReductionSteps({ bonus, dmgType: skill.damageType,
      attackerRace: attacker.race, attackerElement: skill.element.toLowerCase(), attackerSize: attacker.size,
      attackerType: attacker.type, isRanged: boundedInteger(options.attackerDistance, 1, 1, 14) > 3 })) {
      multiply(step.label, step.factor, step.keys);
    }
  };
  push(skill.damageType === 'fixed' ? 'Dano fixo por segundo' : skill.damageType === 'physical' || skill.formula === 'earthquake' ? 'ATQ do monstro' : 'ATQM do monstro');
  // Renewal magic card reductions act on MATK before the skill multiplier and
  // MDEF. Monster weapon damage applies them after DEF and armor property.
  if (skill.damageType === 'magical' && skill.formula !== 'earthquake') applyEquipmentReductions();
  let ratio = 1;
  let hits = 1;
  switch (skill.formula) {
    case 'npc-comet': {
      const band = Math.max(1, Math.floor(boundedInteger(options.cometDistance, 0, 0, 9) / 2));
      ratio = (2500 + (skill.level - band + 1) * 500) / 100;
      break;
    }
    case 'tetra-vortex': ratio = (800 + 400 * skill.level) / 100; hits = 4; break;
    case 'hell-judgement': ratio = skill.level; break;
    case 'dark-strike': hits = Math.ceil(skill.level / 2); break;
    case 'meteor-storm': ratio = 1.25; hits = (skill.hitsPerMeteor ?? 7) * boundedInteger(options.meteors, 1, 1, 7); break;
    case 'earthquake': ratio = 8; hits = 3; break;
    case 'killing-aura': break;
  }
  if (ratio !== 1) multiply(`Multiplicador da habilidade (${ratio * 100}%)`, ratio);
  if (skill.formula === 'earthquake') {
    multiply('Divisão por alvos vivos', 1 / boundedInteger(options.earthquakeTargets, 1, 1, 100));
  } else if (skill.damageType !== 'fixed') {
    const physical = skill.damageType === 'physical';
    const resistance = Math.max(0, physical ? defender.res : defender.mres);
    if (resistance) multiply(physical ? 'Redução TEN' : 'Redução TENM', 1 - Math.min(0.5, 0.8 * resistance / (resistance + 400)), [physical ? 'res' : 'mres']);
    const hard = Math.max(0, physical ? defender.def : defender.mdef);
    const base = physical ? 4000 : 1000;
    if (hard) multiply(physical ? 'Redução DEF' : 'Redução DEFM', (base + hard) / (base + 10 * hard), [physical ? 'def' : 'mdef']);
    const soft = physical ? defender.softDef : defender.softMdef;
    min = min === 0 ? 0 : Math.max(1, min - soft); max = max === 0 ? 0 : Math.max(1, max - soft);
    if (soft) push(physical ? 'DEF de atributos' : 'DEFM de atributos', [physical ? 'softDef' : 'softMdef']);
  }
  if (skill.damageType !== 'fixed') {
    const elementFactor = ElementMapper[`${armorElement} 1`][skill.element] / 100;
    if (elementFactor !== 1) multiply('Elemento da armadura', elementFactor);
    if (skill.damageType === 'physical' || skill.formula === 'earthquake') applyEquipmentReductions();
  }
  if (skill.formula === 'npc-comet') {
    // NPC_COMET has HitCount -20: defenses act once, then the total is divided
    // and truncated per displayed hit (battle_apply_div_fix). LATAM packets
    // carry multiples of 20. Connected magic has at least 1 per displayed hit.
    min = min === 0 ? 0 : Math.max(20, Math.floor(min / 20) * 20);
    max = max === 0 ? 0 : Math.max(20, Math.floor(max / 20) * 20);
    push('Arredondamento dos 20 golpes exibidos');
  }
  const perHit = { min, max };
  if (hits > 1) multiply(`${hits} ${skill.formula === 'earthquake' ? 'ondas' : 'golpes'}`, hits);
  return { skill, min, max, perHit, hits, steps, armorElement,
    hpPercent: defender.hp > 0 ? { min: min / defender.hp * 100, max: max / defender.hp * 100 } : null };
}
