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
  costumeEnchantUpper: 'Encantamento Topo',
  costumeEnchantMiddle: 'Encantamento Meio',
  costumeEnchantLower: 'Encantamento Baixo',
  costumeEnchantGarment: 'Encantamento Capa',
  costumeEnchantGarment2: 'Encantamento Capa 2',
  costumeEnchantGarment4: 'Encantamento Capa 4',
  shadowWeapon: 'Arma das Sombras',
  shadowShield: 'Escudo das Sombras',
  shadowArmor: 'Armadura das Sombras',
  shadowBoot: 'Botas das Sombras',
  shadowEarring: 'Brinco das Sombras',
  shadowPendant: 'Pingente das Sombras',
};

export const itemSlotLabelPtBr = (key: string): string => ItemSlotLabelPtBr[key] ?? key;
