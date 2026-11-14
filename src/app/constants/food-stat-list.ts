import { DropdownModel } from '../models/dropdown.model';

// Only +15 / +20 stat foods exist on LATAM (the +10 dishes are not released),
// labelled with their in-game pt-BR names.
//
// Each row is one stat: the biscuit stick first, then the dish. Both can be eaten at
// once — the stick runs on SC_FOOD_<STAT>_CASH and the dish on SC_FOOD_<STAT>, which are
// two different in-game statuses with their own icons and durations (30 min vs 5 min,
// per the client descriptions) — so the selection is a set, not one food per stat.
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

/** The biscuit sticks (`*_Biscuit_Stick`), whose buff is the `_CASH` status — the first
 *  option of every row above, so the two never drift apart. The engine needs them apart
 *  from the dishes because two foods of the *same* status replace each other while these
 *  two groups add up. */
export const StatStickIds: ReadonlySet<number> = new Set(FoodStatList.map((stat) => Number(stat[0].value)));
