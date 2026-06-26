import { ElementType } from '../constants/element-type.const';
import { elementPtBr, monsterTypePtBr, racePtBr, sizePtBr } from '../constants/monster-i18n';
import { RaceType } from '../constants/race-type.const';
import { DropdownModel } from '../models/dropdown.model';
import { createBaseStatOptionList } from './create-base-stat-option-list';

interface X extends DropdownModel {
  children?: X[];
}

// pt-BR display labels. Keys/values stay English because the search filter matches
// on the English `value`s — only the shown `label` is translated.
const TR: Record<string, string> = {
  Physical: 'Físico',
  Magical: 'Mágico',
  Race: 'Raça',
  Element: 'Elemento',
  Size: 'Tamanho',
  Class: 'Classe',
  Atk: 'ATQ',
  'Atk %': 'ATQ %',
  Matk: 'ATQM',
  'Matk %': 'ATQM %',
  'Long Range': 'Longo Alcance',
  Melee: 'Corpo a corpo',
  'CRI Rate': 'Taxa Crít.',
  'CRI Dmg': 'Dano Crít.',
  Delay: 'Pós-conjuração',
  VCT: 'Conj. Variável',
};
const tr = (s: string) => TR[s] ?? s;

// Translate a damage-target member (race/element/size/class) for display; `All` is
// the "any target" sentinel. Per-type maps live in monster-i18n.
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

export const createBonusNameList = () => {
  const atkTypes = ['Physical', 'Magical'];
  const atkProps = {
    Race: ['All', ...Object.values(RaceType)],
    Element: ['All', ...Object.values(ElementType)],
    Size: ['All', 'Small', 'Medium', 'Large'],
    Class: ['All', 'Normal', 'Boss'],
  };

  const items: X[] = [];
  for (const atkType of atkTypes) {
    const bonusType = atkType.at(0).toLowerCase();
    const item: X = {
      value: bonusType,
      label: tr(atkType),
      children: [],
    };
    for (const [dmgType, dmgSubTypes] of Object.entries(atkProps)) {
      const propLow = dmgType.toLowerCase();
      const val = `${propLow}_${dmgType}`;
      item.children.push({
        value: val,
        label: tr(dmgType),
        children: dmgSubTypes.map((label2) => {
          const finalPropLow = label2.toLowerCase();
          let fixedSize = finalPropLow;
          if (dmgType === 'Size') {
            fixedSize = finalPropLow === 'all' ? finalPropLow : finalPropLow.at(0);
          }

          const bonusName = `${bonusType}_${propLow}_${fixedSize}`;

          return {
            value: bonusName,
            label: `${bonusType.toUpperCase()}. ${tr(dmgType)} ${trProp(dmgType, label2)}`,
          };
        }),
      });
    }

    items.push(item);
  }

  // "Dano mágico <Propriedade>" — own-element spell damage (rAthena
  // ADDSKILLMDAMAGE_*), not "Dano mágico contra <Prop>" (the "Elemento" group).
  items[1].children.push({
    label: 'Dano Mágico por Propriedade',
    value: 'My Element',
    children: atkProps.Element.map((element) => {
      const elementLow = element.toLowerCase();
      const prop = `m_my_element_${elementLow}`;
      const propLabel = element === 'All' ? 'todas as propriedades' : trProp('Element', element);

      return {
        value: prop,
        label: `Dano mágico ${propLabel}`,
      };
    }),
  });

  const options: [string, string][] = [
    ['Atk', 'atk'],
    ['Atk %', 'atkPercent'],
    ['Matk', 'matk'],
    ['Matk %', 'matkPercent'],
    ['Long Range', 'range'],
    ['Melee', 'melee'],
    ['CRI Rate', 'cri'],
    ['CRI Dmg', 'criDmg'],
    ['ASPD', 'aspd'],
    ['ASPD %', 'aspdPercent'],
    ['Delay', 'acd'],
    ['VCT', 'vct'],
    ['HP %', 'hpPercent'],
    ['SP %', 'spPercent'],
  ];

  const subTypeMap = {
    Atk: 'Physical',
    'Atk %': 'Physical',
    'Long Range': 'Physical',
    Melee: 'Physical',
    Matk: 'Magical',
    'Matk %': 'Magical',
  };

  for (const [label, bonusName] of options) {
    const item: X = {
      label: tr(label),
      value: bonusName,
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

  items.push(createBaseStatOptionList(0, 0));

  return items;
};
