import { ElementType, RED_AURA_MVP_IDS, hasRelieve, relieveMultiplier } from '../constants';
import { PlayerTargetProfile } from '../core/pvp';
import { MonsterModel } from '../models/monster.model';
import { firstUppercase, floor } from '../utils';

interface PreparedMonsterModel {
  name: string;
  level: number;
  /**
   * lowercase. `player_human`/`player_doram` belong to a PVP target only — no
   * monster carries them, and no player carries `demihuman` (docs/pvp.md §2).
   */
  race: 'formless' | 'undead' | 'brute' | 'plant' | 'insect' | 'fish' | 'demon' | 'demihuman' | 'angel' | 'dragon' | 'player_human' | 'player_doram';
  /**
   * "Formless"
   */
  raceUpper: 'Formless' | 'Undead' | 'Brute' | 'Plant' | 'Insect' | 'Fish' | 'Demon' | 'DemiHuman' | 'Angel' | 'Dragon' | 'Human' | 'Doram';
  size: 's' | 'm' | 'l';
  sizeUpper: 'S' | 'M' | 'L';
  /**
   * Large
   */
  sizeFullUpper: 'Small' | 'Medium' | 'Large';
  /**
   * lowercase ex neutral
   */
  element: string;
  elementUpper: ElementType;
  /**
   * "Ghost 3"
   */
  elementName: string;
  elementLevelN: number;
  /**
   * "Ghost 3"
   */
  elementLevelUpper: string;
  type: 'normal' | 'boss';
  isMvp: boolean;
  /**
   * MVPs that spawn with a red aura (see RED_AURA_MVP_IDS). The red aura reduces
   * the final damage dealt to the monster by 99.9%.
   */
  isRedAura: boolean;
  /**
   * Whether this monster casts Aliviar (see RELIEVE_MONSTER_IDS) — the calculator only
   * offers the level picker when it does.
   */
  hasRelieve: boolean;
  /** The chosen Aliviar level, 0 when it is off. Only meaningful with `hasRelieve`. */
  relieveLevel: number;
  typeUpper: 'Normal' | 'Boss';
  softDef: number;
  softMDef: number;
  hitRequireFor100: number;
  criShield: number;
  def: number;
  mdef: number;
  hp: number;
  str: number;
  agi: number;
  dex: number;
  vit: number;
  int: number;
  luk: number;
  res: number;
  mres: number;
}

export class Monster {
  private _monster: MonsterModel = {} as any;
  private _monsterData: PreparedMonsterModel = {
    name: '',
    level: 1,
    race: 'formless',
    raceUpper: 'Formless',
    size: 'm',
    sizeUpper: 'M',
    sizeFullUpper: 'Medium',
    element: '',
    elementUpper: ElementType.Neutral,
    elementName: 'Neutral 1',
    elementLevelN: 1,
    elementLevelUpper: 'neutral 1',
    type: 'normal',
    isMvp: false,
    isRedAura: false,
    hasRelieve: false,
    relieveLevel: 0,
    typeUpper: 'Normal',
    softDef: 1,
    softMDef: 1,
    hitRequireFor100: 1,
    criShield: 1,
    def: 0,
    mdef: 0,
    hp: 0,
    str: 0,
    agi: 0,
    dex: 0,
    vit: 0,
    int: 0,
    luk: 0,
    res: 0,
    mres: 0,
  };

  get data(): PreparedMonsterModel {
    return this._monsterData;
  }

  get level() {
    return this._monsterData.level;
  }
  get race() {
    return this._monsterData.race;
  }
  /**
   * For bonus programatic
   */
  get element() {
    return this._monsterData.element;
  }
  /**
   * For sudo element mapping
   */
  get elementName() {
    return this._monsterData.elementName;
  }
  get elementType(): ElementType {
    return this._monsterData.elementUpper;
  }
  get size() {
    return this._monsterData.size;
  }
  get type() {
    return this._monsterData.type;
  }

  get isBoss() {
    return this._monsterData.type === 'boss';
  }
  get isMVP() {
    return this._monsterData.isMvp;
  }
  get isRedAura() {
    return this._monsterData.isRedAura;
  }
  /**
   * Damage multiplier from the target's own Aliviar, 1 when the monster does not cast it
   * or the level is 0. A player target never has it.
   */
  get relieveMultiplier() {
    const { hasRelieve: casts, relieveLevel } = this._monsterData;

    return casts ? relieveMultiplier(relieveLevel) : 1;
  }

  get spawn() {
    return this._monster.spawn || '';
  }

  /** A PVP target rather than a monster — setPlayerTargetData writes id -1. */
  get isPlayerTarget() {
    return this._monster?.id === -1;
  }

  /**
   * @param relieveLevel the Aliviar level the user picked for this target, 0 = off. It is
   *   only honoured for a monster that actually casts Aliviar, so a level left over from a
   *   previously selected boss cannot follow the user onto the next target.
   */
  setData(monster: MonsterModel, relieveLevel = 0) {
    // "elementName": "Ghost 3",
    // "elementShortName": "Ghost",
    // "scaleName": "Large",
    // "raceName": "Formless"
    const {
      name,
      stats: { int, vit, agi, luk, str, dex, level, elementName, health, defense, magicDefense, res, mres, raceName, class: monsterTypeId, scaleName, mvp },
    } = monster;

    const [pureElement, eleLvl] = elementName.split(' ');
    const _class = monsterTypeId === 0 ? 'normal' : 'boss';

    this._monster = monster;
    this._monsterData = {
      name,
      level,
      element: pureElement.toLowerCase(),
      elementUpper: firstUppercase(pureElement) as ElementType,
      elementName,
      elementLevelN: Number(eleLvl),
      elementLevelUpper: elementName,
      race: raceName.toLowerCase() as any,
      raceUpper: raceName as any,
      size: scaleName.at(0).toLowerCase() as any,
      sizeUpper: scaleName.at(0) as any,
      sizeFullUpper: scaleName as any,
      type: _class,
      isMvp: mvp === 1,
      isRedAura: RED_AURA_MVP_IDS.has(monster.id),
      hasRelieve: hasRelieve(monster.id),
      relieveLevel: hasRelieve(monster.id) ? relieveLevel : 0,
      typeUpper: firstUppercase(_class) as any,
      hp: health,
      def: defense,
      softDef: floor((level + vit) / 2),
      mdef: magicDefense,
      softMDef: floor((level + int) / 4),
      criShield: floor(luk / 5),
      hitRequireFor100: 200 + level + agi,
      str,
      agi,
      dex,
      vit,
      int,
      luk,
      res,
      mres,
    };

    return this;
  }

  /**
   * Configure this target as a PLAYER (PVP). Unlike setData, the defensive stats
   * are NOT recomputed from monster formulas — they arrive already computed with
   * the player formulas (see calculator.calcAllDefs / HpSpCalculator).
   *
   * A player is Normal / Medium / Neutral, and of race **Humano** (`player_human`)
   * — `player_doram` for a Doram. Reported by Luís: the race used to be DemiHuman,
   * which handed the attacker every anti-Humanoide bonus in the game (Tempestivo,
   * Penetrante, the Sinfonia Mística buff…) against a player they do not touch in
   * game. "Humano" and "Humanoide" are different races and the pt-BR description
   * names them apart — see docs/pvp.md §2.
   *
   * `hitRequireFor100` is the target's effective flee (already castle-adjusted by
   * the caller).
   */
  setPlayerTargetData(profile: PlayerTargetProfile, hitRequireFor100: number) {
    this._monster = { id: -1, name: profile.name, spawn: '' } as any;
    this._monsterData = {
      name: profile.name,
      level: profile.level,
      element: 'neutral',
      elementUpper: ElementType.Neutral,
      elementName: 'Neutral 1',
      elementLevelN: 1,
      elementLevelUpper: 'Neutral 1',
      race: profile.isDoram ? 'player_doram' : 'player_human',
      raceUpper: profile.isDoram ? 'Doram' : 'Human',
      size: 'm',
      sizeUpper: 'M',
      sizeFullUpper: 'Medium',
      type: 'normal',
      isMvp: false,
      isRedAura: false,
      hasRelieve: false,
      relieveLevel: 0,
      typeUpper: 'Normal',
      hp: profile.hp,
      def: profile.def,
      softDef: profile.softDef,
      mdef: profile.mdef,
      softMDef: profile.softMdef,
      criShield: floor(profile.luk / 5),
      hitRequireFor100,
      str: profile.str,
      agi: profile.agi,
      dex: profile.dex,
      vit: profile.vit,
      int: profile.int,
      luk: profile.luk,
      res: profile.res,
      mres: profile.mres,
    };

    return this;
  }

  isRace(...races: (typeof this.race)[]) {
    return races.some((race) => race === this.race);
  }

  isElement(...elements: PreparedMonsterModel['elementUpper'][]) {
    return elements.some((element) => element === this.elementType);
  }

  isSize(...sizes: PreparedMonsterModel['size'][]) {
    return sizes.some((size) => size === this.size);
  }
}
