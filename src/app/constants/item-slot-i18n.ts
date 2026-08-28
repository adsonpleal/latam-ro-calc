// pt-BR display labels for equipment slot keys. Display-only: the calc keys its
// logic on the English ItemTypeEnum values, so this map is applied only when a
// slot key is shown to the user (e.g. the "comparar slot" multiselect).
export const ItemSlotLabelPtBr: Record<string, string> = {
  weapon: 'Arma',
  leftWeapon: 'Arma Esq.',
  shield: 'Escudo',
  headUpper: 'Topo',
  headMiddle: 'Meio',
  headLower: 'Baixo',
  armor: 'Armadura',
  garment: 'Capa',
  boot: 'Botas',
  accRight: 'Acess. Dir.',
  accLeft: 'Acess. Esq.',
  pet: 'Pet',
  // The visuals are not comparable, so these four never reached the old multiselect. The
  // picker cards name every slot, comparable or not.
  costumeUpper: 'Visual Topo',
  costumeMiddle: 'Visual Meio',
  costumeLower: 'Visual Baixo',
  costumeGarment: 'Visual Capa',
  costumeEnchantUpper: 'Encantamento Topo',
  costumeEnchantMiddle: 'Encantamento Meio',
  costumeEnchantLower: 'Encantamento Baixo',
  costumeEnchantGarment: 'Encantamento Capa',
  costumeEnchantGarment2: 'Encantamento Capa 2',
  costumeEnchantGarment4: 'Encantamento Capa 4',
  shadowWeapon: 'Manopla Sombria',
  shadowShield: 'Escudo Sombrio',
  shadowArmor: 'Malha Sombria',
  shadowBoot: 'Greva Sombria',
  shadowEarring: 'Brinco Sombrio',
  shadowPendant: 'Colar Sombrio',
};

export const itemSlotLabelPtBr = (key: string): string => ItemSlotLabelPtBr[key] ?? key;
