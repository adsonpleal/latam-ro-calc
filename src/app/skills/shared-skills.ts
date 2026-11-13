import { ElementType } from '../constants/element-type.const';
import { MAX_SPIRIT_CHARM, SPIRIT_CHARMS } from '../constants/share-active-skills/element-charm';
import type { WeaponTypeName } from '../constants/weapon-type-mapper';
import type { ActiveSkillModel, AtkSkillFormulaInput, AtkSkillModel } from '../jobs/_character-base.abstract';
import type { SkillStateCtx } from '../models/info-for-class.model';
// Deep imports, not the '../utils' barrel: core/auto-cast.ts imports this file and avoids
// that barrel on purpose, and pulling it in here would drag its ~31 modules back in.
import { atkSkillLevelList } from '../utils/atk-skill-level-list';
import { floor } from '../utils/floor';
import { formatCalcNumber } from '../utils/format-number';
import { StackCount, StackLimits, stackRange } from '../utils/skill-stack';

/** Apunhalar: client table (212); dagger packets: https://browiki.org/wiki/Apunhalar. */
export const BACK_STAB: AtkSkillModel = {
  name: 'Back Stab', label: 'Back Stab Lv10', value: 'Back Stab==10',
  levelList: atkSkillLevelList('Back Stab', 10),
  acd: 0.5, fct: 0, vct: 0, cd: 0.5,
  isMelee: true,
  totalHit: ({ weapon }) => weapon.data?.typeName === 'dagger' ? 2 : 1,
  formula: ({ skillLevel, weapon }) => (300 + skillLevel * 40) * (weapon.data?.typeName === 'bow' ? 0.5 : 1),
};

/** Ataque Surpresa: client table (214), also validated by the Shadow Chaser replay. */
export const SIGHTLESS_MIND: AtkSkillModel = {
  name: 'Sightless Mind', label: 'Sightless Mind Lv5', value: 'Sightless Mind==5',
  levelList: Array.from({ length: 5 }, (_, i) => ({ label: `Sightless Mind Nv${i + 1}`, value: `Sightless Mind==${i + 1}` })),
  // No client delay row; see skill-delay.spec.ts's NO_CLIENT_ROW.
  acd: 0, fct: 0, vct: 0, cd: 0,
  isMelee: true,
  formula: ({ skillLevel }) => 50 + skillLevel * 150,
};

/** Item-granted Espíritos Anciões, including Rifle Primordial-LT. */
export const SOUL_STRIKE: AtkSkillModel = {
  name: 'Soul Strike', label: 'Soul Strike Lv10', value: 'Soul Strike==10',
  acd: 0, fct: 0, vct: 0, cd: 0, isMatk: true, element: ElementType.Ghost,
  totalHit: ({ skillLevel }) => Math.ceil(skillLevel / 2),
  formula: () => 100,
};

/** High Wizard's existing Vulcão Napalm formula, also used by item autocasts. */
export const NAPALM_VULCAN: AtkSkillModel = {
  name: 'Napalm Vulcan', label: 'Napalm Vulcan Lv5', value: 'Napalm Vulcan==5',
  fct: 0.2, vct: 0.8, acd: 0.5, cd: 1,
  isMatk: true, element: ElementType.Ghost, hit: 5,
  formula: ({ model, skillLevel }) => skillLevel * 70 * (model.level / 100),
  finalDmgFormula: ({ damage, skillLevel }) => damage * skillLevel,
};

/** Also available from the Armadura Desconhecida VIT set on other classes. */
export const SOUL_VULCAN_STRIKE: AtkSkillModel = {
  name: 'Soul Vulcan Strike',
  label: '[V3] Soul Vulcan Strike Lv5',
  value: 'Soul Vulcan Strike==5',
  acd: 0.5,
  fct: 1,
  vct: 3,
  cd: 0.7,
  isMatk: true,
  element: ElementType.Ghost,
  totalHit: ({ skillLevel }) => skillLevel + 2,
  formula: ({ model, skillLevel, status }) =>
    (skillLevel * 180 + status.totalSpl * 3) * (model.level / 100),
};

/** Ataque Aéreo: fixed falcon damage per flight, independent of weapon/equipment damage. */
export const BLITZ_BEAT: AtkSkillModel = {
  name: 'Blitz Beat',
  label: 'Blitz Beat Lv5',
  value: 'Blitz Beat==5',
  levelList: Array.from({ length: 5 }, (_, i) => ({ label: `Blitz Beat Nv${i + 1}`, value: `Blitz Beat==${i + 1}` })),
  acd: 1,
  fct: 0.2,
  vct: 0.8,
  cd: 0,
  isHit100: true,
  totalHit: ({ skillLevel }) => skillLevel,
  element: ElementType.Neutral,
  formula: () => 100,
  customFormula: ({ skillLevel, status, skills }) => {
    const steelCrowLevel = skills.learnedLevel('Steel Crow');
    return ((Math.floor(status.totalAgi / 2) + Math.floor(status.totalDex / 10) + skillLevel * 10) * 2 + steelCrowLevel * 6) * skillLevel;
  },
};

/**
 * Investida de Worg: the client table is 200% per learned level.
 *
 * Replay validation is still open. The bare, stimulant, and equipment-state recordings
 * show that Worg does not fit the calculator's ordinary ranged-skill attack base, even
 * though its relative P.ATQ/trait and hunting-hood bonus changes are observable. Keep
 * this client-table ratio unchanged until a replay-backed Worg-specific damage path is
 * derived. See the backlog card created from the 2026-09-21 validation pass.
 */
export const WUG_STRIKE: AtkSkillModel = {
  name: 'Wug Strike',
  label: 'Wug Strike Lv5',
  value: 'Wug Strike==5',
  levelList: Array.from({ length: 5 }, (_, i) => ({ label: `Wug Strike Nv${i + 1}`, value: `Wug Strike==${i + 1}` })),
  acd: 0,
  fct: 0,
  vct: 0,
  cd: 0,
  element: ElementType.Neutral,
  formula: ({ skillLevel, totalBonus }) => skillLevel * 200 + (totalBonus?.wugSkillRatio ?? 0),
};

/**
 * Standalone skill definitions shared by more than one job (Phase 3 of the Skill
 * Catalog work). Formulas are pure — they read other skills' state from the
 * formula input's `skills` context instead of a `this.isSkillActive` call — so the
 * same definition can be imported by every job that has the skill.
 */

/**
 * A skill that drops its hits on the ground one at a time, so how many fall is not how
 * many a single target takes. rAthena places each fall on its own cell, independent of
 * where anybody is standing (`skill_timerskill`, and the meteor family in
 * `skill_unit_onplace_timer`), which is why the rotation row asks the player how many
 * landed instead of assuming the whole volley did. Card mkvqph0HW51cDiRaXxKS, reported by
 * pazzoLino.
 *
 * `spawned` is the ceiling — how many the client says fall, as a function of the level
 * when its table publishes a column. `landing` is the count the engine uses until the
 * player picks one, and defaults to `spawned`; a skill whose client table has a separate
 * "how many hit one target" column (Chuva de Meteoros' *Golpes*) passes that column, and
 * one the engine prices per fall passes 1. Either way the default reproduces the figure
 * the skill printed before it had a picker.
 *
 * Returns the two halves of one declaration, which have to agree on the count: `limits`
 * is spread into the skill and `landed` is read by its
 * `formula`/`totalHit`/`damageRepeat`.
 */
export function scatteredHits(spawned: StackCount, landing?: StackCount) {
  const limits: StackLimits = { minStack: 1, maxStack: spawned, defaultStack: landing, stackLabelKey: 'rot.hits' };

  return {
    limits,
    /** The hits that reached the target: the player's pick, or — for a formula called
     *  without a resolved count — the default, resolved by the one resolver. */
    landed: (input: AtkSkillFormulaInput) => input.stack || stackRange(limits, input.skillLevel).count,
  };
}

/**
 * Florescer and Pilares de Pedra plant a garden of `nível × 4` explosions — 4 at Nv1, 20
 * at Nv5 — and the client picks *one random cell* for each ("A cada 0,3 segundos, uma
 * célula aleatória será escolhida", skilldescript.lub ids 5222 and 5218). Only a target
 * that never leaves the garden takes all of them.
 *
 * Declared here because both the job file and the 2026 patch formulas need it, and the
 * size of the garden is one game fact.
 */
export const GARDEN_HITS = scatteredHits((skillLevel) => skillLevel * 4);

/**
 * Chuva de Meteoritos drops its meteoritos on random cells — rAthena's
 * `HN_METEOR_STORM_BUSTER` draws a fresh one for every fall in `skill_timerskill` — and
 * the client's "Meteoros" column says how many fall: 3 up to Nv3, then one more every
 * three levels, 6 at Nv10.
 *
 * rAthena is not the source of that count and must not be used to "correct" it: it
 * publishes no meteor count at all, scheduling `1 + Duration1/Duration2` falls instead,
 * which on master reads 3,3,4,4,5,5,5,6,6,6 — one level off the client at Nv3, Nv5, Nv6,
 * Nv8 and Nv9. bROWiki and divine-pride's LATAM section both read with the client, and
 * `scattered-hits.spec.ts` pins the column against the client's own description.
 *
 * Both of the Hiperaprendiz's entries, the landing and the explosion behind it, price ONE
 * meteorito: that is what the client's two ATQM columns publish and what every bundle's
 * reference row carries (`totalHit: 1`). So the default stays 1 and the picker is what
 * adds the rest. Declared here, like {@link GARDEN_HITS}, because the job file and the
 * patch table both need the same count.
 */
export const METEOR_BUSTER_HITS = scatteredHits((skillLevel) => 3 + Math.floor((skillLevel - 1) / 3), 1);

/**
 * "Chuva de Meteoros" — shared by HighWizard (so the Bruxo and, through inheritance, the
 * Arcano) and SuperNovice. 125% of ATQM per meteor, and the client's "Golpes" column is
 * how many land on one target: 1,1,2,2,3,3,4,4,5,5 = ceil(nível / 2). The cast and delay
 * numbers are the client's own row (skills.json id 83): 1,5 s fixed, 6,3 s variable, 1 s
 * pós-conjuração, recarga 2,5 s + 0,5 s per level — skill-delay.spec.ts holds them.
 *
 * One definition rather than two: until 13/09/2026 HighWizard carried an `isDevMode`
 * placeholder — hidden from the Bruxo's list, 125 flat with no hit count and the
 * [V2]-era 6,72 / 5 / 7 s timings — while the Superaprendiz copy was already this
 * (tracker simulador-chuva-de-meteoros-do-bruxo-e-um-placeholder-escondido).
 *
 * The one skill whose client table answers the picker's question itself: the meteors fall
 * "aleatoriamente numa área de 13x13 células", the *Meteoros* column is how many fall
 * (2 at Nv1 up to 7 at Nv10 = 2 + ⌊nível / 2⌋) and *Golpes* is how many of those reach one
 * target. So the ceiling is the first column and the default stays the second — the count
 * this skill has always used. The hits stay in `totalHit` rather than moving to
 * `damageRepeat`, which would re-apply the target's DEFM per meteor and change every
 * figure this skill prints.
 */
const METEOR_STORM_HITS = scatteredHits((lv) => 2 + Math.floor(lv / 2), (lv) => Math.ceil(lv / 2));

export const METEOR_STORM: AtkSkillModel = {
  name: 'Meteor Storm',
  label: 'Meteor Storm Lv10',
  value: 'Meteor Storm==10',
  levelList: atkSkillLevelList('Meteor Storm', 10),
  acd: 1,
  fct: 1.5,
  vct: 6.3,
  cd: (lv) => 2 + lv * 0.5,
  isMatk: true,
  ...METEOR_STORM_HITS.limits,
  totalHit: (input) => METEOR_STORM_HITS.landed(input),
  element: ElementType.Fire,
  formula: () => 125,
};

// --- The Bruxo column ---
//
// Shared by HighWizard (the Bruxo, and through inheritance the Arcano and the Magus) and
// SuperNovice: bROWiki's Superaprendizes tree lists the whole Bruxo column under
// "Expansão". Coluna de Pedra and Fúria da Terra are also Sábio skills — their client
// text carries a "Pré requisitos (Sábios)" line — so Scholar imports those two as well.
// Cast and delay numbers are the client's own rows (skills.json); skill-delay.spec.ts
// holds every class's copy to them. Tracker card
// simulador-superaprendiz-faltam-sete-habilidades-da-linha-dos-bruxos.

/**
 * "Trovão de Júpiter" — "causando 100% de dano mágico da propriedade Vento" per shock, and
 * the client's "Choques" column is 3 at Nv1 rising by one per level.
 */
export const JUPITEL_THUNDER: AtkSkillModel = {
  name: 'Jupitel Thunder',
  label: 'Jupitel Thunder Lv10',
  value: 'Jupitel Thunder==10',
  levelList: atkSkillLevelList('Jupitel Thunder', 10),
  acd: 0,
  fct: 0.5,
  vct: (lv) => 1.8 + lv * 0.2,
  cd: 0,
  isMatk: true,
  totalHit: ({ skillLevel }) => skillLevel + 2,
  element: ElementType.Wind,
  formula: () => 100,
};

/**
 * "Ira de Thor" — 500% at Nv1 rising by 100 per level (client table). Each trovão "atinge
 * 10 vezes um mesmo alvo", which the damage window shows as 20 readings.
 */
export const LORD_OF_VERMILION: AtkSkillModel = {
  name: 'Lord of Vermilion',
  label: 'Lord of Vermilion Lv10',
  value: 'Lord of Vermilion==10',
  levelList: atkSkillLevelList('Lord of Vermilion', 10),
  acd: 1,
  fct: 1.5,
  vct: (lv) => 6.5 - lv * 0.2,
  cd: 5,
  isMatk: true,
  hit: 20,
  element: ElementType.Wind,
  formula: ({ skillLevel }) => 400 + skillLevel * 100,
};

/**
 * "Nevasca" — 120% "por neve" at Nv1 rising by 50 per level (client table). The client
 * does not say how many fall; bROWiki's Nevasca page carries the cap — "O ATQM causado é
 * contado por cada bola de neve, num máximo de 10".
 */
export const STORM_GUST: AtkSkillModel = {
  name: 'Storm Gust',
  label: 'Storm Gust Lv10',
  value: 'Storm Gust==10',
  levelList: atkSkillLevelList('Storm Gust', 10),
  acd: 1,
  fct: 1.5,
  vct: (lv) => 4.3 + lv * 0.2,
  cd: 6,
  isMatk: true,
  totalHit: 10,
  element: ElementType.Water,
  formula: ({ skillLevel }) => 70 + skillLevel * 50,
};

/**
 * "Coluna de Pedra" — "200% de dano mágico de propriedade Terra para cada espeto", one
 * espeto per level.
 */
export const EARTH_SPIKE: AtkSkillModel = {
  name: 'Earth Spike',
  label: 'Earth Spike Lv5',
  value: 'Earth Spike==5',
  levelList: atkSkillLevelList('Earth Spike', 5),
  acd: 1.4,
  fct: (lv) => 0.2 + lv * 0.2,
  vct: (lv) => 0.2 + lv * 0.6,
  cd: 0,
  isMatk: true,
  totalHit: ({ skillLevel }) => skillLevel,
  element: ElementType.Earth,
  formula: () => 200,
};

/**
 * "Fúria da Terra" — the client's ATQM column is the total, 125% × nível. bROWiki's page
 * splits it: "Cada espeto causa 125% do ATQM", one espeto per level.
 */
export const HEAVENS_DRIVE: AtkSkillModel = {
  name: "Heaven's Drive",
  label: "Heaven's Drive Lv5",
  value: "Heaven's Drive==5",
  levelList: atkSkillLevelList("Heaven's Drive", 5),
  acd: 0.5,
  fct: 0.8,
  vct: (lv) => 0.9 + lv * 0.2,
  cd: 1,
  isMatk: true,
  totalHit: ({ skillLevel }) => skillLevel,
  element: ElementType.Earth,
  formula: () => 125,
};

/**
 * "Congelar" — the client prints the freeze chance and duration but no ratio; bROWiki's
 * Congelar page gives 110% at Nv1 rising by 10 per level, to 200% at Nv10.
 */
export const FROST_NOVA: AtkSkillModel = {
  name: 'Frost Nova',
  label: 'Frost Nova Lv10',
  value: 'Frost Nova==10',
  levelList: atkSkillLevelList('Frost Nova', 10),
  acd: 0.2,
  // The client shortens the cast every second level: 0,16 s fixed at Nv1-2, 0,144 at Nv3-4…
  fct: (lv) => 0.16 - Math.floor((lv - 1) / 2) * 0.016,
  vct: (lv) => 0.64 - Math.floor((lv - 1) / 2) * 0.064,
  cd: 0,
  isMatk: true,
  element: ElementType.Water,
  formula: ({ skillLevel }) => 100 + skillLevel * 10,
};

/** Canonical foreign-spell definitions used by item auto-casts. */
export const FIRE_BOLT: AtkSkillModel = {
  name: 'Fire Bolt', label: 'Fire Bolt Lv10', value: 'Fire Bolt==10', levelList: atkSkillLevelList('Fire Bolt', 10),
  acd: 0, fct: 0, vct: 0, cd: 0,
  isMatk: true, element: ElementType.Fire, totalHit: ({ skillLevel }) => skillLevel, formula: () => 100,
};
export const COLD_BOLT: AtkSkillModel = {
  name: 'Cold Bolt', label: 'Cold Bolt Lv10', value: 'Cold Bolt==10', levelList: atkSkillLevelList('Cold Bolt', 10),
  acd: 0, fct: 0, vct: 0, cd: 0,
  isMatk: true, element: ElementType.Water, totalHit: ({ skillLevel }) => skillLevel, formula: () => 100,
};
export const LIGHTNING_BOLT: AtkSkillModel = {
  name: 'Lightening Bolt', label: 'Lightening Bolt Lv10', value: 'Lightening Bolt==10', levelList: atkSkillLevelList('Lightening Bolt', 10),
  acd: 0, fct: 0, vct: 0, cd: 0,
  isMatk: true, element: ElementType.Wind, totalHit: ({ skillLevel }) => skillLevel, formula: () => 100,
};
export const CRIMSON_ROCK: AtkSkillModel = {
  name: 'Crimson Rock', label: 'Crimson Rock Lv5', value: 'Crimson Rock==5', levelList: atkSkillLevelList('Crimson Rock', 5),
  acd: 0, fct: 0, vct: 0, cd: 0,
  isMatk: true, element: ElementType.Fire,
  formula: ({ model, skillLevel }) => (700 + skillLevel * 600) * (model.level / 100),
};
export const FROST_MISTY: AtkSkillModel = {
  name: 'Frost Misty', label: 'Frost Misty Lv5', value: 'Frost Misty==5', levelList: atkSkillLevelList('Frost Misty', 5),
  acd: 0, fct: 0, vct: 0, cd: 0,
  isMatk: true, element: ElementType.Water, totalHit: 5,
  formula: ({ model, skillLevel }) => (200 + skillLevel * 100) * (model.level / 100),
};
// Auto-cast by Major Auto Spell Shadow Armor (24728). `hit`, like the Warlock's own two
// entries: the cast deals the column once, printed as four packets.
export const JACK_FROST: AtkSkillModel = {
  name: 'Jack Frost', label: 'Jack Frost Lv5', value: 'Jack Frost==5', levelList: atkSkillLevelList('Jack Frost', 5),
  acd: 0, fct: 0, vct: 0, cd: 0,
  isMatk: true, element: ElementType.Water, hit: 4,
  formula: ({ model, skillLevel }) => (1000 + skillLevel * 300) * (model.level / 100),
};
export const HELL_INFERNO: AtkSkillModel = {
  name: 'Hell Inferno', label: 'Hell Inferno Lv5', value: 'Hell Inferno==5', levelList: atkSkillLevelList('Hell Inferno', 5),
  acd: 0, fct: 0, vct: 0, cd: 0,
  isMatk: true, element: ElementType.Fire,
  formula: ({ model, skillLevel }) => skillLevel * 400 * (model.level / 100),
};
export const KILLING_CLOUD: AtkSkillModel = {
  name: 'Killing Cloud', label: 'Killing Cloud Lv5', value: 'Killing Cloud==5', levelList: atkSkillLevelList('Killing Cloud', 5),
  acd: 0, fct: 0, vct: 0, cd: 0,
  isMatk: true, element: ElementType.Poison, totalHit: 4,
  formula: ({ model, skillLevel, status }) => (skillLevel * 40 + status.totalInt * 3) * (model.level / 100),
};
export const SOUL_EXPANSION: AtkSkillModel = {
  name: 'Soul Expansion', label: 'Soul Expansion Lv5', value: 'Soul Expansion==5', levelList: atkSkillLevelList('Soul Expansion', 5),
  acd: 0, fct: 0, vct: 0, cd: 0, isMatk: true, element: ElementType.Ghost, hit: 2,
  formula: ({ model, skillLevel, status }) => (1000 + skillLevel * 200 + status.totalInt) * (model.level / 100),
};
export const EARTH_STRAIN: AtkSkillModel = {
  name: 'Earth Strain', label: 'Earth Strain Lv5', value: 'Earth Strain==5', levelList: atkSkillLevelList('Earth Strain', 5),
  acd: 0, fct: 0, vct: 0, cd: 0, isMatk: true, element: ElementType.Earth, hit: 10,
  formula: ({ model, skillLevel }) => (1000 + skillLevel * 600) * (model.level / 100),
};
export const CHAIN_LIGHTNING: AtkSkillModel = {
  name: 'Chain Lightning', label: 'Chain Lightning Lv5', value: 'Chain Lightning==5', levelList: atkSkillLevelList('Chain Lightning', 5),
  acd: 0, fct: 0, vct: 0, cd: 0, isMatk: true, element: ElementType.Wind,
  formula: ({ model, skillLevel }) => (500 + skillLevel * 100) * (model.level / 100) + 900,
};
export const DIAMOND_DUST: AtkSkillModel = {
  name: 'Diamond Dust', label: 'Diamond Dust Lv5', value: 'Diamond Dust==5', levelList: atkSkillLevelList('Diamond Dust', 5),
  acd: 0, fct: 0, vct: 0, cd: 0, isMatk: true, element: ElementType.Water, hit: 2,
  formula: ({ model, skillLevel, status }) => ((skillLevel + 2) * status.totalInt) * (model.level / 100),
};
export const JUDEX: AtkSkillModel = {
  name: 'Judex', label: 'Judex Lv10', value: 'Judex==10', levelList: atkSkillLevelList('Judex', 10),
  acd: 0, fct: 0, vct: 0, cd: 0, isMatk: true, element: ElementType.Holy, hit: 3,
  formula: ({ model, skillLevel }) => (300 + skillLevel * 70) * (model.level / 100),
};

/**
 * "Coluna de Fogo" — the client lists the "Chamas" (3 at Nv1, one more per level) but no
 * ratio. bROWiki's Coluna de Fogo page: "ATQM (por chama) = 50 + (ATQM ÷ 5)", and each
 * chama "ignora a DEFM". So 20% of MATK per chama, both halves of MDEF skipped, and the
 * flat 50 added to every chama.
 */
export const FIRE_PILLAR: AtkSkillModel = {
  name: 'Fire Pillar',
  label: 'Fire Pillar Lv10',
  value: 'Fire Pillar==10',
  levelList: atkSkillLevelList('Fire Pillar', 10),
  acd: 1,
  fct: (lv) => 0.528 - lv * 0.048,
  vct: (lv) => 2.112 - lv * 0.192,
  cd: 0,
  isMatk: true,
  isIgnoreDef: true,
  isIgnoreSDef: true,
  totalHit: ({ skillLevel }) => skillLevel + 2,
  element: ElementType.Fire,
  formula: () => 20,
  finalDmgFormula: ({ damage }) => damage + 50,
};

/**
 * "Supernova" — 120% at Nv1 rising by 20 per level (client table). In game it only fires
 * with Chama Reveladora active; it is offered here as if it were.
 */
export const SIGHTRASHER: AtkSkillModel = {
  name: 'Sightrasher',
  label: 'Sightrasher Lv10',
  value: 'Sightrasher==10',
  levelList: atkSkillLevelList('Sightrasher', 10),
  acd: 2,
  fct: 0.08,
  vct: 0.32,
  cd: 0,
  isMatk: true,
  element: ElementType.Fire,
  formula: ({ skillLevel }) => 100 + skillLevel * 20,
};

/**
 * "Esfera d'Água" — 130% per esfera at Nv1 rising by 30 per level (client table). How many
 * esferas fly depends on the water around the caster; bROWiki's page gives the full count
 * per level — 1 on 1x1 at Nv1, 9 on 3x3 at Nv2-3, 25 on 5x5 at Nv4-5 — and that full
 * count is what is offered here, as if the caster stood on enough water.
 */
export const WATER_BALL: AtkSkillModel = {
  name: 'Water Ball',
  label: 'Water Ball Lv5',
  value: 'Water Ball==5',
  levelList: atkSkillLevelList('Water Ball', 5),
  acd: 0,
  fct: (lv) => lv * 0.16,
  vct: (lv) => lv * 0.64,
  cd: 0,
  isMatk: true,
  totalHit: ({ skillLevel }) => [1, 9, 9, 25, 25][skillLevel - 1],
  element: ElementType.Water,
  formula: ({ skillLevel }) => 100 + skillLevel * 30,
};

/** Arrow Storm — shared by Ranger and ShadowChaser (the latter via Reproduce). */
export const ARROW_STORM: AtkSkillModel = {
  name: 'Arrow Storm',
  label: 'Arrow Storm Lv10',
  value: 'Arrow Storm==10',
  acd: 0,
  fct: 0.3,
  vct: 2,
  cd: 3.2,
  hit: 3,
  formula: ({ model, skillLevel, skills }) => {
    const fearBreezeBonus = skills.isActive('Fear Breeze') ? 70 : 0;
    return (200 + (180 + fearBreezeBonus) * skillLevel) * (model.level / 100);
  },
};

// --- Menestrel / Cigana (and, by inheritance, Maestro and Musa) ---

/**
 * Flecha Melódica (BA_MUSICALSTRIKE, id 316) and Estilingue (DC_THROWARROW, id 324) are
 * the same skill with two names — the Bardo plays it on an instrument, the Odalisca on a
 * whip — and the client prints the same table for both: 150% at Nv1, +40% per level.
 * One definition so the pair cannot drift apart.
 */
export const melodicStrike = (name: 'Melody Strike' | 'Throw Arrow'): AtkSkillModel => ({
  name,
  label: `${name} Lv5`,
  value: `${name}==5`,
  levelList: atkSkillLevelList(name, 5),
  acd: 0.3,
  fct: 0,
  vct: 0.5,
  cd: 0,
  formula: ({ skillLevel }) => 110 + skillLevel * 40,
});

// --- Maestro / Wanderer (Minstrel + Wanderer share these identically) ---

export const ARROW_VULCAN: AtkSkillModel = {
  name: 'Arrow Vulcan',
  label: 'Arrow Vulcan Lv10',
  value: 'Arrow Vulcan==10',
  acd: 0.5,
  fct: 0.5,
  vct: 1.5,
  cd: 1.5,
  hit: 9,
  formula: ({ skillLevel, model }) => (500 + skillLevel * 100) * (model.level / 100),
};

export const METALIC_SOUND: AtkSkillModel = {
  name: 'Metalic Sound',
  label: 'Metalic Sound Lv10',
  value: 'Metalic Sound==10',
  acd: 0.5,
  fct: 0,
  vct: 4,
  cd: 2.5,
  hit: 2,
  isMatk: true,
  element: ElementType.Neutral,
  formula: ({ skillLevel, model, skills }) => {
    const lessonLv = skills.learnedLevel('Lesson');
    return (skillLevel * 120 + lessonLv * 60) * (model.level / 100);
  },
  finalDmgFormula: (input) => input.damage * 2,
};

/** The two 4th-class arrow-magic skills below (5357 and 5356) share this pair: the
 * element comes from the equipped arrow, and the skill needs a whip or an instrument
 * plus one arrow to consume. */
const ammoElement: AtkSkillModel['getElement'] = (_skillValue, input) => input?.ammoElement || ElementType.Neutral;
const requireInstrumentAndArrow: AtkSkillModel['verifyItemFn'] = ({ weapon, model }) => {
  if (!weapon.isType('instrument', 'whip')) return 'instrument, whip';
  return model.ammo ? '' : 'Flecha';
};

/** Arranjo Musical (TR_SOUNDBLEND, 5357). The LATAM client supplies the
 * level table and says base level and SPL scale the damage. The second-version
 * class reference used by the other Troubadour/Trouvere formulas gives
 * (120 × skill level + 2.5 × SPL) × base level / 100:
 * https://sigmathefallen.blogspot.com/2024/06/troubadour-trouvere-2nd-version.html
 * The element is read from the equipped arrow at damage time. */
export const SOUND_BLEND: AtkSkillModel = {
  name: 'Sound Blend',
  label: 'Sound Blend Lv5',
  value: 'Sound Blend==5',
  acd: 0.15,
  fct: 0,
  vct: 1,
  cd: 0,
  isMatk: true,
  getElement: ammoElement,
  verifyItemFn: requireInstrumentAndArrow,
  formula: ({ model, skillLevel, status }) => (skillLevel * 120 + status.totalSpl * 2.5) * (model.level / 100),
};

/** Fúria Estridente (TR_METALIC_FURY, 5356).
 *
 * 900% per level is the client table, and the LATAM skill-rebalance notice of
 * 29/10/2026 states the pre-patch skill as "4500% 4950%" at Nv5, i.e. the same 900%
 * per level with a ×1,1 against a target under [Desarranjo Musical]:
 * https://ro.gnjoyamericas.com/pt/news/notice/446
 * The SPL term is the wiki's formula, "{Dano + [(FEI ÷ 2) × (Nv. de Presença de
 * Palco)]} × (Nv. base ÷ 100)": https://browiki.org/wiki/F%C3%BAria_Estridente
 *
 * The wiki also tables a further ×1,1 per extra marked target around the main one (up
 * to 5, 1.350% at Nv1). That is deliberately not modelled here: a stack picker on this
 * entry would be inherited by the 21/12/2022 version, whose own ratio ignores it. The
 * 02/06/2022 version already offers it, in `rebalance-2026.ts`.
 *
 * Sinfonia Mística does not boost it — the client lists only Arranjo Musical, Disparo
 * Rítmico and Atirar Rosas, so 5356 is absent from `MysticSymphonyFn`'s bonus. */
export const METALLIC_FURY: AtkSkillModel = {
  name: 'Metallic Fury',
  // Bare name, not "Metallic Fury Lv5": `resolveRebalancedSkill` rebuilds the level list
  // as `${label} Nv${n}`, so a label carrying a level renders "Fúria Estridente Lv5 Nv1"
  // in the rebalance versions' picker.
  label: 'Metallic Fury',
  value: 'Metallic Fury==5',
  levelList: atkSkillLevelList('Metallic Fury', 5),
  // Timings from the client feed row for 5356.
  acd: 0.3,
  fct: 0,
  vct: 0,
  cd: 0.3,
  isMatk: true,
  getElement: ammoElement,
  verifyItemFn: requireInstrumentAndArrow,
  formula: ({ model, skillLevel, status, skills }) => {
    const marked = skills.isActive('_Debuf_Sonic_Brand') ? 1.1 : 1;
    const stageManner = status.totalSpl * 0.5 * skills.learnedLevel('Stage Manner');
    return (skillLevel * 900 * marked + stageManner) * (model.level / 100);
  },
};

export const SEVERE_RAINSTORM: AtkSkillModel = {
  name: 'Severe Rainstorm',
  label: 'Severe Rainstorm',
  value: 'Severe Rainstorm==5',
  values: [
    '[Improved] Severe Rainstorm==1',
    '[Improved] Severe Rainstorm==2',
    '[Improved] Severe Rainstorm==3',
    '[Improved] Severe Rainstorm==4',
    '[Improved] Severe Rainstorm==5',
  ],
  acd: 1,
  fct: 0.5,
  vct: (lv) => 1 + lv * 0.5,
  cd: (lv) => 4.5 + lv * 0.5,
  totalHit: 12,
  levelList: [
    { label: 'Temporal de Flechas Nv1', value: 'Severe Rainstorm==1' },
    { label: 'Temporal de Flechas Nv2', value: 'Severe Rainstorm==2' },
    { label: 'Temporal de Flechas Nv3', value: 'Severe Rainstorm==3' },
    { label: 'Temporal de Flechas Nv4', value: 'Severe Rainstorm==4' },
    { label: 'Temporal de Flechas Nv5', value: 'Severe Rainstorm==5' },
  ],
  formula: ({ weapon, status, skillLevel, model }) => {
    const { totalDex, totalAgi } = status;
    const weaType = weapon.data.typeName;
    const weaMultiMap: Partial<Record<WeaponTypeName, number>> = { bow: 100, instrument: 120, whip: 120 };
    const extra = weaMultiMap[weaType] || 0;
    return ((totalDex + totalAgi) / 2 + skillLevel * extra) * (model.level / 100);
  },
};

export const REVERBERATION: AtkSkillModel = {
  name: 'Reverberation',
  label: 'Reverberation Lv5',
  value: 'Reverberation==5',
  values: ['[Improved] Reverberation==5'],
  acd: 0.5,
  fct: 0.5,
  vct: 1,
  cd: 0.15,
  isMatk: true,
  formula: ({ skillLevel, model }) => (700 + skillLevel * 300) * (model.level / 100),
};

// --- Oboro / Kagerou (Ninja) — what the pair shares, and the toggles those skills read ---

export const CROSS_WOUND: ActiveSkillModel = {
  label: 'Ferida Cruzada',
  name: 'Cross Wound',
  icon: 3004, // KO_JYUMONJIKIRI (Impacto Cruzado) — the skill that inflicts the debuff
  isDebuff: true,
  inputType: 'selectButton',
  dropdown: [
    { label: 'Sim', value: 1, isUse: true },
    { label: 'Não', value: 0, isUse: false },
  ],
};

export const CROSS_SLASH: AtkSkillModel = {
  label: 'Cross Slash Lv10',
  name: 'Cross Slash',
  value: 'Cross Slash==10',
  acd: 0,
  fct: 0,
  vct: 0,
  cd: 3.1,
  hit: 2,
  formula: ({ model, skillLevel, skills }) => {
    const bonus = skills.isActive('Cross Wound') ? model.level * skillLevel : 0;
    return skillLevel * 200 * (model.level / 100) + bonus;
  },
};

/** The property of the Amuleto that is out, or `undefined` when the player has none up. */
const charmElement = (skills?: SkillStateCtx) => SPIRIT_CHARMS.find(([charm]) => skills?.isActive(charm))?.[1];

/**
 * Arremessar Amuleto (KO_KAIHOU, 3019) — the Kagerou/Oboro charm dump. Shared because the
 * client gives it to both of them, and their 4th classes inherit it from there.
 *
 * This is one of the few attacks whose client description publishes no ATQM column: all it
 * says is "Atira todos os amuletos invocados para causar dano mágico no alvo de acordo com a
 * propriedade dos amuletos". The two sources that do publish a ratio agree with each other,
 * so the formula below is theirs rather than a reading of that prose:
 *
 *   bROWiki   ATQM = {ATQM × [(200 × número de amuletos) × (Nv. de base ÷ 100)]}%
 *             https://browiki.org/wiki/Arremessar_Amuleto
 *   rAthena   `skillratio += -100 + 200 * sd->spiritcharm;` followed by `RE_LVL_DMOD(100)`
 *             (src/map/skills/ninja/releaseninjaspell.cpp)
 *
 * "Número de amuletos" is MAX_SPIRIT_CHARM here, because the full stack is what the charm
 * toggles already describe (element-charm.ts carries both the count and the reasoning). A
 * partial stack is not a state this calculator can express — the toggles are Sim/Não, not
 * a count — so the skill requires a charm and then throws the stack that charm stands for.
 *
 * The element follows the charm, as both the client ("de acordo com a propriedade dos
 * amuletos") and rAthena's `modifyElement` have it.
 */
export const RELEASE_NINJA_SPELL: AtkSkillModel = {
  name: 'Release Ninja Spell',
  label: 'Release Ninja Spell Lv1',
  value: 'Release Ninja Spell==1',
  // The client ships no Conjuração/Espera row for it (`delay: null` in the feed), and
  // rAthena's skill_db gives it no cast, no pós-conjuração and no recarga either.
  acd: 0,
  fct: 0,
  vct: 0,
  cd: 0,
  isMatk: true,
  verifyItemFn: ({ skills }) => (charmElement(skills) ? '' : 'Amuleto invocado'),
  getElement: (_skillValue, info) => charmElement(info?.skills) ?? ElementType.Neutral,
  formula: ({ model }) => 200 * MAX_SPIRIT_CHARM * (model.level / 100),
};

/**
 * Garra de Tigre: https://browiki.org/wiki/Garra_de_Tigre
 *
 * The skill lands as two parts, and only the first one is damage the target reduces:
 *
 *   ATQ           = (fator / 4,0) x (nível de base / 100)   — / 1,5 when it follows Ruína
 *   dano especial = nível x 240 (x 500 as a combo) + nível de base do alvo x 40
 *
 * The fator is the client's own HP/SP table — 12% of max HP + 6% of max SP at Nv1, up to
 * 30% + 15% at Nv10 — which is why the skill grows with max HP and max SP and not only
 * with ATQ, and why every level has to be selectable rather than Nv10 alone.
 *
 * The dano especial cannot be reduced and no item raises it, so it is added by
 * `finalDmgFormula`, after every reduction the chain applies.
 *
 * Nothing here is special to this skill: plenty of attack skills are still pinned to a
 * single level, and each one hides a cast copied from that level the same way this one did.
 * They come off that list one at a time, because offering a level means publishing a damage
 * number for it, and each needs its own reference table checked first.
 */
const tigerCannonFactor = ({ maxHp, maxSp, skillLevel }: AtkSkillFormulaInput): number =>
  maxHp * (10 + skillLevel * 2) * 0.01 + maxSp * (5 + skillLevel) * 0.01;

const tigerCannon = (args: {
  /** The `==level` value base: either 'Tiger Cannon' or 'Tiger Cannon Combo'. */
  skillValue: string;
  /** Picker label, which keeps saying "(Combo)" after the level for the combo branch. */
  label: string;
  /** The reducible part's ATQ, already divided by the branch's 4,0 or 1,5. */
  ratio: (factor: number, baseLevel: number) => number;
  /** Dano especial per skill level: 240 on its own, 500 after Ruína. */
  specialPerLevel: number;
}): AtkSkillModel => ({
  name: 'Tiger Cannon',
  label: args.label,
  value: `${args.skillValue}==10`,
  levelList: atkSkillLevelList(args.skillValue, 10),
  fct: 0,
  // The client's own row for id 2330 (skill-delay.json), copied rather than fitted. It used
  // to be the scalar 2, the Nv10 cast, which was right only because Nv10 was the only level
  // the skill could be selected at — the same shape many other skills here still carry.
  vct: (skillLevel) => [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2][skillLevel - 1],
  acd: 1,
  cd: 3,
  isMelee: true,
  formula: (input: AtkSkillFormulaInput): number => {
    if (input.monster.isElement(ElementType.Ghost)) return 0;

    return floor(args.ratio(tigerCannonFactor(input), input.model.level));
  },
  finalDmgFormula: ({ damage, skillLevel, monster, model }): number => {
    if (!model.propertyAtk || model.propertyAtk === ElementType.Neutral) {
      if (monster.isElement(ElementType.Ghost)) return 0;
    }

    return damage + skillLevel * args.specialPerLevel + monster.level * 40;
  },
  finalDmgCalc: ({ skillLevel, monster, damageBefore, damageAfter }) => ({
    rows: damageAfter === 0 ? [
      { label: 'Propriedade Fantasma', display: 'Dano bloqueado' },
      { label: 'Resultado', display: formatCalcNumber(damageAfter), emphasis: true },
    ] : [
      { label: 'Dano anterior', display: formatCalcNumber(damageBefore) },
      { label: `Nível ${skillLevel} × ${args.specialPerLevel}`, display: formatCalcNumber(skillLevel * args.specialPerLevel) },
      { label: `Nível do alvo ${monster.level} × 40`, display: formatCalcNumber(monster.level * 40) },
      { label: 'Resultado', display: formatCalcNumber(damageAfter), emphasis: true },
    ],
  }),
});

export const TIGER_CANNON: AtkSkillModel = tigerCannon({
  skillValue: 'Tiger Cannon',
  label: 'Tiger Cannon Lv10',
  ratio: (factor, baseLevel) => (factor / 4) * (baseLevel / 100),
  specialPerLevel: 240,
});

export const TIGER_CANNON_COMBO: AtkSkillModel = tigerCannon({
  skillValue: 'Tiger Cannon Combo',
  label: 'Tiger Cannon Lv10 (Combo)',
  // Algebraically the wiki's "÷ 1,5", written the long way because floating point makes
  // the two land one damage apart on about 0,1% of builds and this is the form the
  // published Nv10 figures were read at. The spec checks the result against "÷ 1,5", so
  // a rewrite that drifted at the levels it pins would fail rather than pass quietly.
  ratio: (factor, baseLevel) => ((factor / 2) * (baseLevel / 100) * 4) / 3,
  specialPerLevel: 500,
});
