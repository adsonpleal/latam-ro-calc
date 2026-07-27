import { ElementMapper, ElementType, ItemTypeEnum, SizePenaltyMapper } from 'src/app/constants';
import { SKILL_NAME } from 'src/app/constants/skill-name';
import { elementPtBr, racePtBr } from 'src/app/constants/monster-i18n';
import { Monster, Weapon } from 'src/app/domain';
import { AtkSkillFormulaInput, AtkSkillModel, CharacterBase } from 'src/app/jobs/_character-base.abstract';
import { BasicDamageSummaryModel, DamageFormulaCalc, DamageFormulaCalcRow, DamageFormulaGraph, DamageFormulaNode, DamageFormulaStep, DamageFormulaTrace, DamageSummaryModel, MiscModel, SkillDamageSummaryModel, SkillType } from 'src/app/models/damage-summary.model';
import { EquipmentSummaryModel } from 'src/app/models/equipment-summary.model';
import { InfoForClass } from 'src/app/models/info-for-class.model';
import { MainModel } from 'src/app/models/main.model';
import { StatusSummary } from 'src/app/models/status-summary.model';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { calcDmgDps, calcSkillAspd, floor, formatCalcNumber, isSkillCanEDP, round } from 'src/app/utils';
import { DEFAULT_PVP_CONTEXT, DefenderReductionStep, PvpContext, defenderReductionSteps, pvpChannelOf, woeGlobalMultiplier } from './pvp';

interface DamageResultModel {
  minDamage: number;
  maxDamage: number;
  rawMinNoCri: number;
  rawMaxNoCri: number;
  avgNoCriDamage: number;
  avgCriDamage: number;
  propertyAtk: ElementType;
  propertyMultiplier: number;
  sizePenalty: number;
  canCri: boolean;
  criDmgToMonster: number;
  skillFormulaTrace?: DamageFormulaTrace;
  skillFormulaTraceNoCri?: DamageFormulaTrace;
  skillFormulaGraph?: { min: DamageFormulaGraph; max: DamageFormulaGraph; };
  skillFormulaGraphNoCri?: { min: DamageFormulaGraph; max: DamageFormulaGraph; };
}

/** Shared DamageFormulaCalc notes — each is used by more than one derivation. */
const MASTERY_NOTE = 'Somado depois de todos os multiplicadores — maestria não é escalada por % de dano.';
const WEAPON_VARIANCE_NOTE = 'A variação da arma é o que separa o dano mínimo do máximo.';

export class DamageCalculator {
  private readonly EDP_WEAPON_MULTIPLIER = 0.25;
  private readonly MAGNUM_BREAK_WEAPON_MULTIPLIER = 0.2;
  private readonly EDP_EQUIP_MULTIPLIER = 4;
  private readonly _BASE_CRI_MULTIPLIER = 1.4;

  private skillName: SKILL_NAME = '' as any;
  private equipStatus: Record<ItemTypeEnum, EquipmentSummaryModel>;
  totalBonus: EquipmentSummaryModel;
  private _totalEquipStatus: EquipmentSummaryModel;
  private model: Partial<MainModel>;
  private pvp: PvpContext = { ...DEFAULT_PVP_CONTEXT };
  /** The resolved element of the basic attack, for the PVP subele lookup. */
  private basicPropertyAtk: ElementType = ElementType.Neutral;

  private equipAtkSkillBonus: Record<string, any> = {};
  private buffMasteryAtkBonus: Record<string, any> = {};
  private masteryAtkSkillBonus: Record<string, any> = {};

  private finalMultipliers = [] as number[];

  private _class: CharacterBase;
  private monster: Monster;

  private weaponData: Weapon;
  private leftWeaponData: Weapon;
  private aspdPotion: number;
  private ammoPropertyAtk: ElementType;

  private zeroSkillDmg: SkillDamageSummaryModel = {
    skillDamageLabel: '',
    skillNoStackDamageLabel: '',
    baseSkillDamage: 0,
    dmgType: SkillType.RANGE,
    isAutoSpell: false,
    skillSizePenalty: 0,
    skillCanCri: false,
    skillPropertyAtk: ElementType.Neutral,
    skillPropertyMultiplier: 0,
    skillTotalPene: 0,
    skillTotalPeneLabel: '',
    skillTotalPeneRes: 0,
    skillTotalPeneResLabel: '',
    skillMinDamage: 1,
    skillMaxDamage: 1,
    skillMaxDamageNoCri: 1,
    skillMinDamageNoCri: 1,
    skillTotalHit: 0,
    skillHit: 0,
    skillAccuracy: 0,
    skillDps: 0,
    skillHitKill: 0,
    skillCriRateToMonster: 0,
    skillCriDmgToMonster: 0,
    skillCriDmgPercentage: 1,
    skillPart2Label: '',
    skillMinDamage2: 0,
    skillMaxDamage2: 0,
    skillBonusFromEquipment: 0,
    isUsedCurrentHP: false,
    isUsedCurrentSP: false,
    currentHp: 0,
    currentSp: 0,

    maxStack: 0,
    noStackMinDamage: 0,
    noStackMaxDamage: 0,
    noStackMinCriDamage: 0,
    noStackMaxCriDamage: 0,

    skillDpsInputMin: 0,
    skillDpsInputMax: 0,
    skillDpsInputCriDmg: 0,
    skillDpsInputHitsPerSec: 0,
  };

  setArgs(params: {
    equipStatus: Record<ItemTypeEnum, EquipmentSummaryModel>;
    totalEquipStatus: EquipmentSummaryModel;
    model: Partial<MainModel>;
    equipAtkSkillBonus: Record<string, any>;
    buffMasteryAtkBonus: Record<string, any>;
    masteryAtkSkillBonus: Record<string, any>;
    finalMultipliers: number[];
    _class: CharacterBase;
    monster: Monster;
    weaponData: Weapon;
    leftWeaponData: Weapon;
    aspdPotion: number;
    pvp?: PvpContext;
  }) {
    const {
      equipStatus,
      totalEquipStatus,
      model,
      equipAtkSkillBonus,
      buffMasteryAtkBonus,
      masteryAtkSkillBonus,
      finalMultipliers,
      _class,
      monster,
      weaponData,
      leftWeaponData,
      aspdPotion,
      pvp,
    } = params;
    this.pvp = pvp ?? { ...DEFAULT_PVP_CONTEXT };
    this.equipStatus = equipStatus;
    this._totalEquipStatus = totalEquipStatus;
    this.totalBonus = { ...totalEquipStatus };
    this.model = model;
    this.equipAtkSkillBonus = equipAtkSkillBonus;
    this.buffMasteryAtkBonus = buffMasteryAtkBonus;
    this.masteryAtkSkillBonus = masteryAtkSkillBonus;
    this.finalMultipliers = finalMultipliers;
    this._class = _class;
    this.monster = monster;
    this.weaponData = weaponData;
    this.leftWeaponData = leftWeaponData;
    this.aspdPotion = aspdPotion;

    return this;
  }

  setExtraBonus(extraBonus: Record<keyof EquipmentSummaryModel, number>[]) {
    const totalBonus = { ...this._totalEquipStatus };
    for (const bonus of extraBonus) {
      for (const [attr, val] of Object.entries(bonus)) {
        if (totalBonus[attr]) {
          totalBonus[attr] += val;
        } else {
          totalBonus[attr] = val;
        }
      }
    }

    this.totalBonus = totalBonus;

    return this;
  }

  setAmmoPropertyAtk(p: ElementType) {
    this.ammoPropertyAtk = p;

    return this;
  }

  get status(): StatusSummary {
    const { str, jobStr, int, jobInt, luk, jobLuk, vit, jobVit, dex, jobDex, agi, jobAgi } = this.model;
    const { pow, sta, wis, spl, con, crt, jobPow, jobSta, jobWis, jobSpl, jobCon, jobCrt } = this.model;

    return {
      baseStr: str,
      equipStr: this.totalBonus.str ?? 0,
      totalStr: str + (jobStr ?? 0) + (this.totalBonus.str ?? 0),

      baseInt: int,
      equipInt: this.totalBonus.int ?? 0,
      totalInt: int + (jobInt ?? 0) + (this.totalBonus.int ?? 0),

      baseLuk: luk,
      equipLuk: this.totalBonus.luk ?? 0,
      totalLuk: luk + (jobLuk ?? 0) + (this.totalBonus.luk ?? 0),

      baseVit: vit,
      equipVit: this.totalBonus.vit ?? 0,
      totalVit: vit + (jobVit ?? 0) + (this.totalBonus.vit ?? 0),

      baseDex: dex,
      equipDex: this.totalBonus.dex ?? 0,
      totalDex: dex + (jobDex ?? 0) + (this.totalBonus.dex ?? 0),

      baseAgi: agi,
      equipAgi: this.totalBonus.agi ?? 0,
      totalAgi: agi + (jobAgi ?? 0) + (this.totalBonus.agi ?? 0),

      basePow: pow,
      equipPow: this.totalBonus.pow,
      totalPow: pow + (jobPow ?? 0) + (this.totalBonus.pow ?? 0),

      baseSta: sta,
      equipSta: this.totalBonus.sta,
      totalSta: sta + (jobSta ?? 0) + (this.totalBonus.sta ?? 0),

      baseWis: wis,
      equipWis: this.totalBonus.wis,
      totalWis: wis + (jobWis ?? 0) + (this.totalBonus.wis ?? 0),

      baseSpl: spl,
      equipSpl: this.totalBonus.spl,
      totalSpl: spl + (jobSpl ?? 0) + (this.totalBonus.spl ?? 0),

      baseCon: con,
      equipCon: this.totalBonus.con,
      totalCon: con + (jobCon ?? 0) + (this.totalBonus.con ?? 0),

      baseCrt: crt,
      equipCrt: this.totalBonus.crt,
      totalCrt: crt + (jobCrt ?? 0) + (this.totalBonus.crt ?? 0),
    };
  }

  get traitBonus(): { pAtk: number; sMatk: number; cRate: number; } {
    const { totalPow, totalSpl, totalCon, totalCrt } = this.status;
    const { pAtkOrSMatk } = this.weaponData?.data || { pAtkOrSMatk: 0 };

    return {
      pAtk: floor(totalPow / 3) + floor(totalCon / 5) + this.totalBonus.pAtk + pAtkOrSMatk,
      sMatk: floor(totalSpl / 3) + floor(totalCon / 5) + this.totalBonus.sMatk + pAtkOrSMatk,
      cRate: floor(totalCrt / 3) + this.totalBonus.cRate,
    };
  }

  get criMultiplier() {
    return this._BASE_CRI_MULTIPLIER + this.traitBonus.cRate * 0.01;
  }

  get infoForClass(): InfoForClass {
    return {
      model: this.model,
      monster: this.monster,
      totalBonus: this.totalBonus,
      weapon: this.weaponData,
      status: this.status,
      equipmentBonus: this.equipStatus,
      skillName: this.skillName,
      ammoElement: this.ammoPropertyAtk,
      cometMultiplier: this.getCometMultiplier(),
      skills: this._class.skillState,
    };
  }

  private get isActiveInfilltration() {
    return this.totalBonus.p_infiltration >= 1;
  }

  /** Intoxicação (from Poço Venenoso / Cultivar Fada) drops the target's physical DEF to
   *  zero — browiki.org/wiki/Efeitos_negativos#Intoxicação. The same toggle also feeds the
   *  −25% Poison resistance via `intoxication` (see getElementResistReduction); its presence
   *  flags the whole status. Unlike Infiltration, it grants no pseudo-ATK buff / 100% pene —
   *  it only zeroes hard + soft DEF on the physical path (MDEF is untouched). */
  private get isIntoxicated() {
    return (this.totalBonus['intoxication'] || 0) > 0;
  }

  private get isActiveMildwind() {
    return this.totalBonus.mildwind >= 1;
  }

  private get isForceSkillCri() {
    return this.totalBonus.forceCri >= 1;
  }

  private toPercent(n: number) {
    return round(n * 0.01, 4);
  }

  /** Inverse of `toPercent` for display: turns a raw multiplier (1.25) back into the
   *  percentage bonus it represents (+25). Used to tag graph stages with the percentage
   *  that produced their delta — see DamageFormulaNode.percent. */
  private toPercentBonus(multiplier: number) {
    return round((multiplier - 1) * 100, 3);
  }

  private toPreventNegativeDmg(n: number) {
    return n < 0 ? 1 : n;
  }

  /**
   * Red-aura MVPs reduce the final damage dealt to them by 99.9% (only 0.1%
   * lands). Applied to each final damage number (physical/magical skills and
   * basic/crit autoattacks) right before it is returned. No-op for every other
   * monster, so non-red targets are unaffected.
   */
  private applyAuraReduction(n: number) {
    if (!this.monster?.data?.isRedAura) return n;

    return floor(n * 0.001);
  }

  private isRangeAtk() {
    return this.weaponData?.data?.rangeType === 'range';
  }

  private isActiveEDP(skillName: string) {
    const can = isSkillCanEDP(skillName);
    if (!can) return false;

    return this.totalBonus['edp'] > 0;
  }

  private getCometMultiplier() {
    return this.toPercent(100 + (this.totalBonus['comet'] || 0));
  }

  /**
   *
   * @returns Final damage multiplier
   */
  private _getDarkClawBonus(atkType: SkillType): number {
    if (atkType !== SkillType.MELEE) return 0;

    const bonus = this.totalBonus['darkClaw'] || 0;
    if (!bonus) return 0;

    if (this.monster.isBoss) {
      return 100 + bonus / 2;
    }

    return 100 + bonus;
  }

  private _getQuakeBonus(atkType: SkillType): number {
    if (atkType === SkillType.MAGICAL) return 0;

    const bonus = this.totalBonus['quake'] || 0;
    if (!bonus) return 0;

    return 100 + bonus;
  }

  private _getSporeExplosionBonus(atkType: SkillType): number {
    if (atkType !== SkillType.RANGE) return 0;

    const bonus = this.totalBonus['sporeExplosion'] || 0;
    if (!bonus) return 0;

    if (this.monster.isBoss) {
      return 100 + bonus / 2;
    }

    return 100 + bonus;
  }

  private _getOleumSanctumBonus(atkType: SkillType): number {
    if (atkType !== SkillType.RANGE) return 0;

    const bonus = this.totalBonus['oleumSanctum'] || 0;
    if (!bonus) return 0;

    return 100 + bonus;
  }

  private _getRaidMultiplier() {
    if (!this.totalBonus['raid']) return 0;

    return this.monster.isBoss ? 115 : 130;
  }

  /** Gravitação (Ground Gravitation's [Gravitational Field]) — the target takes +10% both
   *  physical and magical damage (rAthena battle.cpp `damage += damage * 10 / 100` on
   *  BF_WEAPON|BF_MAGIC). No effect on boss monsters. Unlike quake/darkClaw/sporeExplosion
   *  it isn't gated by atkType — it hits every damage kind. */
  private _getGravitationBonus() {
    const bonus = this.totalBonus['gravitation'] || 0;
    if (!bonus || this.monster.isBoss) return 0;

    return 100 + bonus;
  }

  private getDebuffMultiplier(atkType: SkillType) {
    let totalBonus = 0;

    totalBonus += this._getRaidMultiplier();
    totalBonus += this._getGravitationBonus();
    totalBonus += this._getQuakeBonus(atkType);

    switch (atkType) {
      case SkillType.MELEE: {
        totalBonus += this._getDarkClawBonus(atkType);
        break;
      }
      case SkillType.RANGE:
        totalBonus += this._getSporeExplosionBonus(atkType);
        totalBonus += this._getOleumSanctumBonus(atkType);
        break;
    }

    return this.toPercent(totalBonus || 100);
  }

  private getAdvanceKatar() {
    if (this.weaponData.data.typeName !== 'katar') return 0;

    return this.totalBonus['advKatar'] || 0;
  }

  private getStrikingAtk() {
    const endowLearnedLv = this.totalBonus['strikingEndowSkillLv'];
    if (!endowLearnedLv) return 0;

    const weaponLvl = this.weaponData.data?.baseWeaponLevel || 0;

    return weaponLvl * 18 + endowLearnedLv * 5;
  }

  private getVIAmp(propertyAtk: ElementType) {
    if (propertyAtk !== ElementType.Poison) return 1;

    return this.toPercent((this.totalBonus['vi'] || 0) + 100);
  }

  private isIncludingOverUpgrade() {
    const weaType = this.weaponData?.data?.typeName;

    return weaType !== 'bow' && weaType !== 'gun';
  }

  private get isMaximizeWeapon() {
    return this.totalBonus['weapon_maximize'] > 0;
  }

  private get isMaximizeSpell() {
    return this.totalBonus['spell_maximize'] > 0;
  }

  private get myticalAmp() {
    const mysticAmp = 1 + this.toPercent(this.totalBonus['mysticAmp'] || 0);

    return mysticAmp;
  }

  private getBaseCriRate(isActual = false) {
    const { cri } = this.totalBonus;
    const { totalLuk } = this.status;

    const criFromLuk = isActual ? floor(totalLuk * 0.3) : floor(totalLuk / 3);
    const base = 1 + cri + criFromLuk;

    return this.weaponData.data?.typeName === 'katar' ? base * 2 : base;
  }

  private getBasicAspd() {
    const { totalAgi, totalDex } = this.status;

    const totalAspd = this._class.calcAspd({
      potionAspds: [this.aspdPotion, ...(this.model.aspdPotions || [])],
      potionAspdPercent: 0,
      skillAspd: this.totalBonus.skillAspd || 0,
      skillAspdPercent: this.totalBonus.skillAspdPercent || 0,
      totalAgi,
      totalDex,
      weapon: this.weaponData,
      weapon2: this.leftWeaponData,
      isEquipShield: this.model.shield > 0,
      aspd: this.totalBonus.aspd,
      aspdPercent: this.totalBonus.aspdPercent,
      decreaseSkillAspdPercent: this.totalBonus.decreaseSkillAspdPercent,
    });

    const hitsPerSec = floor(50 / (200 - totalAspd));

    return { totalAspd, hitsPerSec: Math.max(hitsPerSec, 1) };
  }

  private getMiscData(): MiscModel {
    const { totalLuk, totalDex, totalAgi, totalCon } = this.status;
    const { hit, perfectHit, flee, perfectDodge } = this.totalBonus;
    const baseLvl = this.model.level;
    const formula = () => {
      return 175 + baseLvl + totalDex + floor(totalLuk / 3) + hit + totalCon * 2;
    };

    const totalHit = formula();
    const totalPerfectHit = floor(totalLuk / 10) + perfectHit;

    const { hitRequireFor100 } = this.monster.data;

    let accuracy = Math.max(5, floor(100 + totalHit - hitRequireFor100));
    accuracy = Math.min(100, Math.max(accuracy, totalPerfectHit));

    const totalFlee = 100 + 0 + floor(baseLvl + totalAgi + totalLuk / 5 + flee) * 1 + totalCon * 2;
    const totalPerfectDodge = floor(1 + totalLuk * 0.1 + perfectDodge);

    return {
      totalHit,
      totalPerfectHit,
      accuracy,
      totalFlee,
      totalPerfectDodge,
    };
  }

  private getExtraCriRateToMonster() {
    const { race, element, size } = this.monster;
    const toRace = this.totalBonus[`cri_race_${race}`] || 0;
    const toElement = this.totalBonus[`cri_element_${element}`] || 0;
    const toSize = this.totalBonus[`cri_size_${size}`] || 0;

    return toRace + toElement + toSize;
  }

  private getSizePenalty() {
    if (this.totalBonus.ignore_size_penalty > 0) {
      return 1;
    }

    const size = this.monster.size;
    const fixedSize = this.totalBonus[`sizePenalty_${size}`];
    if (fixedSize > 0) {
      return this.toPercent(fixedSize);
    }

    const penalty = SizePenaltyMapper[this.weaponData?.data?.typeName]?.[size];

    return this.toPercent(penalty || 100);
  }

  private getPeneResMres() {
    const { race, type } = this.monster;
    const { pene_res = 0, pene_mres = 0 } = this.totalBonus;
    const resByMonster = (this.totalBonus[`pene_res_race_${race}`] || 0) + (this.totalBonus[`pene_res_class_${type}`] || 0);
    const mresByMonster = (this.totalBonus[`pene_mres_race_${race}`] || 0) + (this.totalBonus[`pene_mres_class_${type}`] || 0);
    const totalPeneRes = pene_res + resByMonster;
    const totalPeneMres = pene_mres + mresByMonster;

    return {
      totalPeneRes,
      totalPeneMres,
      effected_pene_res: Math.min(totalPeneRes, 50),
      effected_pene_mres: Math.min(totalPeneMres, 50),
    };
  }

  private getTotalPhysicalPene() {
    const { race, type } = this.monster;
    const { p_pene_race_all, p_pene_class_all } = this.totalBonus;
    const rawP_Pene = p_pene_race_all + (p_pene_class_all || 0);
    const pByMonster = (this.totalBonus[`p_pene_race_${race}`] || 0) + (this.totalBonus[`p_pene_class_${type}`] || 0);
    const totalP_Pene = rawP_Pene + pByMonster;

    return Math.min(100, totalP_Pene);
  }

  private getTotalMagicalPene() {
    const { race, type } = this.monster;
    const { m_pene_race_all, m_pene_class_all } = this.totalBonus;
    const rawM_Pene = m_pene_race_all + (m_pene_class_all || 0);
    const mByMonster = (this.totalBonus[`m_pene_race_${race}`] || 0) + (this.totalBonus[`m_pene_class_${type}`] || 0);
    const totalM_Pene = rawM_Pene + mByMonster;

    return Math.min(100, totalM_Pene);
  }

  private getPhisicalDefData() {
    const { def, softDef, res } = this.monster.data;
    const p_pene = this.getTotalPhysicalPene();

    const reducedHardDef = def * ((100 - p_pene) / 100);
    const dmgReductionByHardDef = (4000 + def * ((100 - p_pene) / 100)) / (4000 + def * ((100 - p_pene) / 100) * 10);

    // Both Infiltration and Intoxicação bypass the target's physical DEF entirely; only
    // Infiltration also converts it into pseudo-ATK / 100% pene (handled at its own sites).
    const isDefZeroed = this.isActiveInfilltration || this.isIntoxicated;
    const finalDmgReduction = isDefZeroed ? 1 : dmgReductionByHardDef;
    const finalSoftDef = isDefZeroed ? 0 : softDef;

    const { monster_res } = this.totalBonus;
    const { effected_pene_res } = this.getPeneResMres();
    const restRes = Math.max(res + monster_res, 0) * ((100 - effected_pene_res) / 100);
    const resReduction = (2000 + restRes) / (2000 + restRes * 5);

    return { reducedHardDef, dmgReductionByHardDef, finalDmgReduction, finalSoftDef, resReduction, restRes };
  }

  private getMagicalDefData() {
    const { mdef, mres } = this.monster.data;
    const m_pene = this.getTotalMagicalPene();
    const mDefBypassed = round(mdef - mdef * this.toPercent(m_pene), 4);
    const dmgReductionByMHardDef = (1000 + mDefBypassed) / (1000 + mDefBypassed * 10);

    const { monster_mres } = this.totalBonus;
    const { effected_pene_mres } = this.getPeneResMres();
    const restMres = Math.max(mres + monster_mres, 0) * ((100 - effected_pene_mres) / 100);
    const mresReduction = (2000 + restMres) / (2000 + restMres * 5);

    return { dmgReductionByMHardDef, mresReduction, mDefBypassed, restMres };
  }

  /**
   * The vs-player reduction, split for the formula graph (see docs/pvp.md §2/§4):
   *   - `steps`: ONE per gear-reduction category that applies (race/element/size/
   *     class/flat), each with its pt-BR label + keys, so the graph shows a named,
   *     clickable node per kind ("Redução Humano", "Redução Neutro", …).
   *   - `defender`: their combined multiplier (for paths without a graph to split).
   *   - `woe`: the WoE-castle global layer (mode + channel), not gear.
   * All are empty/1 whenever no player target is active.
   */
  private getPvpReductionParts(params: { dmgType: 'physical' | 'magical'; isSkill: boolean; isMelee: boolean; attackElement: string }): {
    steps: DefenderReductionStep[];
    defender: number;
    woe: number;
  } {
    if (this.pvp.mode === 'none') return { steps: [], defender: 1, woe: 1 };

    const steps = defenderReductionSteps({
      bonus: this.pvp.defenderBonus,
      dmgType: params.dmgType,
      attackerRace: this.pvp.attackerRace,
      attackerElement: (params.attackElement || 'neutral').toLowerCase(),
      attackerSize: 'm', // players are Medium
      attackerType: 'normal', // players are Normal class
      isRanged: !params.isMelee, // ranged bow / ranged skill gates dmg_taken_range
    });
    const defender = steps.reduce((mult, s) => mult * s.factor, 1);
    const channel = pvpChannelOf({ isSkill: params.isSkill, isMelee: params.isMelee });
    const woe = woeGlobalMultiplier(this.pvp.mode, channel);
    return { steps, defender, woe };
  }

  /**
   * Apply the PVP reduction to a skill's running total AND record it in the formula
   * graph: one node per gear-reduction category (named + clickable into the target's
   * gear) plus the WoE-castle step. Shared by the physical and magical skill formulas.
   * Returns the new running total.
   */
  private applyPvpReduction(
    total: number,
    parts: { steps: DefenderReductionStep[]; woe: number },
    push: (label: string, value: number, keys?: string[]) => void,
    emit: (id: string, label: string, value: number, keys?: string[], opts?: { extraInputs?: string[]; multiplier?: number }) => void,
  ): number {
    for (const s of parts.steps) {
      total = floor(total * s.factor);
      push(s.label, total, s.keys);
      emit(`pvpRed_${s.keys[0]}`, s.label, total, s.keys, { multiplier: s.factor });
    }
    if (parts.woe !== 1) {
      total = floor(total * parts.woe);
      push('Redução da guerra', total);
      emit('pvpWoeReduction', 'Redução da guerra', total, [], { multiplier: parts.woe });
    }
    return total;
  }

  private getSkillBonus(skillName: string) {
    // item.json keys skill bonuses by id; fall back to the name for skills that have
    // no catalog id yet (and for non-skill bonus keys that share this lookup).
    return this.totalBonus[SKILL_ID_BY_NAME[skillName] ?? skillName] || 0;
  }

  private getAtkGroupA(params: { totalAtk: number; }) {
    const { totalAtk } = params;
    const atkPercent = this.toPercent(this.totalBonus.atkPercent);

    let total = totalAtk;
    total = floor(total * atkPercent); // tested

    return total;
  }

  /** `idPrefix`/`baseNodeId`, when passed, additionally build the node-graph chain for
   *  this group (race→size→element→monsterType→comet→final-multiplier) — each a real
   *  running-total floor(), same shape as skillFormula's own chain, so decomposing it
   *  doesn't touch the actual arithmetic (see plan: floor()-order hazards). */
  private getAtkGroupB(params: { totalAtk: number; idPrefix?: string; baseNodeId?: string; }): { total: number; nodes: DamageFormulaNode[]; } {
    const { totalAtk, idPrefix, baseNodeId } = params;
    const race = this.toPercent(this.getRaceMultiplier('p'));
    const size = this.toPercent(this.getSizeMultiplier('p'));
    const element = this.toPercent(this.getElementMultiplier('p'));
    const monsterType = this.toPercent(this.getMonsterTypeMultiplier('p'));
    const comet = this.getCometMultiplier();
    // console.log({ race, size, element, monsterType, comet, monster: this.monster.name });

    const nodes: DamageFormulaNode[] = [];
    // `multiplier` is the raw factor (1.25 for +25%); it's carried on the node as a
    // percentage bonus so the UI can show the "%" chip that explains this stage's delta.
    const push = (suffix: string, label: string, value: number, keys: string[], multiplier: number) => {
      if (!idPrefix) return;
      const prevId = nodes.length ? nodes[nodes.length - 1].id : baseNodeId || `${idPrefix}_base`;
      nodes.push({
        id: `${idPrefix}_${suffix}`,
        label,
        value,
        keys,
        percent: this.toPercentBonus(multiplier),
        inputs: [prevId],
        kind: 'stage',
      });
    };

    let total = floor(totalAtk * race);
    push('race', 'ATQ x Raça', total, ['p_race_all'], race);
    total = floor(total * size);
    push('size', 'ATQ x Tamanho', total, ['p_size_all'], size);
    total = floor(total * element); // tested
    push('element', 'ATQ x Elemento', total, ['p_element_all'], element);
    total = floor(total * monsterType); // tested
    push('monsterType', 'ATQ x Classe do monstro', total, ['p_class_all'], monsterType);
    total = floor(total * comet);
    if (comet !== 1) push('comet', 'Cometa', total, ['comet'], comet);
    const beforeFinalMultiplier = total;
    total = this.applyFinalMultiplier(total);
    // Final-multiplier delta (rare) folds silently into the last node, same convention
    // used for masteryAtk below — avoids an opaque node with no attributable source.
    if (nodes.length) {
      const lastNode = nodes[nodes.length - 1];
      lastNode.value = total;
      // Once folded, the node's own multiplier no longer explains its delta, so drop the
      // "%" chip rather than have it claim a percentage that doesn't reconcile.
      if (total !== beforeFinalMultiplier) {
        delete lastNode.percent;
      }
    }

    return { total, nodes };
  }

  private getStatusAtk() {
    const { totalStr, totalDex, totalLuk, totalPow } = this.status;
    const baseLvl = this.model.level;
    const [primaryStatus, secondStatus] = this.isRangeAtk() ? [totalDex, totalStr] : [totalStr, totalDex];

    const rawStatusAtk = floor(baseLvl / 4 + secondStatus / 5 + primaryStatus + totalLuk / 3) + totalPow * 5;

    return rawStatusAtk;
  }

  /** Shorthand for the shared DamageFormulaCalc row precision — see formatCalcNumber. */
  private fmtCalc(n: number): string {
    return formatCalcNumber(n);
  }

  /** Derivation shown when "ATQ Status" is clicked in the formula graph — mirrors
   *  getStatusAtk() above plus the `* 2 * mildwindMultiplier` its caller applies. */
  private buildStatusAtkCalc(mildwindMultiplier: number, total: number): DamageFormulaCalc {
    const { totalStr, totalDex, totalLuk, totalPow } = this.status;
    const baseLvl = this.model.level;
    const isRange = this.isRangeAtk();
    const [primaryStatus, secondStatus] = isRange ? [totalDex, totalStr] : [totalStr, totalDex];
    const primaryLabel = isRange ? 'DES' : 'FOR';
    const secondLabel = isRange ? 'FOR' : 'DES';
    const statusAtkBase = this.getStatusAtk();

    const rows: DamageFormulaCalcRow[] = [
      { label: 'Nível base ÷ 4', display: this.fmtCalc(baseLvl / 4) },
      { label: `${secondLabel} ${this.fmtCalc(secondStatus)} ÷ 5`, display: this.fmtCalc(secondStatus / 5) },
      { label: `${primaryLabel} (principal)`, display: this.fmtCalc(primaryStatus) },
      { label: `SOR ${this.fmtCalc(totalLuk)} ÷ 3`, display: this.fmtCalc(totalLuk / 3) },
      { label: 'Subtotal (arredondado p/ baixo)', display: this.fmtCalc(floor(baseLvl / 4 + secondStatus / 5 + primaryStatus + totalLuk / 3)) },
      { label: `POD ${this.fmtCalc(totalPow)} × 5`, display: this.fmtCalc(totalPow * 5) },
      { label: 'ATQ Status base', display: this.fmtCalc(statusAtkBase) },
      { label: '× 2', display: this.fmtCalc(statusAtkBase * 2) },
    ];
    if (mildwindMultiplier !== 1) {
      rows.push({ label: `× Elemento (Ventania) ${this.fmtCalc(mildwindMultiplier)}`, display: this.fmtCalc(total) });
    }
    rows.push({ label: 'ATQ Status', display: this.fmtCalc(total), emphasis: true });

    return { rows };
  }

  /** Derivation shown when "ATQ da Arma" is clicked — mirrors getWeaponAtk()'s `formula`,
   *  using the sub-parts that getter now returns alongside its totals. `total` is the
   *  min/max/maxOver variant this particular graph was built for. */
  private buildWeaponAtkCalc(parts: ReturnType<DamageCalculator['getWeaponAtk']>['parts'], total: number): DamageFormulaCalc {
    const rows: DamageFormulaCalcRow[] = [{ label: 'ATQ base da arma', display: this.fmtCalc(parts.baseWeaponAtk) }];

    if (parts.highUpgradeBonus) rows.push({ label: 'Refino alto', display: this.fmtCalc(parts.highUpgradeBonus) });
    // The variant swings ±(baseAtk × nível da arma × 0.05) — the whole reason ATQ has a
    // min and a max. Shown as a range since a single graph only carries one side of it.
    if (parts.variant) rows.push({ label: 'Variação da arma (±)', display: this.fmtCalc(parts.variant) });
    if (parts.flatWeaponAtk) rows.push({ label: 'ATQ de Arma (equip)', display: this.fmtCalc(parts.flatWeaponAtk) });
    rows.push({ label: `${parts.isRangeAtk ? 'DES' : 'FOR'} ${this.fmtCalc(parts.mainState)} × ATQ base ÷ 200`, display: this.fmtCalc(parts.statBonus) });
    if (parts.refineBonus) rows.push({ label: 'Bônus de refino', display: this.fmtCalc(parts.refineBonus) });
    if (parts.overUpgradeBonus) rows.push({ label: 'Bônus de sobre-refino', display: this.fmtCalc(parts.overUpgradeBonus) });
    if (parts.pseudoElementAtk) rows.push({ label: `× Pseudo-elemento (+${this.fmtCalc(parts.pseudoElementAtk * 100)}%)`, display: '' });
    if (parts.sizePenalty !== 1) rows.push({ label: `× Penalidade de tamanho ${this.fmtCalc(parts.sizePenalty)}`, display: '' });
    if (parts.weaPercent !== 1) rows.push({ label: `× ATQ de Arma % ${this.fmtCalc(parts.weaPercent * 100)}%`, display: '' });
    rows.push({ label: 'ATQ da Arma', display: this.fmtCalc(total), emphasis: true });

    return { rows, note: WEAPON_VARIANCE_NOTE };
  }

  private getRaceMultiplier(atkType: 'p' | 'm') {
    const prefix = `${atkType}_race`;
    const base = this.totalBonus[`${prefix}_all`] || 0;

    const total = 100 + base + (this.totalBonus[`${prefix}_${this.monster.race}`] ?? 0);

    return round(total, 3);
  }

  private getSizeMultiplier(atkType: 'p' | 'm') {
    const prefix = `${atkType}_size`;
    const base = this.totalBonus[`${prefix}_all`] || 0;

    const total = 100 + base + (this.totalBonus[`${prefix}_${this.monster.size}`] ?? 0);

    return round(total, 3);
  }

  private getElementMultiplier(atkType: 'p' | 'm') {
    const prefix = `${atkType}_element`;
    const base = this.totalBonus[`${prefix}_all`] || 0;

    const total = 100 + base + (this.totalBonus[`${prefix}_${this.monster.element}`] ?? 0);

    return round(total, 3);
  }

  private getMonsterTypeMultiplier(atkType: 'p' | 'm') {
    const base = this.totalBonus[`${atkType}_class_all`] || 0;

    const total = 100 + base + (this.totalBonus[`${atkType}_class_${this.monster.type}`] ?? 0);

    return round(total, 3);
  }

  /**
   * Ex. Power Thrust
   * @returns number
   */
  private getFlatDmg(skillName?: string) {
    const base = this.totalBonus['flatDmg'] || 0;
    if (skillName === 'basicAtk') {
      const flatBasicAtk = this.totalBonus['flatBasicDmg'] || 0;
      return base + flatBasicAtk;
    }

    if (skillName) {
      const flatSkill = this.totalBonus[`flat_${skillName}`] || 0;
      return base + flatSkill;
    }

    return base;
  }

  private getEquipAtkFromSkills(atkType: 'atk' | 'matk' = 'atk') {
    let atk = 0;
    for (const [, scripts] of Object.entries(this.equipAtkSkillBonus)) {
      for (const [attr, value] of Object.entries(scripts)) {
        const val = Number(value);
        if (attr === atkType) {
          atk += val;
        }
      }
    }

    return atk;
  }

  private getEquipAtk() {
    return this.totalBonus.atk;
  }

  private getExtraAtk() {
    const { reducedHardDef } = this.getPhisicalDefData();
    const equipAtk = this.getEquipAtk();
    const ammoAtk = this.equipStatus.ammo?.atk || 0;
    const pseudoBuffATK = this.isActiveInfilltration ? reducedHardDef / 2 : 0;
    const skillAtk = this.getEquipAtkFromSkills();
    const striking = this.getStrikingAtk();

    return { total: equipAtk + skillAtk + ammoAtk + pseudoBuffATK + striking, equipAtk, skillAtk, ammoAtk, pseudoBuffATK, striking };
  }

  private getBuffMasteryAtk(atkType: 'atk' | 'matk') {
    let atk = 0;
    for (const [, scripts] of Object.entries(this.buffMasteryAtkBonus)) {
      for (const [attr, value] of Object.entries(scripts)) {
        const val = Number(value);
        if (attr === atkType) {
          atk += val;
        }
      }
    }

    return atk;
  }

  private getMasteryAtk() {
    const skillAtk = Object.values(this.masteryAtkSkillBonus)
      .map((a) => Number(a.atk))
      .filter((a) => Number.isNaN(a) === false)
      .reduce((sum, m) => sum + m, 0);
    const buffAtk = this.getBuffMasteryAtk('atk');
    const uiMastery = this._class.getUiMasteryAtk(this.infoForClass);
    const hiddenMastery = this._class.getMasteryAtk(this.infoForClass);

    return { total: skillAtk + buffAtk + uiMastery + hiddenMastery, skillAtk, buffAtk, uiMastery, hiddenMastery };
  }

  private getWeaponAtk(params: { isEDP: boolean; sizePenalty: number; }) {
    const { isEDP, sizePenalty } = params;
    const { baseWeaponAtk, baseWeaponLevel, refineBonus, overUpgradeBonus, highUpgradeBonus } = this.weaponData.data;
    const variant = baseWeaponAtk * baseWeaponLevel * 0.05;

    let pseudoElementAtk = undefined;
    if (isEDP) {
      const pseudoPoison = this.getPurePropertyMultiplier(ElementType.Poison) * this.EDP_WEAPON_MULTIPLIER;
      pseudoElementAtk = pseudoPoison;
    }

    const { magnumBreakPsedoBonus, magnumBreakClearEDP } = this.totalBonus;
    if (magnumBreakPsedoBonus) {
      const pseudoFire = this.getPurePropertyMultiplier(ElementType.Fire) * this.MAGNUM_BREAK_WEAPON_MULTIPLIER;
      pseudoElementAtk = pseudoFire;
    } else if (magnumBreakClearEDP) {
      pseudoElementAtk = 0;
    }

    const { totalStr, totalDex } = this.status;
    const mainState = this.isRangeAtk() ? totalDex : totalStr;
    const statBonus = (baseWeaponAtk * mainState) / 200;

    const formula = (_variant: number, overUpg: number) => {
      const upgradeBonus = refineBonus + (this.isIncludingOverUpgrade() ? overUpg : 0);

      let total = baseWeaponAtk + highUpgradeBonus + _variant + (this.totalBonus['weaponAtk'] || 0);
      total += statBonus;
      total += upgradeBonus;
      if (pseudoElementAtk != null) {
        total = total + total * pseudoElementAtk;
      }
      total = total * sizePenalty;

      return floor(round(total, 3));
    };

    // Absolute multiplier, 100 = neutral. Only the Amuleto de Terra sets it (150 = x1,5);
    // it is not an item-bonus key — item scripts phrased "ATQ da arma +N%" use atkPercent
    // (see 400053 Morrigane Ilusional, 313366 Encanto de Poder).
    const weaPercent = (this.totalBonus['weaponAtkPercent'] || 100) / 100;

    const totalMin = formula(-variant, 0) * weaPercent;
    const totalMax = formula(variant, 0) * weaPercent;
    const totalMaxOver = formula(variant, overUpgradeBonus) * weaPercent;

    // The sub-parts are returned alongside the totals (same `{ total, ...parts }` shape
    // getExtraAtk/getMasteryAtk use) purely so the graph's "ATQ da Arma" node can show
    // how it was derived — nothing here re-computes anything the totals didn't already use.
    return {
      totalMin,
      totalMax,
      totalMaxOver,
      parts: {
        baseWeaponAtk,
        variant,
        statBonus,
        refineBonus,
        overUpgradeBonus,
        highUpgradeBonus,
        flatWeaponAtk: this.totalBonus['weaponAtk'] || 0,
        pseudoElementAtk,
        sizePenalty,
        weaPercent,
        mainState,
        isRangeAtk: this.isRangeAtk(),
      },
    };
  }

  private getPropertyMultiplier(propertyAtk: ElementType) {
    // Neutral 1
    let pMultiplier = ElementMapper[this.monster.elementName][propertyAtk];
    pMultiplier = pMultiplier * this.getVIAmp(propertyAtk);
    pMultiplier += this.getElementResistReduction(propertyAtk);

    return round(this.toPercent(pMultiplier), 2);
  }

  /** Reductions to the target's elemental resistance, added (in percentage points)
   *  to the property modifier — lowering the target's resistance makes that property
   *  land for more, exactly as rAthena's `ele_fix += ...`. Oratio lowers Holy
   *  resistance (−2% per level, −20% at Lv 10); Infecção (from Maldição de Jormungand)
   *  lowers Poison resistance (−5% per Killing Cloud level, −25% at Lv 5); Intoxicação
   *  (from Poço Venenoso) makes the target take +25% Poison damage, i.e. −25% Poison
   *  resistance — the two poison debuffs stack; Geladinho (Bitter Cold, from Jack Frost
   *  Nova) makes the target take +15% Water damage, i.e. −15% Water resistance. */
  private getElementResistReduction(propertyAtk: ElementType) {
    if (propertyAtk === ElementType.Holy) return this.totalBonus['oratio'] || 0;
    if (propertyAtk === ElementType.Poison) return (this.totalBonus['infection'] || 0) + (this.totalBonus['intoxication'] || 0);
    if (propertyAtk === ElementType.Water) return this.totalBonus['bitterCold'] || 0;

    return 0;
  }

  private getPurePropertyMultiplier(propertyAtk: ElementType) {
    const pMultiplier = ElementMapper[this.monster.elementName][propertyAtk];

    return this.toPercent(pMultiplier);
  }

  private calcTotalAtk(params: { propertyAtk: ElementType; isEDP: boolean; sizePenalty: number; isExcludeCannanball: boolean; }) {
    const { propertyAtk, isEDP, sizePenalty, isExcludeCannanball } = params;
    const propertyMultiplier = this.getPropertyMultiplier(propertyAtk);

    const extraAtkDetail = this.getExtraAtk();
    const extraAtk = extraAtkDetail.total;
    const cannonBallAtk = isExcludeCannanball ? 0 : this.totalBonus.cannonballAtk || 0;
    const masteryAtkDetail = this.getMasteryAtk();
    const masteryAtk = masteryAtkDetail.total + cannonBallAtk;

    const mildwindMultiplier = this.isActiveMildwind ? propertyMultiplier : this.getPropertyMultiplier(ElementType.Neutral);
    const statusAtk = this.getStatusAtk() * 2 * mildwindMultiplier;

    const { totalMin: _weaMin, totalMax: weaMax, totalMaxOver: weaMaxOver, parts: weaponAtkParts } = this.getWeaponAtk({ sizePenalty, isEDP });
    const weaMin = this.isMaximizeWeapon ? weaMax : _weaMin;

    const aMin = this.getAtkGroupA({ totalAtk: weaMin + extraAtk });
    const aMax = this.getAtkGroupA({ totalAtk: weaMax + extraAtk });
    const aMaxOver = this.getAtkGroupA({ totalAtk: weaMaxOver + extraAtk });

    // const equipAtk = this.getEquipAtk();
    // const equipAtkFromEDP = isEDP ? equipAtk * (this.EDP_EQUIP_MULTIPLIER - 1) : 0;
    const bMinResult = this.getAtkGroupB({ totalAtk: weaMin + extraAtk, idPrefix: 'groupB', baseNodeId: 'atkBase' });
    const bMaxResult = this.getAtkGroupB({ totalAtk: weaMax + extraAtk, idPrefix: 'groupB', baseNodeId: 'atkBase' });
    const bMaxOverResult = this.getAtkGroupB({ totalAtk: weaMaxOver + extraAtk, idPrefix: 'groupB', baseNodeId: 'atkBase' });
    let bMin = bMinResult.total;
    let bMax = bMaxResult.total;
    let bMaxOver = bMaxOverResult.total;
    if (isEDP) {
      // EDP's x4 multiplier on group B is its own real, attributable step — exposed as
      // a node (keys: ['edp']) rather than folded silently, since it's driven by an
      // actual equip/consumable bonus.
      const applyEdp = (result: { total: number; nodes: DamageFormulaNode[]; }) => {
        const newTotal = result.total * this.EDP_EQUIP_MULTIPLIER;
        if (result.nodes.length) {
          const prevId = result.nodes[result.nodes.length - 1].id;
          result.nodes.push({ id: `${prevId}_edp`, label: 'ATQ x EDP (equip)', value: newTotal, keys: ['edp'], inputs: [prevId], kind: 'stage' });
        }
        return newTotal;
      };
      bMin = applyEdp(bMinResult);
      bMax = applyEdp(bMaxResult);
      bMaxOver = applyEdp(bMaxOverResult);
    }

    const pAtkMultiplier = 1 + this.traitBonus.pAtk / 100;

    // ATQ stays one combined figure, except for two pieces worth calling out on their
    // own: the equipment %ATQ bonus (group A) and the P.ATQ trait multiplier. The
    // "ATQ" row shown first is the real value with the %ATQ bonus set to 0 (identical
    // to the real total whenever there's no such bonus); "ATQ +x%" is the real value
    // with it included — an honest before/after, not an approximation. Mastery ATQ
    // folds silently into whichever row ends up last, so the total still reconciles.
    const buildAtkSteps = (aVal: number, bVal: number): DamageFormulaStep[] => {
      const steps: DamageFormulaStep[] = [];
      let running = statusAtk + floor(bVal * propertyMultiplier);
      steps.push({ label: 'ATQ', value: running, keys: ['atk'] });
      if (aVal !== 0) {
        running = statusAtk + floor((aVal + bVal) * propertyMultiplier);
        steps.push({ label: `ATQ +${this.fmtCalc(this.totalBonus.atkPercent || 0)}%`, value: running, keys: ['atkPercent'] });
      }
      if (pAtkMultiplier !== 1) {
        running *= pAtkMultiplier; // no floor() here — the real formula doesn't floor this step either
        steps.push({ label: `P.ATQ +${this.fmtCalc(this.traitBonus.pAtk)}%`, value: running, keys: ['pAtk'] });
      }
      if (masteryAtk !== 0) {
        running += masteryAtk;
        steps[steps.length - 1].value = running;
      }
      return steps;
    };

    // buildAtkNodes runs three times (min/max/maxOver) but these two derivations depend on
    // nothing that varies between them, so they're built once here rather than three
    // identical times. The hidden-mastery one is also skipped entirely when there's no
    // hidden mastery — it scans every skill/buff bonus map, and most classes have none.
    const statusAtkCalc = this.buildStatusAtkCalc(mildwindMultiplier, statusAtk);
    const hiddenMasteryCalc = masteryAtkDetail.hiddenMastery ? this.buildHiddenMasteryCalc(masteryAtkDetail.hiddenMastery) : undefined;

    // Node-graph version of the same math above — every value here is read from a
    // variable already computed for the (unchanged) totalMin/Max/MaxOver formulas
    // below; nothing here is re-derived. `input` nodes (statusAtk, extraAtk's/masteryAtk's
    // sub-parts) are exposure of existing internals, never new arithmetic.
    // (`weaponAtkValue` differs per variant, so buildWeaponAtkCalc stays inside.)
    const buildAtkNodes = (aVal: number, bVal: number, weaponAtkValue: number, bValNodes: DamageFormulaNode[]): DamageFormulaNode[] => {
      const nodes: DamageFormulaNode[] = [];
      const pushInput = (cond: any, id: string, label: string, value: number, keys?: string[]) => {
        if (!cond) return;
        nodes.push({ id, label, value, keys, inputs: [], kind: 'input' });
      };

      nodes.push({ id: 'statusAtk', label: 'ATQ Status (STR/DEX/LUK/POW)', value: statusAtk, inputs: [], kind: 'input', calc: statusAtkCalc });
      nodes.push({ id: 'weaponAtk', label: 'ATQ da Arma', value: weaponAtkValue, inputs: [], kind: 'input', calc: this.buildWeaponAtkCalc(weaponAtkParts, weaponAtkValue) });
      pushInput(extraAtkDetail.equipAtk, 'extraAtk_equip', 'ATQ Equip.', extraAtkDetail.equipAtk, ['atk']);
      pushInput(extraAtkDetail.skillAtk, 'extraAtk_skill', 'ATQ Hab. equip', extraAtkDetail.skillAtk);
      if (extraAtkDetail.ammoAtk) {
        nodes.push({
          id: 'extraAtk_ammo',
          label: 'ATQ Munição',
          value: extraAtkDetail.ammoAtk,
          inputs: [],
          kind: 'input',
          // Ammo ATK is read straight off the equipped ammo's own status (equipStatus.ammo),
          // not from totalBonus, so the equipment-breakdown dialog can never source it —
          // show where the number comes from instead.
          calc: {
            rows: [
              { label: 'ATQ da munição equipada', display: this.fmtCalc(extraAtkDetail.ammoAtk) },
              { label: 'Elemento da munição', display: this.ammoPropertyAtk || '—' },
              { label: 'ATQ Munição', display: this.fmtCalc(extraAtkDetail.ammoAtk), emphasis: true },
            ],
            note: 'Vem direto da munição equipada — some do cálculo se a munição for removida.',
          },
        });
      }
      pushInput(extraAtkDetail.pseudoBuffATK, 'extraAtk_pseudoBuff', 'ATQ Infiltração', extraAtkDetail.pseudoBuffATK, ['p_infiltration']);
      pushInput(extraAtkDetail.striking, 'extraAtk_striking', 'ATQ Striking', extraAtkDetail.striking, ['strikingEndowSkillLv']);

      const extraInputIds = nodes.filter((n) => n.id.startsWith('extraAtk_')).map((n) => n.id);
      nodes.push({ id: 'atkBase', label: 'ATQ Base (arma + equip)', value: weaponAtkValue + extraAtkDetail.total, inputs: ['weaponAtk', ...extraInputIds], kind: 'stage' });

      // `aVal` (getAtkGroupA's floor(atkBase * atkPercent)) is deliberately *not* its own
      // node: it's the increment the atkPercent bonus contributes, which the UI already
      // shows as the "Adicional" chip on the atkPercentStage cluster below. Emitting it
      // separately as well read as a phantom extra step in the chain.
      nodes.push(...bValNodes);
      let lastBId = bValNodes.length ? bValNodes[bValNodes.length - 1].id : 'atkBase';

      // The elemental table multiplier (attack element vs. the monster's) hits only the
      // group-B branch, never ATQ Status. Left folded inside the 'ATQ' stage below it made
      // that stage do two things at once — add ATQ Status *and* apply the element — so its
      // "Adicional" chip reported the sum of both and visibly failed to match the ATQ Status
      // chip sitting right next to it. Splitting it out is not new math: `bValElement` is
      // the same floor(bVal * propertyMultiplier) subexpression the stage always used.
      const bValElement = floor(bVal * propertyMultiplier);
      if (propertyMultiplier !== 1) {
        nodes.push({
          id: 'atkElemental',
          label: 'Multiplicador elemental',
          value: bValElement,
          keys: ['vi', 'oratio', 'infection', 'intoxication', 'bitterCold'],
          percent: this.toPercentBonus(propertyMultiplier),
          inputs: [lastBId],
          kind: 'stage',
        });
        lastBId = 'atkElemental';
      }

      let running = statusAtk + bValElement;
      nodes.push({ id: 'atk', label: 'ATQ', value: running, keys: ['atk'], inputs: ['statusAtk', lastBId], kind: 'stage' });
      let prevId = 'atk';
      if (aVal !== 0) {
        running = statusAtk + floor((aVal + bVal) * propertyMultiplier);
        const atkPercent = this.totalBonus.atkPercent || 0;
        nodes.push({
          id: 'atkPercentStage',
          label: `ATQ +${this.fmtCalc(atkPercent)}%`,
          value: running,
          keys: ['atkPercent'],
          percent: atkPercent,
          inputs: ['atk'],
          kind: 'stage',
        });
        prevId = 'atkPercentStage';
      }
      if (pAtkMultiplier !== 1) {
        running *= pAtkMultiplier; // no floor() here — matches buildAtkSteps above
        nodes.push({
          id: 'pAtkStage',
          label: `P.ATQ +${this.fmtCalc(this.traitBonus.pAtk)}%`,
          value: running,
          keys: ['pAtk'],
          percent: this.toPercentBonus(pAtkMultiplier),
          inputs: [prevId],
          kind: 'stage',
        });
        prevId = 'pAtkStage';
      }
      if (masteryAtk !== 0) {
        const masteryInputs: string[] = [];
        const pushMastery = (cond: any, id: string, label: string, value: number, keys?: string[], calc?: DamageFormulaCalc) => {
          if (!cond) return;
          nodes.push({ id, label, value, keys, inputs: [], kind: 'input', calc });
          masteryInputs.push(id);
        };
        const simpleMastery: [number, string, string, string][] = [
          [masteryAtkDetail.skillAtk, 'masteryAtk_skill', 'Maestria (hab.)', 'ATQ de maestria concedido por habilidades'],
          [masteryAtkDetail.buffAtk, 'masteryAtk_buff', 'Maestria (buff)', 'ATQ de maestria concedido por buffs ativos'],
          [masteryAtkDetail.uiMastery, 'masteryAtk_ui', 'Maestria (classe)', 'ATQ de maestria da classe (aparece no ATQ do jogo)'],
        ];
        for (const [value, id, label, rowLabel] of simpleMastery) {
          pushMastery(value, id, label, value, undefined, { rows: [{ label: rowLabel, display: this.fmtCalc(value), emphasis: true }], note: MASTERY_NOTE });
        }
        // `hiddenMasteryCalc` is built by the caller (once per calcTotalAtk, not once per
        // min/max/maxOver variant) and only when there's a value to explain.
        pushMastery(masteryAtkDetail.hiddenMastery, 'masteryAtk_hidden', 'Maestria', masteryAtkDetail.hiddenMastery, undefined, hiddenMasteryCalc);
        pushMastery(cannonBallAtk, 'masteryAtk_cannonball', 'ATQ Bala de canhão', cannonBallAtk, ['cannonballAtk']);
        running += masteryAtk;
        nodes.push({ id: 'atkMastery', label: 'ATQ + Maestria', value: running, inputs: [prevId, ...masteryInputs], kind: 'stage' });
      }

      return nodes;
    };

    const totalMin = (statusAtk + floor((aMin + bMin) * propertyMultiplier)) * pAtkMultiplier + masteryAtk;
    const totalMax = (statusAtk + floor((aMax + bMax) * propertyMultiplier)) * pAtkMultiplier + masteryAtk;
    const totalMaxOver = (statusAtk + floor((aMaxOver + bMaxOver) * propertyMultiplier)) * pAtkMultiplier + masteryAtk;

    return {
      totalMin,
      totalMax,
      totalMaxOver,
      propertyMultiplier,
      minAtkSteps: buildAtkSteps(aMin, bMin),
      maxAtkSteps: buildAtkSteps(aMax, bMax),
      maxOverAtkSteps: buildAtkSteps(aMaxOver, bMaxOver),
      minAtkNodes: buildAtkNodes(aMin, bMin, weaMin, bMinResult.nodes),
      maxAtkNodes: buildAtkNodes(aMax, bMax, weaMax, bMaxResult.nodes),
      maxOverAtkNodes: buildAtkNodes(aMaxOver, bMaxOver, weaMaxOver, bMaxOverResult.nodes),
    };
  }

  private applyFinalMultiplier(rawDamage: number) {
    return this.finalMultipliers.reduce((dmg, finalMultiplier) => {
      return floor(dmg * this.toPercent(finalMultiplier + 100));
    }, rawDamage);
  }

  private calcPhysicalSkillDamage(params: {
    skillData: AtkSkillModel;
    baseSkillDamage: number;
    weaponPropertyAtk: ElementType;
    sizePenalty: number;
    formulaParams?: AtkSkillFormulaInput;
  }): DamageResultModel {
    const { skillData, baseSkillDamage, weaponPropertyAtk, sizePenalty, formulaParams } = params;
    const {
      name: skillName,
      element,
      canCri: canCriFn,
      isMelee: _isMelee,
      isHDefToSDef = false,
      isIgnoreDef = false,
      isIgnoreSDef = false,
      isIgnoreRes = false,
      isExcludeCannanball = false,
      finalDmgFormula,
      forceCri = false,
    } = skillData;
    this.skillName = skillName;
    const { criDmgPercentage = 1 } = skillData;
    const _canCri = typeof canCriFn === 'function' ? canCriFn(formulaParams) : canCriFn;
    const canCri = this.isForceSkillCri || _canCri || forceCri;
    const { reducedHardDef, finalDmgReduction, finalSoftDef, resReduction, restRes } = this.getPhisicalDefData();
    const hardDef = isIgnoreDef || isHDefToSDef ? 1 : finalDmgReduction;
    const softDef = isIgnoreSDef ? 0 : finalSoftDef + (isHDefToSDef ? reducedHardDef : 0);

    const { range, melee, criDmg } = this.totalBonus;
    const isMelee = _isMelee != null && typeof _isMelee === 'function' ? _isMelee(this.weaponData.data.typeName) : !!_isMelee;
    const ranged = isMelee ? melee : range;
    const rangedMultiplier = this.toPercent(ranged + 100);
    const baseSkillMultiplier = this.toPercent(baseSkillDamage);
    const equipSkillBonus = this.getSkillBonus(skillName);
    const equipSkillMultiplier = this.toPercent(100 + equipSkillBonus);
    const criDmgToMonster = criDmg * criDmgPercentage || 0;
    const criMultiplier = canCri ? this.toPercent(criDmgToMonster + 100) : 1;

    const dmgType = isMelee ? SkillType.MELEE : SkillType.RANGE;
    const advKatar = 100 + this.getAdvanceKatar();
    const debuffMultiplier = this.getDebuffMultiplier(dmgType);
    const finalDmgMultipliers = [advKatar].map((b) => this.toPercent(b));
    const infoForClass = this.infoForClass;

    // `trace`, when passed, records the running total after every step in pt-BR —
    // used only by the two calls (rawMaxDamage/rawMinDamage) that feed the displayed
    // skillMinDamage/skillMaxDamage, so the HUD can show the real per-hit formula
    // instead of an approximation. Every other call (rawMinNoCri/rawMaxNoCri) omits it.
    const skillBonusKey = String(SKILL_ID_BY_NAME[skillName] ?? skillName);
    const debuffKeys = ['raid', 'gravitation', ...(isMelee ? ['quake', 'darkClaw'] : ['quake', 'sporeExplosion', 'oleumSanctum'])];

    // Also builds the node-graph view (`graphNodes`) when passed — a 1:1 mirror of the
    // `trace` steps below, `emit()` recording both at once so they can never drift.
    // `atkNodes` (the calcTotalAtk-built ATK sub-graph) is spliced in front, same as
    // `atkSteps` is for `trace`.
    const skillFormula = (_totalAtk: number, _calcCri: boolean, trace?: DamageFormulaStep[], atkSteps?: DamageFormulaStep[], graphNodes?: DamageFormulaNode[], atkNodes?: DamageFormulaNode[]) => {
      const push = (label: string, value: number, keys?: string[]) => trace?.push({ label, value, keys });
      // `lastStageId` (not simply "the last pushed node") tracks the previous *stage*,
      // since a plain `input` node (e.g. 'restRes', pushed right before the stage that
      // consumes it) must never become its own consumer's chain-predecessor.
      let lastStageId: string | undefined;
      // `multiplier` is the raw factor this stage applied (1.25 for +25%); it's stored on
      // the node as a percentage bonus so the UI can show the "%" chip explaining the
      // stage's delta. Omit it for stages that aren't a percentage (soft DEF subtraction).
      // The percentage always comes from the same bonus keys as the stage itself.
      const emit = (id: string, label: string, value: number, keys?: string[], opts: { extraInputs?: string[]; multiplier?: number } = {}) => {
        if (!graphNodes) return;
        const { extraInputs = [], multiplier } = opts;
        graphNodes.push({
          id,
          label,
          value,
          keys,
          percent: multiplier == null ? undefined : this.toPercentBonus(multiplier),
          inputs: [...(lastStageId ? [lastStageId] : []), ...extraInputs],
          kind: 'stage',
        });
        lastStageId = id;
      };

      // ATK is an integer in-game before the damage multipliers, so floor it up
      // front. The previous code only floored it implicitly via the first
      // `floor(total * criMultiplier)` step, which equals floor(ATK) only when
      // criMultiplier is 1 (no crit-damage gear). With crit-damage gear the
      // fractional ATK leaked into the crit multiplier and inflated everything
      // downstream — verified against in-game replay (Focused Arrow Strike).
      let total = floor(this._class.modifyFinalAtk(_totalAtk, infoForClass));
      if (trace) {
        if (atkSteps?.length) {
          trace.push(...atkSteps);
          const lastAtkStep = atkSteps[atkSteps.length - 1].value;
          // `total` is always floor()'d, but the ATQ steps' last entry can be
          // fractional (P.ATQ% isn't floored — see calcTotalAtk) — compare against
          // the floored value too, or every P.ATQ build would falsely show a "class
          // adjustment" row for classes whose modifyFinalAtk is really just a no-op.
          if (total !== floor(lastAtkStep)) push('ATQ (ajuste de classe)', total);
        } else {
          push('ATQ', total, ['atk', 'atkPercent']);
        }
      }
      if (graphNodes) {
        if (atkNodes?.length) {
          graphNodes.push(...atkNodes);
          const lastAtkNode = atkNodes[atkNodes.length - 1];
          lastStageId = lastAtkNode.id;
          if (total !== floor(lastAtkNode.value)) emit('atkClassAdjust', 'ATQ (ajuste de classe)', total);
        } else {
          emit('atk', 'ATQ', total, ['atk', 'atkPercent']);
        }
      }
      if (_calcCri) {
        total = floor(total * criMultiplier); // tested
        if (criDmgToMonster !== 0) {
          push(`Dano crítico (equip) ${this.fmtCalc(criDmgToMonster)}%`, total, ['criDmg']);
          emit('critEquip', `Dano crítico (equip) ${this.fmtCalc(criDmgToMonster)}%`, total, ['criDmg'], { multiplier: criMultiplier });
        }
      }
      total = floor(total * rangedMultiplier); // tested
      push(`${isMelee ? 'Corpo a corpo' : 'À distância'} ${this.fmtCalc(ranged)}%`, total, [isMelee ? 'melee' : 'range']);
      emit('ranged', `${isMelee ? 'Corpo a corpo' : 'À distância'} ${this.fmtCalc(ranged)}%`, total, [isMelee ? 'melee' : 'range'], { multiplier: rangedMultiplier });
      total = floor(total * baseSkillMultiplier); // tested
      push(`Hab. Base ${this.fmtCalc(baseSkillDamage)}%`, total, ['flatDmg', `flat_${skillName}`]);
      emit('baseSkillDmg', `Hab. Base ${this.fmtCalc(baseSkillDamage)}%`, total, ['flatDmg', `flat_${skillName}`], { multiplier: baseSkillMultiplier });
      // DEF (res / hard def / soft def) is applied right after the skill ratio,
      // BEFORE the per-skill equipment bonus — verified against in-game replay
      // (Focused Arrow Strike on a soft-def target). Subtracting soft def after
      // equipSkillMultiplier overstated damage (the bonus re-amplified the def).
      if (!isHDefToSDef || isIgnoreRes) {
        total = floor(total * resReduction);
        push('Redução RES', total, ['pene_res']);
        if (graphNodes) graphNodes.push({ id: 'restRes', label: 'RES restante', value: restRes, keys: ['monster_res', 'pene_res'], inputs: [], kind: 'input' });
        emit('resReduction', 'Redução RES', total, ['pene_res'], { extraInputs: ['restRes'], multiplier: resReduction });
      }
      total = floor(total * hardDef);
      push('Redução DEF', total, ['p_pene_race_all', 'p_pene_class_all']);
      if (graphNodes) graphNodes.push({ id: 'reducedHardDef', label: 'DEF restante', value: reducedHardDef, keys: ['p_pene_race_all', 'p_pene_class_all'], inputs: [], kind: 'input' });
      emit('defReduction', 'Redução DEF', total, ['p_pene_race_all', 'p_pene_class_all'], { extraInputs: ['reducedHardDef'], multiplier: hardDef });
      total = total - softDef; // tested
      // No keys: this is the monster's own soft DEF stat, not an equipment bonus.
      push(`DEF -${this.fmtCalc(softDef)}`, total);
      emit('softDef', `DEF -${this.fmtCalc(softDef)}`, total);
      total = floor(total * equipSkillMultiplier);
      if (equipSkillBonus !== 0) {
        push(`Bônus Hab. equip ${this.fmtCalc(equipSkillBonus)}%`, total, [skillBonusKey]);
        emit('equipSkillBonus', `Bônus Hab. equip ${this.fmtCalc(equipSkillBonus)}%`, total, [skillBonusKey], { multiplier: equipSkillMultiplier });
      }
      if (_calcCri) {
        total = floor(total * this.criMultiplier);
        // criMultiplier = _BASE_CRI_MULTIPLIER (140%) + traitBonus.cRate% (the "T.CRÍT"
        // trait stat shown in the main summary) — broken out here so the trait's actual
        // contribution is visible, not folded into one opaque combined percentage.
        push(`Crítico base ${this.fmtCalc(round(this._BASE_CRI_MULTIPLIER * 100, 0))}% + T.Crít ${this.fmtCalc(this.traitBonus.cRate)}%`, total, ['cRate']);
        emit('critBase', `Crítico base ${this.fmtCalc(round(this._BASE_CRI_MULTIPLIER * 100, 0))}% + T.Crít ${this.fmtCalc(this.traitBonus.cRate)}%`, total, ['cRate'], { multiplier: this.criMultiplier });
      }

      const beforeFinalMultipliers = total;
      for (const final of finalDmgMultipliers) {
        total = floor(total * final);
      }
      if (total !== beforeFinalMultipliers) {
        push('Multiplicadores finais', total, ['advKatar']);
        emit('finalMultipliers', 'Multiplicadores finais', total, ['advKatar'], { multiplier: finalDmgMultipliers.reduce((a, b) => a * b, 1) });
      }

      total = floor(total * debuffMultiplier);
      if (debuffMultiplier !== 1) {
        push('Debuff no monstro', total, debuffKeys);
        emit('debuff', 'Debuff no monstro', total, debuffKeys, { multiplier: debuffMultiplier });
      }

      total = this.toPreventNegativeDmg(total);

      if (!!finalDmgFormula && typeof finalDmgFormula === 'function') {
        total = finalDmgFormula({ damage: total, ...formulaParams });
      }

      // PVP: the target's own reductions + the WoE-castle global layer are the
      // "última linha" (docs/pvp.md §2) — applied AFTER any custom finalDmgFormula,
      // which may recompute from HP and ignore `damage`, so the cut can't be
      // bypassed. This method only runs for skills, so the channel is "habilidade".
      if (pvpParts) total = this.applyPvpReduction(total, pvpParts, push, emit);

      return total;
    };

    const propertyAtk = element || weaponPropertyAtk;
    // Built once (not per min/max/noCri call of skillFormula, nor per hit) — its inputs
    // are fixed for this skill calc. Also reused by the extraDmgCri cut below.
    const pvpParts = this.pvp.mode !== 'none'
      ? this.getPvpReductionParts({ dmgType: 'physical', isSkill: true, isMelee, attackElement: propertyAtk })
      : null;
    const {
      totalMin,
      totalMax,
      totalMaxOver,
      propertyMultiplier,
      minAtkSteps,
      maxAtkSteps,
      maxOverAtkSteps,
      minAtkNodes,
      maxAtkNodes,
      maxOverAtkNodes,
    } = this.calcTotalAtk({
      propertyAtk,
      sizePenalty,
      isEDP: this.isActiveEDP(skillName),
      isExcludeCannanball,
    });

    const extraDmg = this._class.getAdditionalDmg(infoForClass);
    let extraDmgCri = canCri ? floor(extraDmg * criMultiplier) : extraDmg;
    // PVP: this class "additional damage" is added to the skillFormula result
    // (which already carries the reduction), so it must take the same última-linha
    // cut — otherwise it stays at 100% inside a castle. No-op vs monsters.
    if (pvpParts) {
      extraDmgCri = floor(extraDmgCri * pvpParts.defender * pvpParts.woe);
    }

    const pushGraphStage = (graphNodes: DamageFormulaNode[], id: string, label: string, value: number) => {
      const prevId = graphNodes.length ? graphNodes[graphNodes.length - 1].id : undefined;
      graphNodes.push({ id, label, value, inputs: prevId ? [prevId] : [], kind: 'stage' });
    };

    // Post-processing steps below (extra flat damage, per-class hit adjustment, aura
    // reduction) happen outside skillFormula() itself — appended to the same trace/graph
    // so their last entry always equals the true final minDamage/maxDamage.
    const appendPostSteps = (trace: DamageFormulaStep[], graphNodes: DamageFormulaNode[], rawDamage: number, finalDamage: number) => {
      if (extraDmgCri) {
        trace.push({ label: `Dano extra +${this.fmtCalc(extraDmgCri)}`, value: rawDamage });
        pushGraphStage(graphNodes, 'extraDmg', `Dano extra +${this.fmtCalc(extraDmgCri)}`, rawDamage);
      }
      const hitAdjusted = this._class.calcSkillDmgByTotalHit({ info: this.infoForClass, finalDamage: rawDamage, skill: skillData });
      if (hitAdjusted !== rawDamage) {
        trace.push({ label: 'Ajuste por golpes', value: hitAdjusted });
        pushGraphStage(graphNodes, 'hitAdjust', 'Ajuste por golpes', hitAdjusted);
      }
      if (finalDamage !== hitAdjusted) {
        trace.push({ label: 'Redução de aura (99,9%)', value: finalDamage });
        pushGraphStage(graphNodes, 'auraReduction', 'Redução de aura (99,9%)', finalDamage);
      }
    };

    const maxTrace: DamageFormulaStep[] = [];
    const maxGraph: DamageFormulaNode[] = [];
    const rawMaxDamage = skillFormula(totalMaxOver, canCri, maxTrace, maxOverAtkSteps, maxGraph, maxOverAtkNodes) + extraDmgCri;
    const maxDamage = this.applyAuraReduction(
      this._class.calcSkillDmgByTotalHit({
        info: this.infoForClass,
        finalDamage: rawMaxDamage,
        skill: skillData,
      }),
    );
    appendPostSteps(maxTrace, maxGraph, rawMaxDamage, maxDamage);

    const minTrace: DamageFormulaStep[] = [];
    const minGraph: DamageFormulaNode[] = [];
    const rawMinDamage = canCri
      ? skillFormula(totalMax, canCri, minTrace, maxAtkSteps, minGraph, maxAtkNodes)
      : skillFormula(totalMin, canCri, minTrace, minAtkSteps, minGraph, minAtkNodes);
    const minDamage = this.applyAuraReduction(
      this._class.calcSkillDmgByTotalHit({
        info: this.infoForClass,
        finalDamage: rawMinDamage + extraDmgCri,
        skill: skillData,
      }),
    );
    appendPostSteps(minTrace, minGraph, rawMinDamage + extraDmgCri, minDamage);

    // "Dano sem crít." (skillMinDamageNoCri/skillMaxDamageNoCri below) skips the hit
    // adjustment step (unlike minDamage/maxDamage above) — this mirrors the engine's
    // own rawMinNoCri/rawMaxNoCri exactly, just also recording the intermediate steps.
    const minNoCriTrace: DamageFormulaStep[] = [];
    const maxNoCriTrace: DamageFormulaStep[] = [];
    const minNoCriGraph: DamageFormulaNode[] = [];
    const maxNoCriGraph: DamageFormulaNode[] = [];
    let rawMinNoCri = 0;
    let rawMaxNoCri = 0;
    if (canCri) {
      const minNoCriFormula = skillFormula(totalMin, false, minNoCriTrace, minAtkSteps, minNoCriGraph, minAtkNodes) + extraDmgCri;
      if (extraDmgCri) {
        minNoCriTrace.push({ label: `Dano extra +${this.fmtCalc(extraDmgCri)}`, value: minNoCriFormula });
        pushGraphStage(minNoCriGraph, 'extraDmg', `Dano extra +${this.fmtCalc(extraDmgCri)}`, minNoCriFormula);
      }
      rawMinNoCri = this.applyAuraReduction(minNoCriFormula);
      if (rawMinNoCri !== minNoCriFormula) {
        minNoCriTrace.push({ label: 'Redução de aura (99,9%)', value: rawMinNoCri });
        pushGraphStage(minNoCriGraph, 'auraReduction', 'Redução de aura (99,9%)', rawMinNoCri);
      }

      const maxNoCriFormula = skillFormula(totalMaxOver, false, maxNoCriTrace, maxOverAtkSteps, maxNoCriGraph, maxOverAtkNodes) + extraDmgCri;
      if (extraDmgCri) {
        maxNoCriTrace.push({ label: `Dano extra +${this.fmtCalc(extraDmgCri)}`, value: maxNoCriFormula });
        pushGraphStage(maxNoCriGraph, 'extraDmg', `Dano extra +${this.fmtCalc(extraDmgCri)}`, maxNoCriFormula);
      }
      rawMaxNoCri = this.applyAuraReduction(maxNoCriFormula);
      if (rawMaxNoCri !== maxNoCriFormula) {
        maxNoCriTrace.push({ label: 'Redução de aura (99,9%)', value: rawMaxNoCri });
        pushGraphStage(maxNoCriGraph, 'auraReduction', 'Redução de aura (99,9%)', rawMaxNoCri);
      }
    }

    return {
      minDamage,
      maxDamage,
      avgNoCriDamage: round((rawMinNoCri + rawMaxNoCri) / 2, 0),
      rawMinNoCri,
      rawMaxNoCri,
      avgCriDamage: round((minDamage + maxDamage) / 2, 0),
      propertyAtk,
      propertyMultiplier,
      sizePenalty,
      canCri,
      criDmgToMonster,
      skillFormulaTrace: { min: minTrace, max: maxTrace },
      skillFormulaTraceNoCri: canCri ? { min: minNoCriTrace, max: maxNoCriTrace } : undefined,
      skillFormulaGraph: { min: { nodes: minGraph }, max: { nodes: maxGraph } },
      skillFormulaGraphNoCri: canCri ? { min: { nodes: minNoCriGraph }, max: { nodes: maxNoCriGraph } } : undefined,
    };
  }

  private getStatusMatk() {
    const { totalDex, totalLuk, totalInt, totalSpl } = this.status;
    const baseLvl = this.model.level;
    const priStat = floor(totalInt / 2) + floor(totalDex / 5) + floor(totalLuk / 3);

    return floor(floor(baseLvl / 4) + totalInt + priStat) + totalSpl * 5;
  }

  private getExtraMatk() {
    const equipAtk = this.totalBonus.matk;

    return equipAtk + this._class.getMasteryMatk(this.infoForClass);
  }

  private getWeaponMatk() {
    const { baseWeaponMatk, baseWeaponLevel, refineBonus, overUpgradeBonus, highUpgradeBonus } = this.weaponData.data;
    const rawWeaponMATK = baseWeaponMatk + refineBonus + highUpgradeBonus;
    const variance = round(0.1 * baseWeaponLevel * rawWeaponMATK, 2);
    const isMax = this.isMaximizeSpell;

    let weaponMinMatk = rawWeaponMATK - (isMax ? -variance : variance);
    const weaponMaxMatk = rawWeaponMATK + variance + overUpgradeBonus;

    if (overUpgradeBonus > 0) {
      weaponMinMatk += 1;
    }

    return { weaponMinMatk, weaponMaxMatk, parts: { baseWeaponMatk, baseWeaponLevel, rawWeaponMATK, variance, refineBonus, overUpgradeBonus, highUpgradeBonus } };
  }

  /**
   * Derivation shown when "Maestria (oculta)" is clicked.
   *
   * "Oculta" = it never appears in the game client's own ATQ readout. Each class decides
   * what it is (CharacterBase.calcHiddenMasteryAtk + the per-class getMasteryAtk override);
   * the common shape is flat ATK that only applies against a specific monster race or
   * element — Ranger/Windhawk, for instance, sums `x_race_<race>_atk`. That makes it
   * *target-dependent*: the same build shows a different value against a different monster,
   * which is exactly the confusing part worth spelling out.
   *
   * The contributing rows are found by scanning the skill/buff bonus maps for `x_`
   * attributes naming this monster's race or element. That's attribution for display only —
   * `total` is always the engine's own value, and the note flags it when the rows found
   * don't account for all of it (a class with a rule this scan doesn't model).
   */
  private buildHiddenMasteryCalc(total: number): DamageFormulaCalc {
    const race = String(this.monster.race || '').toLowerCase();
    const element = String(this.monster.elementName || '').toLowerCase().replace(/\s*\d+$/, '');
    // raceUpper, not race: RaceNamePtBr is keyed on the canonical casing ('DemiHuman'),
    // which a naive capitalisation of the lowercase `race` would not reproduce.
    const racePt = racePtBr(this.monster.data.raceUpper);
    const elementPt = elementPtBr(this.monster.elementName);
    const maps = { ...this.masteryAtkSkillBonus, ...this.equipAtkSkillBonus, ...this.buffMasteryAtkBonus };

    const rows: DamageFormulaCalcRow[] = [];
    let found = 0;
    for (const [sourceName, scripts] of Object.entries(maps)) {
      if (!scripts || typeof scripts !== 'object') continue;
      for (const [attr, value] of Object.entries(scripts)) {
        const amount = Number(value) || 0;
        if (!amount || !attr.startsWith('x_') || !attr.endsWith('_atk')) continue;
        const byRace = attr.includes(race);
        if (!byRace && !attr.includes(element)) continue;
        // sourceName is the English skill name the bonus map is keyed by; the dialog
        // swaps it for the pt-BR name + icon.
        rows.push({ label: sourceName, sourceKey: sourceName, hint: `contra ${byRace ? racePt : elementPt}`, display: this.fmtCalc(amount) });
        found += amount;
      }
    }

    rows.push({ label: 'Maestria', display: this.fmtCalc(total), emphasis: true });

    const note =
      rows.length === 1
        ? 'ATQ fixo concedido pela classe, somado no final e não exibido no ATQ do jogo.'
        : found === total
          ? `Só vale contra este alvo (${racePt} / ${elementPt}) — troque o monstro e este valor muda. Somado no final, sem sofrer multiplicadores.`
          : `Depende do alvo atual (${racePt} / ${elementPt}). Parte do valor vem de uma regra da classe não detalhada aqui.`;

    return { rows, note };
  }

  /** Derivation shown when "S.ATQM Status" is clicked — mirrors getStatusMatk() above. */
  private buildStatusMatkCalc(): DamageFormulaCalc {
    const { totalDex, totalLuk, totalInt, totalSpl } = this.status;
    const baseLvl = this.model.level;
    const priStat = floor(totalInt / 2) + floor(totalDex / 5) + floor(totalLuk / 3);

    return {
      rows: [
        { label: 'Nível base ÷ 4', display: this.fmtCalc(floor(baseLvl / 4)) },
        { label: `INT ${this.fmtCalc(totalInt)}`, display: this.fmtCalc(totalInt) },
        { label: `INT ÷ 2 + DES ÷ 5 + SOR ÷ 3`, display: this.fmtCalc(priStat) },
        { label: `FEI ${this.fmtCalc(totalSpl)} × 5`, display: this.fmtCalc(totalSpl * 5) },
        { label: 'S.ATQM Status', display: this.fmtCalc(this.getStatusMatk()), emphasis: true },
      ],
    };
  }

  /** Derivation shown when "ATQM da Arma" is clicked — mirrors getWeaponMatk() above.
   *  `total` is the min/max variant this particular graph was built for. */
  private buildWeaponMatkCalc(parts: ReturnType<DamageCalculator['getWeaponMatk']>['parts'], total: number): DamageFormulaCalc {
    const rows: DamageFormulaCalcRow[] = [{ label: 'ATQM base da arma', display: this.fmtCalc(parts.baseWeaponMatk) }];
    if (parts.refineBonus) rows.push({ label: 'Bônus de refino', display: this.fmtCalc(parts.refineBonus) });
    if (parts.highUpgradeBonus) rows.push({ label: 'Refino alto', display: this.fmtCalc(parts.highUpgradeBonus) });
    rows.push({ label: 'ATQM bruto', display: this.fmtCalc(parts.rawWeaponMATK) });
    rows.push({ label: `Variação (0,1 × nível ${parts.baseWeaponLevel} × ATQM bruto) ±`, display: this.fmtCalc(parts.variance) });
    if (parts.overUpgradeBonus) rows.push({ label: 'Bônus de sobre-refino', display: this.fmtCalc(parts.overUpgradeBonus) });
    rows.push({ label: 'ATQM da Arma', display: this.fmtCalc(total), emphasis: true });

    return { rows, note: WEAPON_VARIANCE_NOTE };
  }

  private calcMagicalSkillDamage(params: { skillData: AtkSkillModel; baseSkillDamage: number; weaponPropertyAtk: ElementType; formulaParams?: any; }): DamageResultModel {
    const { skillData, baseSkillDamage, weaponPropertyAtk, formulaParams } = params;
    const { name: skillName, element, isIgnoreDef = false, finalDmgFormula } = skillData;
    const { softMDef } = this.monster.data;

    const skillPropertyAtk = element || weaponPropertyAtk;
    // Built once for all min/max invocations of the magic skillFormula below.
    const pvpPartsMagic = this.pvp.mode !== 'none'
      ? this.getPvpReductionParts({ dmgType: 'magical', isSkill: true, isMelee: false, attackElement: skillPropertyAtk })
      : null;
    const { dmgReductionByMHardDef, mresReduction, mDefBypassed, restMres } = this.getMagicalDefData();
    const hardDef = isIgnoreDef ? 1 : dmgReductionByMHardDef;

    const baseSkillMultiplier = this.toPercent(baseSkillDamage);
    const equipSkillBonus = this.getSkillBonus(skillName);
    const equipSkillMultiplier = this.toPercent(100 + equipSkillBonus);
    const finalDmg = this.totalBonus[`final_${skillPropertyAtk?.toLowerCase()}`] || 0;
    const finalDmgMultiplier = this.toPercent(finalDmg + 100);
    const propertyMultiplier = this.getPropertyMultiplier(skillPropertyAtk);

    const elementBonus = (this.totalBonus.m_my_element_all || 0) + (this.totalBonus[`m_my_element_${skillPropertyAtk.toLowerCase()}`] || 0);
    const myElementMultiplier = this.toPercent(100 + elementBonus);
    const matkPercentMultiplier = this.toPercent(100 + this.totalBonus.matkPercent);

    const sMatkMultiplier = 1 + this.traitBonus.sMatk * 0.01;
    const cometMultiplier = this.getCometMultiplier();
    const raceMultiplier = this.toPercent(this.getRaceMultiplier('m'));
    const sizeMultiplier = this.toPercent(this.getSizeMultiplier('m'));
    const elementMultiplier = this.toPercent(this.getElementMultiplier('m'));
    const monsterTypeMultiplier = this.toPercent(this.getMonsterTypeMultiplier('m'));
    const debuffMultiplier = this.getDebuffMultiplier(SkillType.MAGICAL);

    const skillBonusKey = String(SKILL_ID_BY_NAME[skillName] ?? skillName);

    const skillFormula = (totalMatk: number, trace?: DamageFormulaStep[], graphNodes?: DamageFormulaNode[], matkNodes?: DamageFormulaNode[]) => {
      const push = (label: string, value: number, keys?: string[]) => trace?.push({ label, value, keys });
      // `lastStageId` (not simply "the last pushed node") tracks the previous *stage*,
      // since a plain `input` node (e.g. 'restRes', pushed right before the stage that
      // consumes it) must never become its own consumer's chain-predecessor.
      let lastStageId: string | undefined;
      // See the physical skillFormula's emit() for what `multiplier` is and why it's the
      // raw factor rather than a pre-formatted percentage.
      const emit = (id: string, label: string, value: number, keys?: string[], opts: { extraInputs?: string[]; multiplier?: number } = {}) => {
        if (!graphNodes) return;
        const { extraInputs = [], multiplier } = opts;
        graphNodes.push({
          id,
          label,
          value,
          keys,
          percent: multiplier == null ? undefined : this.toPercentBonus(multiplier),
          inputs: [...(lastStageId ? [lastStageId] : []), ...extraInputs],
          kind: 'stage',
        });
        lastStageId = id;
      };

      let total = totalMatk;
      push('MATK', total, ['matk', 'matkPercent']);
      if (graphNodes) {
        if (matkNodes?.length) {
          graphNodes.push(...matkNodes);
          lastStageId = matkNodes[matkNodes.length - 1].id;
        } else {
          emit('matk', 'MATK', total, ['matk', 'matkPercent']);
        }
      }

      // The elemental multiplier (attack property vs the target's defence property,
      // including resist reductions such as [Infecção] / [Intoxicação] / Oratio)
      // scales **MATK**, ahead of the skill ratio — it is not a multiplier on the
      // final damage. Two consequences the in-game numbers confirm: the ratio is
      // applied to the already-boosted MATK, and the target's soft MDEF is taken off
      // *once*, after the boost, instead of being scaled along with it. Locked to the
      // unit by ElementalMaster.poison-replay.spec.ts.
      total = floor(total * propertyMultiplier);
      push('Multiplicador elemental', total, ['vi', 'oratio', 'infection', 'intoxication', 'bitterCold']);
      emit('elementalMultiplier', 'Multiplicador elemental', total, ['vi', 'oratio', 'infection', 'intoxication', 'bitterCold'], { multiplier: propertyMultiplier });
      total = floor(total * sMatkMultiplier);
      push('S.ATQM', total, ['sMatk']);
      emit('sMatk', 'S.ATQM', total, ['sMatk'], { multiplier: sMatkMultiplier });
      total = floor(total * raceMultiplier);
      push('Raça', total, ['m_race_all']);
      emit('race', 'Raça', total, ['m_race_all'], { multiplier: raceMultiplier });
      total = floor(total * sizeMultiplier);
      push('Tamanho', total, ['m_size_all']);
      emit('size', 'Tamanho', total, ['m_size_all'], { multiplier: sizeMultiplier });
      total = floor(total * elementMultiplier); //tested
      push('Elemento do monstro', total, ['m_element_all']);
      emit('element', 'Elemento do monstro', total, ['m_element_all'], { multiplier: elementMultiplier });
      total = floor(total * monsterTypeMultiplier);
      push('Classe do monstro', total, ['m_class_all']);
      emit('monsterType', 'Classe do monstro', total, ['m_class_all'], { multiplier: monsterTypeMultiplier });
      total = floor(total * matkPercentMultiplier); //tested
      push(`ATQM ${this.fmtCalc(this.totalBonus.matkPercent || 0)}%`, total, ['matkPercent']);
      emit('matkPercent', `ATQM ${this.fmtCalc(this.totalBonus.matkPercent || 0)}%`, total, ['matkPercent'], { multiplier: matkPercentMultiplier });
      total = floor(total * cometMultiplier);
      if (cometMultiplier !== 1) {
        push('Cometa', total, ['comet']);
        emit('comet', 'Cometa', total, ['comet'], { multiplier: cometMultiplier });
      }

      total = floor(total * baseSkillMultiplier); //tested
      push(`Hab. Base ${this.fmtCalc(baseSkillDamage)}%`, total, ['flatDmg', `flat_${skillName}`]);
      emit('baseSkillDmg', `Hab. Base ${this.fmtCalc(baseSkillDamage)}%`, total, ['flatDmg', `flat_${skillName}`], { multiplier: baseSkillMultiplier });

      total = floor(total * myElementMultiplier); //tested
      if (myElementMultiplier !== 1) {
        push('Bônus elemento próprio', total, ['m_my_element_all']);
        emit('myElement', 'Bônus elemento próprio', total, ['m_my_element_all'], { multiplier: myElementMultiplier });
      }
      total = floor(total * mresReduction);
      push('Redução RESM', total, ['pene_mres']);
      if (graphNodes) graphNodes.push({ id: 'restMres', label: 'RESM restante', value: restMres, keys: ['monster_mres', 'pene_mres'], inputs: [], kind: 'input' });
      emit('resReductionM', 'Redução RESM', total, ['pene_mres'], { extraInputs: ['restMres'], multiplier: mresReduction });
      total = floor(total * round(hardDef, 4)); //tested
      push('Redução DEFM', total, ['m_pene_race_all', 'm_pene_class_all']);
      if (graphNodes) graphNodes.push({ id: 'mDefBypassed', label: 'MDEF restante', value: mDefBypassed, keys: ['m_pene_race_all', 'm_pene_class_all'], inputs: [], kind: 'input' });
      emit('defReductionM', 'Redução DEFM', total, ['m_pene_race_all', 'm_pene_class_all'], { extraInputs: ['mDefBypassed'], multiplier: round(hardDef, 4) });
      total = total - softMDef; //tested
      // No keys: this is the monster's own soft MDEF stat, not an equipment bonus.
      push(`DEFM -${this.fmtCalc(softMDef)}`, total);
      emit('softDefM', `DEFM -${this.fmtCalc(softMDef)}`, total);
      total = floor(total * equipSkillMultiplier);
      if (equipSkillBonus !== 0) {
        push(`Bônus Hab. equip ${this.fmtCalc(equipSkillBonus)}%`, total, [skillBonusKey]);
        emit('equipSkillBonus', `Bônus Hab. equip ${this.fmtCalc(equipSkillBonus)}%`, total, [skillBonusKey], { multiplier: equipSkillMultiplier });
      }
      total = floor(total * finalDmgMultiplier);
      if (finalDmgMultiplier !== 1) {
        push('Dano final por elemento', total, [`final_${skillPropertyAtk?.toLowerCase()}`]);
        emit('finalDmgByElement', 'Dano final por elemento', total, [`final_${skillPropertyAtk?.toLowerCase()}`], { multiplier: finalDmgMultiplier });
      }
      const beforeFinalMultipliers = total;
      total = this.applyFinalMultiplier(total);
      if (total !== beforeFinalMultipliers) {
        push('Multiplicadores finais', total);
        emit('finalMultipliers', 'Multiplicadores finais', total);
      }
      total = floor(total * debuffMultiplier);
      if (debuffMultiplier !== 1) {
        push('Debuff no monstro', total, ['raid', 'gravitation']);
        emit('debuff', 'Debuff no monstro', total, ['raid', 'gravitation'], { multiplier: debuffMultiplier });
      }

      if (!!finalDmgFormula && typeof finalDmgFormula === 'function') {
        total = finalDmgFormula({ damage: total, ...formulaParams });
      } else {
        total = this.toPreventNegativeDmg(total);
      }

      // PVP: magic is always the "habilidade" channel (docs/pvp.md §2). Applied
      // AFTER any custom finalDmgFormula (which may recompute from HP and ignore
      // `damage`) so the última-linha cut can't be bypassed.
      if (pvpPartsMagic) total = this.applyPvpReduction(total, pvpPartsMagic, push, emit);

      return total;
    };

    const totalStatusMatk = this.getStatusMatk();
    const extraMatk = this.getExtraMatk();
    const { weaponMinMatk, weaponMaxMatk, parts: weaponMatkParts } = this.getWeaponMatk();

    const rawMatk = extraMatk + totalStatusMatk * this.myticalAmp;

    // Built once, not once per min/max call below — it takes no arguments and so is
    // provably identical for both. (buildWeaponMatkCalc does vary, so it stays inside.)
    const statusMatkCalc = this.buildStatusMatkCalc();

    // Node-graph inputs feeding the 'MATK' stage — statusMatk/weaponMatk/extraMatk are
    // verbatim internal values from getStatusMatk/getWeaponMatk/getExtraMatk (first-ever
    // MATK decomposition; these three getters previously only fed one lumped number).
    const buildMatkNodes = (weaponMatkValue: number): DamageFormulaNode[] => {
      const nodes: DamageFormulaNode[] = [];
      nodes.push({ id: 'statusMatk', label: 'S.ATQM Status (INT/DEX/LUK/SPL)', value: totalStatusMatk, inputs: [], kind: 'input', calc: statusMatkCalc });
      nodes.push({ id: 'weaponMatk', label: 'ATQM da Arma', value: weaponMatkValue, inputs: [], kind: 'input', calc: this.buildWeaponMatkCalc(weaponMatkParts, weaponMatkValue) });
      const mysticAmpBonus = this.totalBonus['mysticAmp'] || 0;
      const statusWeaponSum = (totalStatusMatk + weaponMatkValue) * this.myticalAmp;
      nodes.push({
        id: 'matkMysticAmp',
        label: mysticAmpBonus ? `ATQM Status+Arma x Amp. Mística ${this.fmtCalc(mysticAmpBonus)}%` : 'ATQM Status + Arma',
        value: statusWeaponSum,
        keys: mysticAmpBonus ? ['mysticAmp'] : undefined,
        percent: mysticAmpBonus ? this.toPercentBonus(this.myticalAmp) : undefined,
        inputs: ['statusMatk', 'weaponMatk'],
        kind: 'stage',
      });
      const matkInputs = ['matkMysticAmp'];
      if (extraMatk) {
        nodes.push({ id: 'extraMatk', label: 'ATQM Equip./Maestria', value: extraMatk, keys: ['matk'], inputs: [], kind: 'input' });
        matkInputs.push('extraMatk');
      }
      nodes.push({ id: 'matk', label: 'MATK', value: statusWeaponSum + extraMatk, keys: ['matk', 'matkPercent'], inputs: matkInputs, kind: 'stage' });
      return nodes;
    };

    const maxTrace: DamageFormulaStep[] = [];
    const minTrace: DamageFormulaStep[] = [];
    const maxGraph: DamageFormulaNode[] = [];
    const minGraph: DamageFormulaNode[] = [];
    const weaponMinDmg = skillFormula(weaponMinMatk * this.myticalAmp + rawMatk, minTrace, minGraph, buildMatkNodes(weaponMinMatk));
    const weaponMaxDmg = skillFormula(weaponMaxMatk * this.myticalAmp + rawMatk, maxTrace, maxGraph, buildMatkNodes(weaponMaxMatk));

    // Post-processing (per-class hit adjustment, aura reduction) happens outside
    // skillFormula() — appended so the trace's last entry always equals the true final.
    const appendPostSteps = (trace: DamageFormulaStep[], graphNodes: DamageFormulaNode[], rawDamage: number, finalDamage: number) => {
      const pushGraphStage = (id: string, label: string, value: number) => {
        const prevId = graphNodes.length ? graphNodes[graphNodes.length - 1].id : undefined;
        graphNodes.push({ id, label, value, inputs: prevId ? [prevId] : [], kind: 'stage' });
      };
      const hitAdjusted = this._class.calcSkillDmgByTotalHit({ info: this.infoForClass, finalDamage: rawDamage, skill: skillData });
      if (hitAdjusted !== rawDamage) {
        trace.push({ label: 'Ajuste por golpes', value: hitAdjusted });
        pushGraphStage('hitAdjust', 'Ajuste por golpes', hitAdjusted);
      }
      if (finalDamage !== hitAdjusted) {
        trace.push({ label: 'Redução de aura (99,9%)', value: finalDamage });
        pushGraphStage('auraReduction', 'Redução de aura (99,9%)', finalDamage);
      }
    };

    const rawMaxDamage = weaponMaxDmg;
    const maxDamage = this.applyAuraReduction(
      this._class.calcSkillDmgByTotalHit({
        info: this.infoForClass,
        finalDamage: rawMaxDamage,
        skill: skillData,
      }),
    );
    appendPostSteps(maxTrace, maxGraph, rawMaxDamage, maxDamage);

    const rawMinDamage = weaponMinDmg;
    const minDamage = this.applyAuraReduction(
      this._class.calcSkillDmgByTotalHit({
        info: this.infoForClass,
        finalDamage: rawMinDamage,
        skill: skillData,
      }),
    );
    appendPostSteps(minTrace, minGraph, rawMinDamage, minDamage);

    // console.log({
    //   skillPropertyAtk,
    //   myElementMultiplier,
    //   elementBonus,
    //   totalStatusMatk,
    //   extraMatk,
    //   equipSkillMultiplier,
    //   weaponMinMatk,
    //   weaponMaxMatk,
    //   weaponMinDmg,
    //   weaponMaxDmg,
    // });

    return {
      propertyAtk: skillPropertyAtk,
      propertyMultiplier,
      minDamage,
      maxDamage,
      rawMinNoCri: minDamage,
      rawMaxNoCri: maxDamage,
      avgNoCriDamage: 0,
      avgCriDamage: 0,
      sizePenalty: 1,
      canCri: false,
      criDmgToMonster: 0,
      skillFormulaTrace: { min: minTrace, max: maxTrace },
      skillFormulaGraph: { min: { nodes: minGraph }, max: { nodes: maxGraph } },
    };
  }

  private calcBasicDamage(params: { totalMin: number; totalMax: number; }) {
    const { totalMax, totalMin } = params;
    const { range, melee, dmg } = this.totalBonus;
    const isRangeType = this.isRangeAtk();
    const dmgType = isRangeType ? SkillType.RANGE : SkillType.MELEE;
    const rangedDmg = isRangeType ? range : melee;
    const rangedMultiplier = this.toPercent(rangedDmg + 100);
    const advKatarMultiplier = (100 + this.getAdvanceKatar()) / 100;
    const debuffMultiplier = this.getDebuffMultiplier(dmgType);
    const dmgMultiplier = this.toPercent(dmg + this.getFlatDmg('basicAtk') + 100);
    const extraDmg = this._class.getAdditionalDmg(this.infoForClass);
    const extraBasicDmg = this._class.getAdditionalBasicDmg(this.infoForClass);

    const { finalDmgReduction, finalSoftDef, resReduction } = this.getPhisicalDefData();
    const hardDef = finalDmgReduction;
    const softDef = finalSoftDef;

    // Basic damage has no formula graph to split into, so combine the two PVP
    // reduction layers into a single multiplier (1 when no player target).
    const pvpParts = this.getPvpReductionParts({ dmgType: 'physical', isSkill: false, isMelee: !isRangeType, attackElement: this.basicPropertyAtk });
    const pvpMult = pvpParts.defender * pvpParts.woe;

    const formula = (totalAtk: number, isCalcDef = true) => {
      let total = floor(totalAtk * rangedMultiplier);
      total = floor(total * dmgMultiplier);
      total = floor(total * resReduction);
      if (isCalcDef) total = floor(total * hardDef);
      if (isCalcDef) total = total - softDef;
      total = floor(total * advKatarMultiplier);
      total = floor(total * debuffMultiplier);
      total = floor(total * pvpMult); // PVP: última linha (1 when no player target)

      return this.toPreventNegativeDmg(total);
    };

    const basicMinDamage = this.applyAuraReduction(formula(totalMin + extraDmg + extraBasicDmg));
    const basicMaxDamage = this.applyAuraReduction(formula(totalMax + extraDmg + extraBasicDmg));

    return { basicMinDamage, basicMaxDamage };
  }

  private calcBasicCriDamage(params: { totalMaxAtk: number; totalMaxAtkOver: number; }) {
    const { totalMaxAtk, totalMaxAtkOver } = params;
    const { range, melee, criDmg, dmg } = this.totalBonus;

    const bonusCriDmgMultiplier = this.toPercent((criDmg || 0) + 100);
    const isRangeType = this.isRangeAtk();
    const dmgType = isRangeType ? SkillType.RANGE : SkillType.MELEE;
    const rangedDmg = isRangeType ? range : melee;
    const advKatarMultiplier = (100 + this.getAdvanceKatar()) / 100;
    const debuffMultiplier = this.getDebuffMultiplier(dmgType);
    const rangedMultiplier = this.toPercent(rangedDmg + 100);
    const dmgMultiplier = this.toPercent(dmg + this.getFlatDmg('basicAtk') + 100);
    const extraDmg = this._class.getAdditionalDmg(this.infoForClass) * this.criMultiplier;
    const extraBasic = this._class.getAdditionalBasicDmg(this.infoForClass);

    const { finalDmgReduction, finalSoftDef, resReduction } = this.getPhisicalDefData();
    const hardDef = finalDmgReduction;
    const softDef = finalSoftDef;

    // Basic damage has no formula graph to split into, so combine the two PVP
    // reduction layers into a single multiplier (1 when no player target).
    const pvpParts = this.getPvpReductionParts({ dmgType: 'physical', isSkill: false, isMelee: !isRangeType, attackElement: this.basicPropertyAtk });
    const pvpMult = pvpParts.defender * pvpParts.woe;

    const formula = (totalAtk: number, isCalcDef = true) => {
      let total = floor(totalAtk * bonusCriDmgMultiplier);
      total = floor(total * rangedMultiplier);
      if (isCalcDef) total = total * dmgMultiplier;
      total = floor(total * resReduction);
      total = floor(total * hardDef);
      total = floor(total * advKatarMultiplier);
      if (isCalcDef) total = total - softDef;
      total = floor(total * this.criMultiplier);
      total = floor(total * debuffMultiplier);
      total = floor(total * pvpMult); // PVP: última linha (1 when no player target)

      return this.toPreventNegativeDmg(total);
    };

    // extraDmg is added outside `formula`, so it must take the PVP última-linha
    // cut too (pvpMult is exactly 1 vs monsters, so this is a no-op there).
    const criMinDamage = this.applyAuraReduction(formula(totalMaxAtk) + extraDmg * pvpMult + formula(extraBasic, false));
    const criMaxDamage = this.applyAuraReduction(formula(totalMaxAtkOver) + extraDmg * pvpMult + formula(extraBasic, false));

    return { criMinDamage, criMaxDamage, sizePenalty: 100 };
  }

  calculateAllDamages(args: { skillValue: string; propertyAtk: ElementType; maxHp: number; maxSp: number; }): DamageSummaryModel {
    const { skillValue, propertyAtk, maxHp, maxSp } = args;
    this.basicPropertyAtk = propertyAtk;
    const sizePenalty = this.getSizePenalty();
    const { totalMin, totalMax, totalMaxOver, propertyMultiplier } = this.calcTotalAtk({
      propertyAtk,
      sizePenalty,
      isEDP: this.isActiveEDP(''),
      isExcludeCannanball: true,
    });

    const { basicMinDamage, basicMaxDamage } = this.calcBasicDamage({ totalMin: totalMin, totalMax: totalMaxOver });
    const { criMinDamage, criMaxDamage } = this.calcBasicCriDamage({
      totalMaxAtk: totalMax,
      totalMaxAtkOver: totalMaxOver,
    });

    const criShield = this.monster.data.criShield;
    const misc = this.getMiscData();
    const actualBasicCriRate = this.getBaseCriRate(true);
    const basicAspd = this.getBasicAspd();
    const criRateToMonster = Math.max(0, actualBasicCriRate + this.getExtraCriRateToMonster() - criShield);
    const basicDps = calcDmgDps({
      accRate: misc.accuracy,
      cri: criRateToMonster,
      criDmg: floor((criMinDamage + criMaxDamage) / 2),
      hitsPerSec: basicAspd.hitsPerSec,
      max: basicMaxDamage,
      min: basicMinDamage,
    });

    const { pAtk, sMatk, cRate } = this.traitBonus;
    const basicDmg: BasicDamageSummaryModel = {
      basicMinDamage,
      basicMaxDamage,
      criMinDamage,
      criMaxDamage,
      sizePenalty: floor(sizePenalty * 100, 0),
      propertyAtk,
      propertyMultiplier,
      basicCriRate: this.getBaseCriRate(),
      criRateToMonster,
      totalPene: this.isActiveInfilltration ? 100 : this.getTotalPhysicalPene(),
      accuracy: misc.accuracy,
      basicDps,
      pAtk,
      sMatk,
      cRate,
    };

    const [, _skillName, skillLevelStr] = skillValue?.match(/(.+)==(\d+)/) ?? [];
    const skillData = this._class.atkSkills.find((a) => a.value === skillValue || a.levelList?.findIndex((b) => b.value === skillValue) >= 0);
    const isValidSkill = !!_skillName && !!skillLevelStr && typeof skillData?.formula === 'function';

    if (!isValidSkill) return { basicDmg, misc, basicAspd };

    const skillLevel = Number(skillLevelStr);
    const {
      formula,
      part2,
      baseCri: baseSkillCri = 0,
      isMatk,
      isMelee: _isMelee,
      autoSpellChance = 1,
      isHit100,
      isIgnoreDef = false,
      totalHit: _totalHit = 1,
      name: skillName,
      baseCriPercentage = 1,
      customFormula,
      getElement,
      currentHpFn,
      currentSpFn,
      maxStack = 0,
      forceCri = false,
      verifyItemFn,
    } = skillData;

    const currentHp = typeof currentHpFn === 'function' ? currentHpFn(maxHp) : 0;
    const currentSp = typeof currentSpFn === 'function' ? currentSpFn(maxSp) : 0;
    const formulaParams: AtkSkillFormulaInput = {
      ...this.infoForClass,
      skillLevel,
      maxHp,
      maxSp,
      currentHp,
      currentSp,
      stack: maxStack,
    };


    const invalidMsg = verifyItemFn && typeof verifyItemFn === 'function' ? verifyItemFn(formulaParams) : '';
    if (invalidMsg) {
      basicDmg.requireTxt = invalidMsg;
      return { basicDmg, misc, basicAspd, skillDmg: { ...this.zeroSkillDmg } };
    }

    const _baseSkillDamage = formula(formulaParams) + this.getFlatDmg(skillName);
    // The skill ratio is truncated in-game (the server casts it to int), so use a
    // plain floor here rather than the float-correcting `floor()` helper. Formulas
    // that scale by `baseLevel/100` underflow in JS (e.g. Hawk Rush 1040×1.5×2.3 =
    // 3587.9999999999995 instead of 3588); `floor()` rounds that back up to 3588,
    // which is one ratio-point higher than the game and inflated the damage.
    // Verified against in-game replay: Hawk Rush (ratio 3607, not 3608) matches,
    // Focused Arrow Strike (ratio 4160, no underflow) is unchanged.
    let baseSkillDamage = Math.floor(_baseSkillDamage);

    const _NoStackbaseSkillDamage = formula({ ...formulaParams, stack: 0 }) + this.getFlatDmg(skillName);
    const noStackNaseSkillDamage = Math.floor(_NoStackbaseSkillDamage);

    const params = {
      baseSkillDamage,
      skillData,
      weaponPropertyAtk: typeof getElement === 'function' && !!getElement ? getElement(skillValue) : propertyAtk,
      sizePenalty,
      formulaParams,
    };

    let calculated: DamageResultModel;
    let noStackMaxCriDamage = 0;
    let noStackMaxDamage = 0;
    let noStackMinCriDamage = 0;
    let noStackMinDamage = 0;

    if (skillName === 'Fist Spell' && typeof skillData.treatedAsSkillNameFn === 'function') {
      const newSkillValue = skillData.treatedAsSkillNameFn(skillValue);
      const newSkillData = this._class.atkSkills.find((a) => a.value === newSkillValue || a.levelList?.findIndex((b) => b.value === newSkillValue) >= 0);
      if (newSkillData) {
        calculated = this.calcMagicalSkillDamage({
          ...params,
          skillData: {
            ...params.skillData,
            formula: newSkillData.formula,
            name: newSkillData.name,
          },
        });
      }
    } else if (customFormula && typeof customFormula === 'function') {
      const skillPropertyAtk = typeof getElement === 'function' ? getElement(skillValue) : skillData.element || propertyAtk;
      const propertyMultiplier = this.getPropertyMultiplier(skillPropertyAtk);

      const d = customFormula({
        ...formulaParams,
        baseSkillDamage,
        sizePenalty,
        propertyMultiplier,
        ...this.getPhisicalDefData(),
      });
      calculated = {
        canCri: false,
        minDamage: d,
        maxDamage: d,
        rawMinNoCri: d,
        rawMaxNoCri: d,
        propertyAtk: skillPropertyAtk,
        propertyMultiplier: propertyMultiplier,
        avgCriDamage: d,
        avgNoCriDamage: d,
        criDmgToMonster: d,
        sizePenalty,
      };
    } else {
      calculated = isMatk ? this.calcMagicalSkillDamage(params) : this.calcPhysicalSkillDamage(params);

      if (maxStack > 0) {
        const noStackParam = { ...params, baseSkillDamage: noStackNaseSkillDamage };
        const noStackCalculated = isMatk ? this.calcMagicalSkillDamage(noStackParam) : this.calcPhysicalSkillDamage(noStackParam);
        noStackMinDamage = noStackCalculated.rawMinNoCri;
        noStackMaxDamage = noStackCalculated.rawMaxNoCri;
        noStackMaxCriDamage = noStackCalculated.minDamage;
        noStackMinCriDamage = noStackCalculated.maxDamage;
      }
    }

    let { minDamage, maxDamage } = calculated;
    let skillPart2Label = '';
    let skillMinDamage2 = 0;
    let skillMaxDamage2 = 0;
    if (typeof part2?.formula === 'function') {
      const { formula: formula2, isMatk: isPart2Matk, isIncludeMain, label } = part2;
      const _baseSkillDamage2 =
        formula2({
          ...this.infoForClass,
          skillLevel,
          maxHp,
          maxSp,
        }) + this.getFlatDmg(skillName);
      const baseSkillDamage2 = floor(_baseSkillDamage2);
      baseSkillDamage += baseSkillDamage2;

      const params2 = {
        baseSkillDamage: baseSkillDamage2,
        skillData: { ...skillData, ...part2 },
        weaponPropertyAtk: propertyAtk,
        sizePenalty,
        skillLevel,
      };

      const calcPart2 = isPart2Matk ? this.calcMagicalSkillDamage(params2) : this.calcPhysicalSkillDamage(params2);

      if (isIncludeMain) {
        minDamage += calcPart2.minDamage;
        maxDamage += calcPart2.maxDamage;
      } else {
        skillPart2Label = label;
        skillMinDamage2 = calcPart2.minDamage;
        skillMaxDamage2 = calcPart2.maxDamage;
      }
    }

    const skillAspd = calcSkillAspd({ skillData, status: this.status, totalEquipStatus: this.totalBonus, skillLevel });

    const isKatar = this.weaponData.data?.typeName === 'katar';
    let actualCri = calculated.canCri
      ? isKatar
        ? Math.max(0, floor(actualBasicCriRate + baseSkillCri - criShield) * baseCriPercentage)
        : Math.max(0, floor((actualBasicCriRate + baseSkillCri) * baseCriPercentage) - criShield)
      : 0;
    if (this.isForceSkillCri || forceCri) {
      actualCri = 100;
    }
    actualCri = floor(actualCri);

    const skillAccRate = isHit100 || isMatk ? 100 : basicDmg.accuracy;
    const { avgCriDamage, avgNoCriDamage } = calculated;

    const totalHit = typeof _totalHit === 'function' ? _totalHit(formulaParams) : _totalHit;
    const isAutoSpell = autoSpellChance != 1;
    const skillHitsPerSec = Math.min(skillAspd.totalHitPerSec || basicAspd.hitsPerSec, basicAspd.hitsPerSec);
    const skillDpsInputMin = avgNoCriDamage || minDamage + skillMinDamage2;
    const skillDpsInputMax = avgNoCriDamage || maxDamage + skillMaxDamage2;
    const skillDpsInputCriDmg = avgCriDamage || maxDamage + skillMaxDamage2;
    const oneHitDps = isAutoSpell
      ? 0
      : calcDmgDps({
        min: skillDpsInputMin,
        max: skillDpsInputMax,
        cri: actualCri,
        criDmg: skillDpsInputCriDmg,
        hitsPerSec: skillHitsPerSec,
        accRate: skillAccRate,
      });
    const skillDps = floor(totalHit * oneHitDps * autoSpellChance);
    const hitKill = Math.ceil(this.monster.data.hp / minDamage);

    const totalPene = isMatk ? this.getTotalMagicalPene() : basicDmg.totalPene;
    const isMelee = _isMelee != null && typeof _isMelee === 'function' ? _isMelee(this.weaponData.data.typeName) : !!_isMelee;

    const label = calculated.canCri ? 'SkillCri' : 'Skill';
    const { totalPeneRes, totalPeneMres } = this.getPeneResMres();

    const skillDmg: SkillDamageSummaryModel = {
      skillDamageLabel: `${label}` + (maxStack > 0 ? ` ${maxStack} stacks` : ''),
      skillNoStackDamageLabel: `${label} 0 stack`,
      baseSkillDamage,
      dmgType: isMatk ? SkillType.MAGICAL : isMelee ? SkillType.MELEE : SkillType.RANGE,
      skillSizePenalty: round(calculated.sizePenalty * 100, 0),
      skillTotalHit: totalHit,
      skillPropertyAtk: calculated.propertyAtk,
      skillPropertyMultiplier: calculated.propertyMultiplier,
      skillCanCri: calculated.canCri,
      skillTotalPene: isIgnoreDef ? 100 : totalPene,
      skillTotalPeneLabel: isMatk ? 'Pen. Mágica' : 'Pen. Física',
      skillTotalPeneRes: isMatk ? totalPeneMres : totalPeneRes,
      skillTotalPeneResLabel: isMatk ? 'Pen. MRes' : 'Pen. Res',
      skillMinDamage: minDamage,
      skillMaxDamage: maxDamage,
      skillMinDamageNoCri: calculated.rawMinNoCri,
      skillMaxDamageNoCri: calculated.rawMaxNoCri,
      skillHit: skillData?.hit || 1,
      skillAccuracy: skillAccRate,
      skillDps,
      skillHitKill: hitKill,
      skillCriRateToMonster: actualCri,
      skillCriDmgToMonster: calculated.criDmgToMonster,
      // Some skills only apply a fraction of the character's crit-damage bonus
      // (e.g. Sonic Blow's criDmgPercentage: 0.5) — exposed so the UI can flag when
      // "Dano Crít." isn't the full crit bonus.
      skillCriDmgPercentage: skillData?.criDmgPercentage ?? 1,
      skillPart2Label,
      skillMinDamage2,
      skillMaxDamage2,
      maxStack,
      noStackMaxCriDamage,
      noStackMaxDamage,
      noStackMinCriDamage,
      noStackMinDamage,
      isAutoSpell,
      isUsedCurrentHP: typeof currentHpFn === 'function',
      isUsedCurrentSP: typeof currentSpFn === 'function',
      currentHp,
      currentSp,
      skillBonusFromEquipment: this.getSkillBonus(skillName),
      skillFormulaTrace: calculated.skillFormulaTrace,
      skillFormulaTraceNoCri: calculated.skillFormulaTraceNoCri,
      skillFormulaGraph: calculated.skillFormulaGraph,
      skillFormulaGraphNoCri: calculated.skillFormulaGraphNoCri,

      // Verbatim inputs to the calcDmgDps() call above — exposed so the UI can
      // render a step-by-step DPS derivation that always reconciles with
      // `skillDps`, without re-deriving the branch-dependent (Fist Spell/custom
      // formula/maxStack/part2) logic that produced them.
      skillDpsInputMin,
      skillDpsInputMax,
      skillDpsInputCriDmg,
      skillDpsInputHitsPerSec: skillHitsPerSec,
    };

    return { basicDmg, misc, skillDmg, skillAspd, basicAspd };
  }

  get atkSummaryForUI() {
    const { skillAtk: skillAtkMastery, hiddenMastery, buffAtk, uiMastery } = this.getMasteryAtk();
    const { equipAtk, skillAtk, striking } = this.getExtraAtk();

    return {
      totalStatusAtk: this.getStatusAtk(),
      totalEquipAtk: equipAtk + skillAtk + striking,
      totalMasteryAtk: skillAtkMastery + buffAtk + uiMastery,
      totalHideMasteryAtk: hiddenMastery,
      totalBuffAtk: buffAtk,
      totalStatusMatk: this.getStatusMatk(),
    };
  }
}
