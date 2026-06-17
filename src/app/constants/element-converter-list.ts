import { DropdownModel } from '../models/dropdown.model';
import { ElementType } from './element-type.const';

export const ElementConverterList: DropdownModel[] = [
  {
    img: '12114',
    label: 'Fogo',
    value: ElementType.Fire,
    element: ElementType.Fire,
  },
  {
    img: '12115',
    label: 'Água',
    value: ElementType.Water,
    element: ElementType.Water,
  },
  {
    img: '12116',
    label: 'Terra',
    value: ElementType.Earth,
    element: ElementType.Earth,
  },
  {
    img: '12117',
    label: 'Vento',
    value: ElementType.Wind,
    element: ElementType.Wind,
  },
  {
    img: 'I_EnchantPoison',
    label: 'Envenenar Arma',
    value: ElementType.Poison,
    element: ElementType.Poison,
  },
  {
    img: 'I_Aspersio',
    label: 'Aspersio',
    value: ElementType.Holy,
    element: ElementType.Holy,
  },
  {
    img: '12020',
    label: 'Água Amaldiçoada',
    value: ElementType.Dark,
    element: ElementType.Dark,
  },
];
