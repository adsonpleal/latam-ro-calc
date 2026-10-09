import { DropdownModel } from '../models/dropdown.model';
import { ItemModel, itemAutoCastEffectScripts, itemAutoCastScripts, itemBonusScriptEntries } from '../models/item.model';
import { bonusKeyLabel } from './bonus-key-label';

export type ItemSearchRow = DropdownModel & { id: number; position: string };
export interface ItemSearchFilters {
  name: string;
  positions: readonly string[];
  skillIds: readonly number[];
  bonuses: readonly (string | null)[];
  matchAllBonuses: boolean;
}

// Reviewed separately from createRawTotalBonus: the coverage spec fails when the
// engine gains a bonus without a corresponding search option.
const statKeys = [
  'hp', 'hpPercent', 'sp', 'spPercent', 'expGainPercent', 'healReceived', 'healPower',
  'hpRecovRate', 'spRecovRate', 'hpDrain', 'spDrain', 'reduceDamageReturn',
  'magicHealHp', 'magicHealSp', 'hpRestoreOnKill', 'spRestoreOnKill', 'spCostPercent',
  'def', 'defPercent', 'softDef', 'softDefPercent', 'mdef', 'mdefPercent', 'softMdef', 'softMdefPercent',
  'aspd', 'aspdPercent', 'skillAspd', 'skillAspdPercent', 'decreaseSkillAspdPercent',
  'atk', 'x_atk', 'cannonballAtk', 'atkPercent', 'matk', 'matkPercent', 'allStatus',
  'str', 'int', 'dex', 'luk', 'vit', 'agi', 'allTrait', 'pAtk', 'sMatk',
  'pow', 'sta', 'wis', 'spl', 'con', 'crt', 'cRate', 'hplus',
  'res', 'monster_res', 'mres', 'monster_mres', 'melee', 'range', 'bowRange',
  'vct', 'vct_inc', 'acd', 'fct', 'fctPercent', 'cri', 'criRange', 'criDmg',
  'perfectHit', 'hit', 'flee', 'perfectDodge', 'flatDmg', 'mildwind', 'dmg',
  'ignore_size_penalty', 'p_infiltration', 'pene_res', 'pene_mres',
  'dmg_taken_physical', 'dmg_taken_magical', 'dmg_taken_all', 'dmg_taken_range',
];
const races = ['all', 'formless', 'undead', 'brute', 'plant', 'insect', 'fish', 'demon',
  'demihuman', 'angel', 'dragon', 'player_human', 'player_doram'];
const elements = ['all', 'neutral', 'water', 'earth', 'fire', 'wind', 'poison', 'holy', 'dark', 'ghost', 'undead'];
const sizes = ['all', 's', 'm', 'l'];
const classes = ['all', 'normal', 'boss'];
const keysFor = (prefix: string, suffixes: readonly string[]) => suffixes.map(suffix => prefix + '_' + suffix);

export interface ItemSearchBonusOption extends DropdownModel {
  value: string;
  kind: 'key' | 'skill' | 'prefix' | 'autoCast' | 'autoCastEffect';
}
const fixedKeys = [
  ...statKeys,
  ...['p', 'm'].flatMap(type => [
    ...keysFor(type + '_size', sizes), ...keysFor(type + '_element', elements),
    ...keysFor(type + '_race', races), ...keysFor(type + '_class', classes),
    ...keysFor(type + '_pene_race', races), ...keysFor(type + '_pene_class', classes),
  ]),
  ...keysFor('m_my_element', elements),
  ...keysFor('pene_res_race', races.filter(race => race !== 'all')),
  ...keysFor('pene_mres_race', races.filter(race => race !== 'all')),
  ...keysFor('cri_race', races.filter(race => race !== 'all')),
  ...keysFor('subele', elements), ...keysFor('subrace', races), ...keysFor('subclass', classes),
  ...keysFor('subsize', sizes),
  ...sizes.flatMap(size => ['subsize_' + size + '_physical', 'subsize_' + size + '_magical']),
];

export const ITEM_SEARCH_BONUS_OPTIONS: ItemSearchBonusOption[] = [
  ...fixedKeys.map(value => ({ value, label: bonusKeyLabel(value), kind: 'key' as const })),
  { value: 'skillDamage', label: 'Dano de habilidade', kind: 'skill' as const },
  { value: 'chance__', label: 'Chance de ativação', kind: 'prefix' as const },
  { value: 'cd__', label: 'Redução de Recarga', kind: 'prefix' as const },
  { value: 'acd__', label: 'Redução de Pós-conjuração de habilidade', kind: 'prefix' as const },
  { value: 'vct__', label: 'Redução de Conj. Variável de habilidade', kind: 'prefix' as const },
  { value: 'fix_vct__', label: 'Redução fixa de Conj. Variável de habilidade', kind: 'prefix' as const },
  { value: 'fct__', label: 'Redução de Conj. Fixa de habilidade', kind: 'prefix' as const },
  { value: 'fctPercent__', label: 'Redução de Conj. Fixa % de habilidade', kind: 'prefix' as const },
  { value: 'enable_skill__', label: 'Habilita habilidade', kind: 'prefix' as const },
  { value: 'spCost__', label: 'Custo de SP de habilidade', kind: 'prefix' as const },
  { value: 'autoCast', label: 'Autoconjuração', kind: 'autoCast' as const },
  { value: 'autoCastEffect', label: 'Efeito de autoconjuração', kind: 'autoCastEffect' as const },
].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

const optionsByValue = new Map(ITEM_SEARCH_BONUS_OPTIONS.map(option => [option.value, option]));
const prefixes = ITEM_SEARCH_BONUS_OPTIONS.filter(option => option.kind === 'prefix').map(option => option.value);
interface BonusEntry { key: string; prefixes: string[]; skillId?: number; }
function readKey(key: string): BonusEntry {
  const modifiers: string[] = [];
  for (let prefix = prefixes.find(value => key.startsWith(value)); prefix; prefix = prefixes.find(value => key.startsWith(value))) {
    modifiers.push(prefix);
    key = key.slice(prefix.length);
  }
  return { key, prefixes: modifiers, skillId: /^\d+$/.test(key) ? Number(key) : undefined };
}

/** Coverage guard: unknown families never fall back to a generic option. */
export function isSearchableItemBonusKey(key: string): boolean {
  const entry = readKey(key);
  return entry.skillId != null || optionsByValue.get(entry.key)?.kind === 'key';
}

const normalizedName = (name: string) => name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export function filterSearchItems(items: Readonly<Record<number, ItemModel>>, rows: readonly ItemSearchRow[], filters: ItemSearchFilters): ItemSearchRow[] {
  const query = normalizedName(filters.name);
  const positions = new Set(filters.positions);
  const skills = new Set(filters.skillIds);
  const bonuses = [...new Set(filters.bonuses.filter((value): value is string => !!value))];
  const listed = new Set<number>();
  return rows.filter(row => {
    const item = items[row.id];
    if (!item || listed.has(row.id) || positions.size && !positions.has(row.position)) return false;
    if (query && !normalizedName(item.name).includes(query)) return false;
    const entries = itemBonusScriptEntries(item.script).filter(([, expressions]) => expressions.length).map(([key]) => readKey(key));
    const casts = itemAutoCastScripts(item.script);
    const effects = itemAutoCastEffectScripts(item.script);
    if (skills.size && !entries.some(entry => entry.skillId != null && skills.has(entry.skillId)) && !casts.some(cast => skills.has(cast.skillId))) return false;
    const matches = (value: string) => {
      const option = optionsByValue.get(value);
      if (!option) return false;
      if (option.kind === 'autoCast') return casts.some(cast => !skills.size || skills.has(cast.skillId));
      if (option.kind === 'autoCastEffect') return effects.length > 0;
      if (option.kind === 'key' && effects.some(effect => Object.hasOwn(effect.bonusPerRefine ?? {}, value))) return true;
      return entries.some(entry => {
        if (entry.skillId != null && skills.size && !skills.has(entry.skillId)) return false;
        if (option.kind === 'key') return entry.key === value;
        if (option.kind === 'skill') return entry.skillId != null && entry.prefixes.every(prefix => prefix === 'chance__');
        return entry.prefixes.includes(value);
      });
    };
    if (bonuses.length && !(filters.matchAllBonuses ? bonuses.every(matches) : bonuses.some(matches))) return false;
    listed.add(row.id);
    return true;
  });
}
