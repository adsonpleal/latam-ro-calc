import { DropdownModel } from '../models/dropdown.model';

// Only +15 / +20 stat foods exist on LATAM (the +10 dishes are not released),
// labelled with their in-game pt-BR names.
export const FoodStatList: DropdownModel[][] = [
  [
    { label: 'Palitos de FOR', value: 14616 },
    { label: 'Churrasco de Selvagem', value: 12429 },
  ],
  [
    { label: 'Palitos de AGI', value: 14618 },
    { label: 'Cozido de Drosera', value: 12433 },
  ],
  [
    { label: 'Palitos de VIT', value: 14617 },
    { label: 'Carne ao Vinho', value: 12431 },
  ],
  [
    { label: 'Palitos de INT', value: 14619 },
    { label: 'Coquetel Uivante', value: 12430 },
  ],
  [
    { label: 'Palitos de DES', value: 14620 },
    { label: 'Chá Gelado de Siroma', value: 12432 },
  ],
  [
    { label: 'Palitos de SOR', value: 14621 },
    { label: 'Macarrão com Petite', value: 12434 },
  ],
];
