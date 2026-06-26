import { ElementType } from '../constants/element-type.const';
import { elementPtBr, monsterTypePtBr, racePtBr, sizePtBr } from '../constants/monster-i18n';
import { RaceType } from '../constants/race-type.const';
import { DropdownModel } from '../models/dropdown.model';
import { createBaseStatOptionList } from './create-base-stat-option-list';
import { createTraitStatOptionList } from './create-trait-stat-option-list';

// pt-BR display labels. Keys stay English because the calc derives option
// `value`s from those English strings — only the shown `label` is translated.
const TR: Record<string, string> = {
  Physical: 'Físico',
  Magical: 'Mágico',
  Atk: 'ATQ',
  'Atk %': 'ATQ %',
  Matk: 'ATQM',
  'Matk %': 'ATQM %',
  Race: 'Raça',
  Element: 'Elemento',
  Size: 'Tamanho',
  Class: 'Classe',
  'Long Range': 'Longo Alcance',
  Melee: 'Corpo a corpo',
  'CRI Rate': 'Taxa Crít.',
  'CRI Dmg': 'Dano Crít.',
  VCT: 'Conj. Variável',
  Delay: 'Pós-conjuração',
  Hit: 'Precisão',
  Flee: 'Esquiva',
  'Perfect Dodge': 'Esquiva Perfeita',
  Def: 'DEF',
  Mdef: 'DEFM',
  Res: 'TEN',
  Mres: 'MTEN',
  HPlus: 'C.Mais',
};
const tr = (s: string) => TR[s] ?? s;

// Translate a damage-target member (race/element/size/class) for display. `All` is
// the calc's "any target" sentinel; the per-type maps live in monster-i18n. Values
// stay English — only the shown label is translated.
const trProp = (dmgType: string, prop: string): string => {
  if (prop === 'All') return 'Todos';
  switch (dmgType) {
    case 'Race':
      return racePtBr(prop);
    case 'Element':
      return elementPtBr(prop);
    case 'Size':
      return sizePtBr(prop);
    case 'Class':
      return monsterTypePtBr(prop);
    default:
      return prop;
  }
};

export const createExtraOptionList = () => {
  const atkTypes = ['Physical', 'Magical'];
  const atkProps = {
    Race: ['All', ...Object.values(RaceType)],
    Element: ['All', ...Object.values(ElementType)],
    Size: ['All', 'Small', 'Medium', 'Large'],
    Class: ['All', 'Normal', 'Boss'],
  };

  const items: (DropdownModel & { children: any[] })[] = [];
  for (const atkType of atkTypes) {
    const atk = atkType.at(0).toLowerCase();
    const item = {
      value: atk,
      label: tr(atkType),
      children: [],
    };
    for (const [dmgType, dmgSubTypes] of Object.entries(atkProps)) {
      const propLow = dmgType.toLowerCase();
      item.children.push({
        value: `${atk}_${dmgType}`,
        label: tr(dmgType),
        children: dmgSubTypes.map((finalProp) => {
          const finalPropLow = finalProp.toLowerCase();
          let fixedSize = finalPropLow;
          if (dmgType === 'Size') {
            fixedSize = finalPropLow === 'all' ? finalPropLow : finalPropLow.at(0);
          }

          return {
            value: `${atk}_${dmgType}_${finalProp}`,
            label: trProp(dmgType, finalProp),
            children: Array.from({ length: 25 }, (_, k) => {
              const num = k + 1;
              return {
                value: `${atk}_${propLow}_${fixedSize}:${num}`,
                label: `${atk.toUpperCase()}. ${tr(dmgType)} ${trProp(dmgType, finalProp)} +${num}%`,
              };
            }),
          };
        }),
      });
    }

    items.push(item);
  }

  // "Dano mágico <Propriedade>" — raises the damage of the caster's own-element
  // spells (rAthena ADDSKILLMDAMAGE_*; in-game label "Dano mágico Fogo +N%").
  // Distinct from the "Elemento" group above, which is "Dano mágico contra
  // <Prop>" (damage vs the target's element). The old "Meu Elemento Mágico" /
  // "M. Meu X" wording was a literal port of the English "My Element".
  items[1].children.push({
    label: 'Dano Mágico por Propriedade',
    value: 'My Element',
    children: atkProps.Element.map((element) => {
      const elementLow = element.toLowerCase();
      const propLabel = element === 'All' ? 'todas as propriedades' : trProp('Element', element);
      return {
        value: `m_my_element_${elementLow}`,
        label: propLabel,
        children: Array.from({ length: 25 }, (_, k) => {
          const num = k + 1;
          return {
            value: `m_my_element_${elementLow}:${num}`,
            label: `Dano mágico ${propLabel} +${num}%`,
          };
        }),
      };
    }),
  });
  items[0].children.push({
    label: 'Ignorar penalidade de tamanho',
    value: 'ignore_size_penalty:1',
    // children: [],
  });

  const peneList = [
    { mainItemIdx: 0, kind: 'Race', label: 'Penetração Física - Raça', prefixProp: 'p_pene_race_', properties: atkProps.Race },
    { mainItemIdx: 0, kind: 'Class', label: 'Penetração Física - Classe', prefixProp: 'p_pene_class_', properties: atkProps.Class },
    { mainItemIdx: 1, kind: 'Race', label: 'Penetração Mágica - Raça', prefixProp: 'm_pene_race_', properties: atkProps.Race },
    { mainItemIdx: 1, kind: 'Class', label: 'Penetração Mágica - Classe', prefixProp: 'm_pene_class_', properties: atkProps.Class },
  ] as {
    mainItemIdx: number;
    kind: string;
    label: string;
    prefixProp: string;
    properties: string[];
  }[];
  for (const { mainItemIdx, kind, label, prefixProp, properties } of peneList) {
    const VAL_CAP = 10;
    const scale = 1;
    const rawMin = 1;
    const rawMax = 100;
    const pre = mainItemIdx === 0 ? 'Pen. Física' : 'Pen. Mágica';

    const children = [];
    for (const prop of properties) {
      const lower = prop.toLowerCase();
      const values = [] as { label: string; min: number; max: number }[];
      for (let i = rawMin; i < rawMax; i += VAL_CAP) {
        const max = Math.min(i + VAL_CAP - 1, rawMax);
        values.push({ label: `${i * scale} - ${max * scale}`, min: i, max: max });
      }

      const propLabel = trProp(kind, prop);
      children.push({
        label: propLabel,
        value: prop,
        children: values.map((value) => {
          const { label: label2, min, max } = value;

          return {
            label: `${propLabel} ${label2} %`,
            value: label2,
            children: Array.from({ length: max - min + 1 }, (_, k) => {
              const num = k + min;
              return {
                label: `${pre} ${propLabel} ${num * scale} %`,
                value: `${prefixProp}${lower}:${num * scale}`,
              };
            }),
          };
        }),
      });
    }

    items.push({
      label,
      value: label,
      children: children,
    });
  }

  const options: [string, string, number, number, number, string?][] = [
    ['Atk', 'atk', 1, 65, 1],
    ['Atk %', 'atkPercent', 1, 30, 1, ' %'],
    ['Matk', 'matk', 1, 65, 1],
    ['Matk %', 'matkPercent', 1, 30, 1, ' %'],
    ['Long Range', 'range', 1, 30, 1, ' %'],
    ['Melee', 'melee', 1, 30, 1, ' %'],
    ['CRI Rate', 'cri', 1, 30, 1, ' %'],
    ['CRI Dmg', 'criDmg', 1, 30, 1, ' %'],
    ['ASPD', 'aspd', 1, 5, 1],
    ['ASPD %', 'aspdPercent', 1, 30, 1, ' %'],
    ['Delay', 'acd', 1, 30, 1, ' %'],
    ['VCT', 'vct', 1, 30, 1, ' %'],
    ['HP %', 'hpPercent', 1, 20, 1, ' %'],
    ['HP', 'hp', 1, 20, 50],
    ['SP %', 'spPercent', 1, 20, 1, ' %'],
    ['SP', 'sp', 1, 20, 20],
    // Defensive / accuracy rolls — not in the original list, added so replay
    // imports of these random options (Bônus Aleatórios) are representable.
    ['Hit', 'hit', 1, 50, 1],
    ['Flee', 'flee', 1, 50, 1],
    ['Perfect Dodge', 'perfectDodge', 1, 30, 1],
    ['Def', 'def', 1, 200, 1],
    ['Mdef', 'mdef', 1, 100, 1],
    // Trait-derived rolls (cRate already lives in the trait-stat list).
    ['Res', 'res', 1, 50, 1],
    ['Mres', 'mres', 1, 50, 1],
    ['HPlus', 'hplus', 1, 50, 1],
  ];

  const subTypeMap = {
    Atk: 'Physical',
    'Atk %': 'Physical',
    'Long Range': 'Physical',
    Melee: 'Physical',
    Matk: 'Magical',
    'Matk %': 'Magical',
  };

  const DEFAULT_CAP = 10;
  for (const [label, prop, rawMin, rawMax, scale, suffix] of options) {
    const labelNoPercent = tr(label).replace(' %', '');
    const values = [] as { label: string; min: number; max: number }[];
    const sign = label === 'Delay' || label === 'VCT' ? '-' : '+';
    const cap = rawMax - rawMin > 20 ? DEFAULT_CAP : rawMax;
    for (let i = rawMin; i < rawMax; i += cap) {
      const max = Math.min(i + cap - 1, rawMax);
      values.push({ label: `${i * scale} - ${max * scale}`, min: i, max: max });
    }

    let children = [];
    if (values.length === 1) {
      const { min, max } = values[0];
      children = Array.from({ length: max - min + 1 }, (_, k) => {
        const num = k + min;
        return {
          label: `${labelNoPercent} ${sign}${num * scale}${suffix || ''}`,
          value: `${prop}:${num * scale}`,
        };
      });
    } else {
      children = values.map((value) => {
        const { label: label2, min, max } = value;

        return {
          label: `${labelNoPercent} ${label2}${suffix || ''}`,
          value: label2,
          children: Array.from({ length: max - min + 1 }, (_, k) => {
            const num = k + min;
            return {
              label: `${labelNoPercent} ${sign}${num * scale}${suffix || ''}`,
              value: `${prop}:${num * scale}`,
            };
          }),
        };
      });
    }

    const item = {
      value: label,
      label: tr(label),
      children,
    };

    const subT = subTypeMap[label];
    if (subT === 'Physical') {
      items[0].children.push(item);
    } else if (subT === 'Magical') {
      items[1].children.push(item);
    } else {
      items.push(item);
    }
  }

  items.push(createBaseStatOptionList(1, 30));
  items.push(createTraitStatOptionList(1, 20));

  return items;
};

const optionMap = new Map<string, string>();
const addToMap = (item: DropdownModel & { children: any[] }) => {
  const children = item?.children;
  if (Array.isArray(children) && children.length > 0) {
    for (const child of children) {
      addToMap(child);
    }
  } else {
    optionMap.set(item.value as string, item.label);
  }
};

const list = createExtraOptionList();
for (const a of list) {
  addToMap(a);
}

export const ExtraOptionMap = optionMap;
