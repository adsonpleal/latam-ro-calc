import { DropdownModel } from '../models/dropdown.model';
import { CharacterBase } from './_character-base.abstract';
import { ClassID, ClassIcon, ClassNamePtBr } from './_class-name';
import { AbyssChaser } from './AbyssChaser';
import { ArchBishop } from './ArchBishop';
import { ArchMage } from './ArchMage';
import { Biolo } from './Biolo';
import { Cardinal } from './Cardinal';
import { Doram } from './Doram';
import { DragonKnight } from './DragonKnight';
import { ElementalMaster } from './ElementalMaster';
import { Genetic } from './Genetic';
import { GuillotineCross } from './GuillotineCross';
import { HyperNovice } from './HyperNovice';
import { ImperialGuard } from './ImperialGuard';
import { Inquisitor } from './Inquisitor';
import { Kagerou } from './Kagerou';
import { Mechanic } from './Mechanic';
import { Meister } from './Meister';
import { Minstrel } from './Minstrel';
import { NightWatch } from './NightWatch';
import { Oboro } from './Oboro';
import { Ranger } from './Ranger';
import { Rebellion } from './Rebellion';
import { RoyalGuard } from './RoyalGuard';
import { RuneKnight } from './RuneKnight';
import { ShadowChaser } from './ShadowChaser';
import { ShadowCross } from './ShadowCross';
import { Shinkiro } from './Shinkiro';
import { Shiranui } from './Shiranui';
import { SkyEmperor } from './SkyEmperor';
import { Sorcerer } from './Sorcerer';
import { SoulReaper } from './SoulReaper';
import { SoulAscetic } from './SoulAscetic';
import { SpiritHandler } from './SpiritHandler';
import { StarEmperor } from './StarEmperor';
import { SuperNovice } from './SuperNovice';
import { Sura } from './Sura';
import { Troubadour } from './Troubadour';
import { Trouvere } from './Trouvere';
import { Wanderer } from './Wanderer';
import { Warlock } from './Warlock';
import { Windhawk } from './Windhawk';

const toClassItem = (id: number) => ({ label: ClassNamePtBr[id] ?? ClassID[id], value: id, icon: ClassIcon[id] });

export type CharacterCtor = new () => CharacterBase;

/**
 * Every playable class, in dropdown order: each 3rd job followed by its 4th-job
 * promotion, grouped by archetype. The single source of truth for both the picker
 * and `CLASS_CTOR_BY_ID` — adding a class here is enough.
 */
const CLASS_ORDER: ReadonlyArray<readonly [id: number, ctor: CharacterCtor]> = [
  [11, RoyalGuard],
  [4258, ImperialGuard],
  [12, RuneKnight],
  [4252, DragonKnight],

  [7, ArchBishop],
  [4256, Cardinal],
  [13, Sura],
  [4262, Inquisitor],

  [2, Ranger],
  [4257, Windhawk],
  [21, Minstrel],
  [4263, Troubadour],
  [22, Wanderer],
  [4264, Trouvere],

  [5, GuillotineCross],
  [4254, ShadowCross],
  [4, ShadowChaser],
  [4260, AbyssChaser],

  [6, Warlock],
  [4255, ArchMage],
  [8, Sorcerer],
  [4261, ElementalMaster],

  [10, Mechanic],
  [4253, Meister],
  [9, Genetic],
  [4259, Biolo],

  [33, StarEmperor],
  [4302, SkyEmperor],
  [3, SoulReaper],
  [4303, SoulAscetic],

  [18, Kagerou],
  [4304, Shinkiro],
  [17, Oboro],
  [4305, Shiranui],

  [1, Rebellion],
  [4306, NightWatch],

  [30, SuperNovice],
  [4307, HyperNovice],

  [31, Doram],
  [4308, SpiritHandler],
];

/**
 * Class id → constructor, for callers that need one class rather than the whole list.
 *
 * Always `new` a fresh instance per use: `setLearnSkills()` / `getSkillBonusAndName()`
 * mutate the instance, so sharing one across concurrent calculations would leak state
 * between them.
 */
export const CLASS_CTOR_BY_ID: Readonly<Record<number, CharacterCtor>> = Object.fromEntries(CLASS_ORDER) as Record<number, CharacterCtor>;

export const getClassDropdownList = (): (DropdownModel & { icon: number; instant: CharacterBase })[] =>
  CLASS_ORDER.map(([id, Ctor]) => ({ ...toClassItem(id), instant: new Ctor() }));
