// Display-only pt-BR for the skill damage type (the raw value still drives
// logic elsewhere, e.g. Magical-only chips/[hidden] gates).
export const DMG_TYPE_PT_BR: Record<string, string> = {
  Melee: 'Corpo a corpo',
  Range: 'À distância',
  Magical: 'Mágico',
};

export function dmgTypeLabel(type: string): string {
  return DMG_TYPE_PT_BR[type] ?? type;
}
