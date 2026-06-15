export const AspdPotionList = [
  { label: 'Poção da Concentração', value: 645, bonus: 4 },
  { label: 'Poção do Despertar', value: 656, bonus: 6 },
  { label: 'Poção da Fúria Selvagem', value: 657, bonus: 9 },
];

export const AspdPotionStackable = [{ label: 'Poção de Ouro', value: 12684, bonus: 3 }];

export const AspdPotionList2 = [{ label: 'Suco Celular Enriquecido', value: 12437 }, ...AspdPotionStackable];

export const AspdPotionFixBonus = new Map([...AspdPotionList, ...AspdPotionStackable].map((a) => [a.value, a.bonus]));
