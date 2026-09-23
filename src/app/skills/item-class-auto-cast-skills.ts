import type { AtkSkillModel, CharacterBase } from '../jobs/_character-base.abstract';
import { ArchBishop } from '../jobs/ArchBishop';
import { AssassinCross } from '../jobs/AssassinCross';
import { Cardinal } from '../jobs/Cardinal';
import { Genetic } from '../jobs/Genetic';
import { GuillotineCross } from '../jobs/GuillotineCross';
import { Mechanic } from '../jobs/Mechanic';
import { Minstrel } from '../jobs/Minstrel';
import { Oboro } from '../jobs/Oboro';
import { Paladin } from '../jobs/Paladin';
import { RuneKnight } from '../jobs/RuneKnight';
import { ShadowChaser } from '../jobs/ShadowChaser';
import { Sorcerer } from '../jobs/Sorcerer';
import { SuperNovice } from '../jobs/SuperNovice';
import { LORD_OF_VERMILION, REVERBERATION } from './shared-skills';

// Reuse the native damage definitions for item-granted skills. A job's own definition
// still wins in auto-cast.ts; these are the fallbacks for every other wearer class.
function native(character: CharacterBase, name: AtkSkillModel['name']): AtkSkillModel {
  const skill = character.atkSkills.find((entry) => entry.name === name);
  if (!skill) throw new Error(`Missing native item skill formula: ${name}`);
  return skill;
}

const bishop = new ArchBishop();
const assassin = new AssassinCross();
const cardinal = new Cardinal();
const genetic = new Genetic();
const guillotine = new GuillotineCross();
const mechanic = new Mechanic();
const minstrel = new Minstrel();
const oboro = new Oboro();
const paladin = new Paladin();
const runeKnight = new RuneKnight();
const chaser = new ShadowChaser();
const sorcerer = new Sorcerer();
const novice = new SuperNovice();

export const ITEM_CLASS_AUTO_CAST_SKILLS: AtkSkillModel[] = [
  native(paladin, 'Gloria Domini'),
  native(oboro, 'Wind Blade'),
  native(minstrel, 'Arrow Vulcan'),
  native(novice, 'Bowling Bash'),
  native(assassin, 'Meteor Assault'),
  // The copied skill's native class controls elemental endows. Item autocasts on other
  // classes use the neutral variant and still read the wearer's stats and weapon.
  native(chaser, 'Psychic Wave'),
  LORD_OF_VERMILION,
  native(oboro, 'Snow Flake Draft'),
  native(guillotine, 'Soul Destroyer'),
  {
    ...native(genetic, 'Cart Tornado'),
    formula: ({ skillLevel, status, skills }) =>
      skillLevel * 200 + skills.learnedLevel('Cart Remodeling') * 50
        + skills.activeLevel('Cart Weight') / (150 - status.baseStr),
  },
  native(bishop, 'Adoramus'),
  REVERBERATION,
  native(bishop, 'Holy Light'),
  native(runeKnight, 'Sonic Wave'),
  native(runeKnight, 'Ignition Break'),
  {
    ...native(chaser, 'Fatal Manace'),
    formula: ({ model, skillLevel, status, skills }) =>
      (skills.isActive('Abyss Dagger')
        ? skillLevel * 150 + status.totalAgi * 3
        : skillLevel * 120 + status.totalAgi * 2) * (model.level / 100),
  },
  {
    ...native(mechanic, 'Power Swing'),
    formula: ({ model, skillLevel, status }) =>
      (300 + skillLevel * 100 + (status.totalDex + status.totalStr) / 2) * (model.level / 100),
  },
  native(oboro, 'Cross Slash'),
  {
    ...native(cardinal, 'Framen'),
    formula: ({ model, skillLevel, status, monster, skills }) => {
      const fidus = skills.learnedLevel('Fidus Animus');
      return monster.isRace('demon', 'undead')
        ? (skillLevel * (650 + fidus * 5) + status.totalSpl * 5) * (model.level / 100)
        : (skillLevel * (500 + fidus * 5) + status.totalSpl * 3) * (model.level / 100);
    },
  },
  native(novice, 'Gravitational Field'),
  {
    ...native(mechanic, 'Axe Tornado'),
    formula: ({ model, skillLevel, status, skills }) =>
      (skills.isActive('Axe Stomp')
        ? 230 + skillLevel * 250 + status.totalVit * 2
        : 200 + skillLevel * 180 + status.totalVit) * (model.level / 100),
  },
  native(minstrel, 'Severe Rainstorm'),
  {
    ...native(sorcerer, 'Varetyr Spear'),
    formula: ({ model, skillLevel, status, skills }) =>
      (((skillLevel + 4) * status.totalInt) / 2
        + (skills.learnedLevel('Striking') + skills.learnedLevel('Lightning Loader')) * 150)
        * (model.level / 100),
  },
  native(runeKnight, 'Wind Cutter'),
];
