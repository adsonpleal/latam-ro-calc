import { ElementType } from '../element-type.const';
import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

// Ninja/Kagerou/Oboro elemental Spirit Charms. Split into one mutually-exclusive
// toggle per element (only one charm element active at a time), like the Soul Reaper
// "Espírito" souls / Meister ABR — via exclusiveGroup. `_`-prefixed names keep their
// explicit icon + pt-BR label through localize(); the icon's hover shows the real
// client charm-skill description. No formula reads the old 'Charm' value, so the
// per-element bonus on each toggle is all that matters.
export const ElementCharm: ActiveSkillModel[] = [
  {
    name: '_Charm_Fire',
    label: 'Amuleto de Fogo', // KO_KAHU_ENTEN (Fire Charm)
    icon: 3015,
    exclusiveGroup: 'charm',
    inputType: 'selectButton',
    dropdown: [
      {
        label: 'Sim',
        value: 10,
        isUse: true,
        bonus: {
          'flat_Flaming Petals': 200,
          'flat_Blaze Shield': 200,
          'flat_Exploding Dragon': 1000,
          p_element_earth: 30,
        },
      },
      { label: 'Não', value: 0, isUse: false },
    ],
  },
  {
    name: '_Charm_Earth',
    label: 'Amuleto de Terra', // KO_DOHU_KOUKAI (Earth Charm)
    icon: 3018,
    exclusiveGroup: 'charm',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Sim', value: 20, isUse: true, bonus: { weaponAtkPercent: 150, p_element_wind: 30 } },
      { label: 'Não', value: 0, isUse: false },
    ],
  },
  {
    name: '_Charm_Ice',
    label: 'Amuleto de Água', // KO_HYOUHU_HUBUKI (Ice Charm — bRO "Amuleto de Água")
    icon: 3016,
    exclusiveGroup: 'charm',
    inputType: 'selectButton',
    dropdown: [
      {
        label: 'Sim',
        value: 30,
        isUse: true,
        bonus: {
          'flat_Freezing Spear': 200,
          'flat_Snow Flake Draft': 1000,
          p_element_fire: 30,
        },
      },
      { label: 'Não', value: 0, isUse: false },
    ],
  },
  {
    name: '_Charm_Wind',
    label: 'Amuleto de Vento', // KO_KAZEHU_SEIRAN (Wind Charm)
    icon: 3017,
    exclusiveGroup: 'charm',
    inputType: 'selectButton',
    dropdown: [
      {
        label: 'Sim',
        value: 40,
        isUse: true,
        bonus: {
          'flat_Wind Blade': 200,
          'flat_Lightning Jolt': 200,
          'flat_First Wind': 1000,
          p_element_water: 30,
        },
      },
      { label: 'Não', value: 0, isUse: false },
    ],
  },
];

/**
 * rAthena's `MAX_SPIRITCHARM` (pc.hpp): the full stack one of the toggles above stands
 * for. Every bonus on them is already written at this count — Amuleto de Terra's
 * `weaponAtkPercent: 150` is rAthena's `15 * spiritcharm` at ten charms, and the
 * `p_element_*: 30` block is the one it gates on `spiritcharm >= MAX_SPIRITCHARM` — so a
 * skill that throws the stack (Arremessar Amuleto, skills/shared-skills.ts) counts ten too.
 */
export const MAX_SPIRIT_CHARM = 10;

/**
 * The property each charm throws, in the order the toggles are declared above. One entry
 * per toggle: a charm missing from here is a charm Arremessar Amuleto cannot be cast with.
 */
export const SPIRIT_CHARMS = [
  ['_Charm_Fire', ElementType.Fire],
  ['_Charm_Earth', ElementType.Earth],
  ['_Charm_Ice', ElementType.Water],
  ['_Charm_Wind', ElementType.Wind],
] as const;
