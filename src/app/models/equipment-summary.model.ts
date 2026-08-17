export interface EquipmentSummaryModel {
  weight: number;
  refine: number;
  baseDef?: number;

  hp: number;
  hpPercent: number;
  sp: number;
  spPercent: number;
  def: number;
  defPercent: number;
  softDef: number;
  softDefPercent: number;
  mdef: number;
  mdefPercent: number;
  softMdef: number;
  softMdefPercent: number;
  aspd: number;
  aspdPercent: number;
  skillAspd: number;
  skillAspdPercent: number;
  decreaseSkillAspdPercent: number;

  flatDmg: number;
  atk: number;
  x_atk: number;
  cannonballAtk: number;
  atkPercent: number;

  matk: number;
  matkPercent: number;
  allStatus: number;

  str: number;
  int: number;
  dex: number;
  luk: number;
  vit: number;
  agi: number;

  allTrait: number;
  pAtk: number;
  sMatk: number;
  pow: number;
  sta: number;
  wis: number;
  spl: number;
  con: number;
  crt: number;
  cRate: number;
  hplus: number;

  res: number;
  mres: number;
  monster_res: number;
  monster_mres: number;

  melee: number;
  range: number;
  bowRange: number;
  vct: number;
  vct_inc: number;
  acd: number;
  fct: number;
  fctPercent: number;
  cri: number;
  /** "CRIT à distância": crit rate the ranged BASIC attack alone takes — never `cri`,
   *  which the skill crit rate reads too. See DamageCalculator.getRangedCriRate(). */
  criRange: number;
  criDmg: number;
  perfectHit: number;
  hit: number;
  flee: number;
  perfectDodge: number;

  mildwind: number;
  dmg: number;
  ignore_size_penalty: number;
  p_infiltration: number;

  p_size_all: number;
  p_size_s: number;
  p_size_m: number;
  p_size_l: number;

  p_element_all: number;
  p_element_neutral: number;
  p_element_water: number;
  p_element_earth: number;
  p_element_fire: number;
  p_element_wind: number;
  p_element_poison: number;
  p_element_holy: number;
  p_element_dark: number;
  p_element_ghost: number;
  p_element_undead: number;

  // The attacker-side mirror of the subrace_* namespace: `player_human`/`player_doram`
  // are the races a PLAYER target carries, and `demihuman` only ever a monster. The
  // pt-BR description tells the two apart — "Humano" is the player race and
  // "Humanoide" the monster one, so "contra as raças Humano e Humanoide +55%" is both
  // keys at 55. See docs/pvp.md §2.
  p_race_all: number;
  p_race_formless: number;
  p_race_undead: number;
  p_race_brute: number;
  p_race_plant: number;
  p_race_insect: number;
  p_race_fish: number;
  p_race_demon: number;
  p_race_demihuman: number;
  p_race_angel: number;
  p_race_dragon: number;
  p_race_player_human: number;
  p_race_player_doram: number;

  p_class_all: number;
  p_class_normal: number;
  p_class_boss: number;

  p_pene_class_all: number;
  p_pene_class_normal: number;
  p_pene_class_boss: number;

  p_pene_race_all: number;
  p_pene_race_formless: number;
  p_pene_race_undead: number;
  p_pene_race_brute: number;
  p_pene_race_plant: number;
  p_pene_race_insect: number;
  p_pene_race_fish: number;
  p_pene_race_demon: number;
  p_pene_race_demihuman: number;
  p_pene_race_angel: number;
  p_pene_race_dragon: number;
  p_pene_race_player_human: number;
  p_pene_race_player_doram: number;

  pene_res: number;
  pene_res_race_formless: number;
  pene_res_race_undead: number;
  pene_res_race_brute: number;
  pene_res_race_plant: number;
  pene_res_race_insect: number;
  pene_res_race_fish: number;
  pene_res_race_demon: number;
  pene_res_race_demihuman: number;
  pene_res_race_angel: number;
  pene_res_race_dragon: number;
  pene_res_race_player_human: number;
  pene_res_race_player_doram: number;

  m_size_all: number;
  m_size_s: number;
  m_size_m: number;
  m_size_l: number;

  m_my_element_all: number;
  m_my_element_neutral: number;
  m_my_element_water: number;
  m_my_element_earth: number;
  m_my_element_fire: number;
  m_my_element_wind: number;
  m_my_element_poison: number;
  m_my_element_holy: number;
  m_my_element_dark: number;
  m_my_element_ghost: number;
  m_my_element_undead: number;

  m_element_all: number;
  m_element_neutral: number;
  m_element_water: number;
  m_element_earth: number;
  m_element_fire: number;
  m_element_wind: number;
  m_element_poison: number;
  m_element_holy: number;
  m_element_dark: number;
  m_element_ghost: number;
  m_element_undead: number;

  m_race_all: number;
  m_race_formless: number;
  m_race_undead: number;
  m_race_brute: number;
  m_race_plant: number;
  m_race_insect: number;
  m_race_fish: number;
  m_race_demon: number;
  m_race_demihuman: number;
  m_race_angel: number;
  m_race_dragon: number;
  m_race_player_human: number;
  m_race_player_doram: number;

  m_class_all: number;
  m_class_normal: number;
  m_class_boss: number;

  m_pene_class_all: number;
  m_pene_class_boss: number;
  m_pene_class_normal: number;

  m_pene_race_all: number;
  m_pene_race_undead: number;
  m_pene_race_plant: number;
  m_pene_race_insect: number;
  m_pene_race_formless: number;
  m_pene_race_fish: number;
  m_pene_race_dragon: number;
  m_pene_race_player_human: number;
  m_pene_race_player_doram: number;
  m_pene_race_demon: number;
  m_pene_race_demihuman: number;
  m_pene_race_brute: number;
  m_pene_race_angel: number;

  pene_mres: number;
  pene_mres_race_formless: number;
  pene_mres_race_undead: number;
  pene_mres_race_brute: number;
  pene_mres_race_plant: number;
  pene_mres_race_insect: number;
  pene_mres_race_fish: number;
  pene_mres_race_demon: number;
  pene_mres_race_demihuman: number;
  pene_mres_race_angel: number;
  pene_mres_race_dragon: number;
  pene_mres_race_player_human: number;
  pene_mres_race_player_doram: number;

  // --- Defender-side reductions (PVP) --------------------------------------
  // These describe the reduction the DEFENDER's gear grants against incoming
  // damage. They aggregate on the target's own totalEquipStatus and are only
  // consumed when a player target is active (see docs/pvp.md §4). The suffix is
  // the ATTACKER's race/element/size/class. Percentages (0-100).
  dmg_taken_physical: number;
  dmg_taken_magical: number;
  dmg_taken_all: number;
  /** Long-ranged physical damage reduction (Gazeti-card family). Only applied
   *  vs a ranged physical hit (see core/pvp.ts `isRanged`). Percentage (0-100). */
  dmg_taken_range: number;

  subele_all: number;
  subele_neutral: number;
  subele_water: number;
  subele_earth: number;
  subele_fire: number;
  subele_wind: number;
  subele_poison: number;
  subele_holy: number;
  subele_dark: number;
  subele_ghost: number;
  subele_undead: number;

  subsize_all: number;
  subsize_s: number;
  subsize_m: number;
  subsize_l: number;

  /** Size resistance that only cuts physical damage ("Resistência física a ... tamanho"). */
  subsize_all_physical: number;
  subsize_s_physical: number;
  subsize_m_physical: number;
  subsize_l_physical: number;

  /** Size resistance that only cuts magical damage ("Resistência mágica a ... tamanho"). */
  subsize_all_magical: number;
  subsize_s_magical: number;
  subsize_m_magical: number;
  subsize_l_magical: number;

  subclass_all: number;
  subclass_normal: number;
  subclass_boss: number;

  subrace_all: number;
  subrace_formless: number;
  subrace_undead: number;
  subrace_brute: number;
  subrace_plant: number;
  subrace_insect: number;
  subrace_fish: number;
  subrace_demon: number;
  subrace_demihuman: number;
  subrace_angel: number;
  subrace_dragon: number;
  subrace_player_human: number;
  subrace_player_doram: number;

  // Other from skill
  forceCri?: number;
  magnumBreakPsedoBonus?: number;
  magnumBreakClearEDP?: number;
  vctBySkill?: number;
  // [key: string]: number;
}
