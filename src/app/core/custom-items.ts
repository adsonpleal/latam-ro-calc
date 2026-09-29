import { ItemModel, ItemScriptValue, itemBonusScriptEntries } from '../models/item.model';
import { ItemSubTypeId } from '../constants/item-sub-type.enum';
import { ItemTypeId } from '../constants/item.const';
import { createRawTotalBonus } from '../utils/create-raw-total-bonus';
import { resolveSkillById, VALID_SKILL_IDS } from '../skills';
import { bonusKeyLabel } from './bonus-key-label';
import { CardPosition } from '../constants/card-position.enum';
import { WeaponSubTypeNameMapById } from '../constants/weapon-type-mapper';
import { ElementType } from '../constants/element-type.const';

export const CUSTOM_ITEM_MIN_ID = 1_000_000_000_000;
export const CUSTOM_ITEM_MAX_ID = 9_000_000_000_000;
export const CUSTOM_ITEM_LIMIT = 20;
export const CUSTOM_ITEM_MAX_BYTES = 256 * 1024;
export const CUSTOM_ITEM_STORAGE_KEY = 'ro-custom-items-v1';

export const CUSTOM_KINDS = [
  'weapon', 'leftWeapon', 'headUpper', 'headMiddle', 'headLower', 'armor', 'shield',
  'garment', 'boot', 'accessory', 'accLeft', 'accRight', 'shadowWeapon', 'shadowArmor',
  'shadowShield', 'shadowBoot', 'shadowEarring', 'shadowPendant',
  'costumeUpper', 'costumeMiddle', 'costumeLower', 'costumeGarment',
  'card', 'enchant', 'costumeEnchantUpper', 'costumeEnchantMiddle',
  'costumeEnchantLower', 'costumeEnchantGarment', 'costumeEnchantGarment2',
  'costumeEnchantGarment4', 'ammo', 'pet', 'consumable',
] as const;
export type CustomKind = typeof CUSTOM_KINDS[number];
export const CUSTOM_KIND_LABELS: Record<CustomKind, string> = {
  weapon: 'Arma', leftWeapon: 'Arma secundária', headUpper: 'Topo', headMiddle: 'Meio', headLower: 'Baixo',
  armor: 'Armadura', shield: 'Escudo', garment: 'Capa', boot: 'Calçado', accLeft: 'Acessório esquerdo',
  accessory: 'Acessório', accRight: 'Acessório direito', shadowWeapon: 'Arma sombria', shadowArmor: 'Armadura sombria',
  shadowShield: 'Escudo sombrio', shadowBoot: 'Calçado sombrio', shadowEarring: 'Brinco sombrio',
  shadowPendant: 'Colar sombrio', costumeUpper: 'Visual de topo', costumeMiddle: 'Visual de meio',
  costumeLower: 'Visual de baixo', costumeGarment: 'Visual de capa', card: 'Carta', enchant: 'Encantamento',
  costumeEnchantUpper: 'Encanto visual de topo', costumeEnchantMiddle: 'Encanto visual de meio',
  costumeEnchantLower: 'Encanto visual de baixo', costumeEnchantGarment: 'Encanto visual de capa',
  costumeEnchantGarment2: 'Encanto visual de capa 2', costumeEnchantGarment4: 'Encanto visual de capa 4',
  ammo: 'Munição', pet: 'Mascote', consumable: 'Consumível',
};

export interface CustomItemDefinition extends ItemModel {
  custom: true;
  schemaVersion: 1;
  revision: number;
  kind: CustomKind;
  iconItemId: number;
  cardCapacity: number;
  enchantCapacity: number;
  baCapacity: number;
  defaultCards: number[];
  defaultEnchants: number[];
  defaultBas: string[];
  baseMatk?: number;
  importSourceId?: number;
  importFingerprint?: string;
}

export type CustomItemDraft = Partial<CustomItemDefinition> & Pick<CustomItemDefinition, 'name' | 'kind'>;
export interface ItemValidationError { path: string; message: string }
export interface BatchValidation { items: CustomItemDefinition[]; errors: ItemValidationError[] }

const EQUIPMENT_KINDS = new Set<string>(CUSTOM_KINDS.filter((k) =>
  !['card', 'enchant', 'ammo', 'pet', 'consumable'].includes(k) && !k.startsWith('costumeEnchant')));
const WEAPON_KINDS = new Set<string>(['weapon', 'leftWeapon']);
const COSTUME_KINDS = new Set<string>(['costumeUpper', 'costumeMiddle', 'costumeLower', 'costumeGarment']);
const SHADOW_KINDS = new Set<string>(CUSTOM_KINDS.filter((k) => k.startsWith('shadow')));
const SLOT_SUBTYPES: Record<string, number> = {
  weapon: 257, leftWeapon: 257, ammo: ItemSubTypeId.Arrow,
  headUpper: ItemSubTypeId.Upper, headMiddle: ItemSubTypeId.Upper, headLower: ItemSubTypeId.Upper,
  armor: ItemSubTypeId.Armor, shield: ItemSubTypeId.Shield, garment: ItemSubTypeId.Garment,
  boot: ItemSubTypeId.Boot, accessory: ItemSubTypeId.Acc, accLeft: ItemSubTypeId.Acc_L, accRight: ItemSubTypeId.Acc_R,
  shadowWeapon: ItemSubTypeId.ShadowWeapon, shadowArmor: ItemSubTypeId.ShadowArmor,
  shadowShield: ItemSubTypeId.ShadowShield, shadowBoot: ItemSubTypeId.ShadowBoot,
  shadowEarring: ItemSubTypeId.ShadowEarring, shadowPendant: ItemSubTypeId.ShadowPendant,
  costumeUpper: ItemSubTypeId.CostumeUpper, costumeMiddle: ItemSubTypeId.CostumeMiddle,
  costumeLower: ItemSubTypeId.CostumeLower, costumeGarment: ItemSubTypeId.CostumeGarment,
  costumeEnchantUpper: ItemSubTypeId.CostumeEnhUpper,
  costumeEnchantMiddle: ItemSubTypeId.CostumeEnhMiddle,
  costumeEnchantLower: ItemSubTypeId.CostumeEnhLower,
  costumeEnchantGarment: ItemSubTypeId.CostumeEnhGarment,
  costumeEnchantGarment2: ItemSubTypeId.CostumeEnhGarment2,
  costumeEnchantGarment4: ItemSubTypeId.CostumeEnhGarment4,
  pet: ItemSubTypeId.Pet,
};

const BONUS_KEYS = new Set(Object.keys(createRawTotalBonus()));
const PREFIXES = ['chance__', 'cd__', 'acd__', 'vct__', 'fix_vct__', 'fct__', 'fctPercent__', 'enable_skill__', 'spCost__'];
const DIRECTIVES = new Set(['autoCast', 'autoCastEffect', 'autoCastPending']);

export function isCustomItem(value: any): value is CustomItemDefinition {
  return value?.custom === true && value?.schemaVersion === 1;
}

export function customItemId(): number {
  const bytes = new Uint32Array(2);
  (globalThis as any).crypto.getRandomValues(bytes);
  return CUSTOM_ITEM_MIN_ID + (bytes[0] * 1024 + bytes[1] % 1024);
}

export function validCustomId(id: unknown): id is number {
  return Number.isSafeInteger(id) && Number(id) >= CUSTOM_ITEM_MIN_ID && Number(id) <= CUSTOM_ITEM_MAX_ID;
}

function itemTypeFor(kind: CustomKind): number {
  if (WEAPON_KINDS.has(kind)) return ItemTypeId.WEAPON;
  if (kind === 'card') return ItemTypeId.CARD;
  if (kind === 'enchant' || kind.startsWith('costumeEnchant')) return ItemTypeId.ENCHANT;
  if (kind === 'ammo') return ItemTypeId.AMMO;
  if (kind === 'consumable') return ItemTypeId.CONSUMABLE;
  if (COSTUME_KINDS.has(kind)) return ItemTypeId.ARMOR;
  return ItemTypeId.ARMOR;
}

export function inferCustomIcon(kind: CustomKind, subtype: number | null | undefined, catalog: Record<number, ItemModel>): number {
  // Azagaia is the basic spear; the preceding ID 1400 is Pique Sobrenatural.
  if (WEAPON_KINDS.has(kind) && subtype === 259) return 1401;
  const representative: Partial<Record<CustomKind, number>> = {
    headUpper: 2228, costumeUpper: 2228, headLower: 2265, costumeLower: 2265,
    accessory: 2607, accLeft: 2607, accRight: 2607,
  };
  if (representative[kind]) return representative[kind]!;
  return Object.values(catalog).find((item) => !item.custom && item.itemTypeId === itemTypeFor(kind)
    && item.itemSubTypeId === (subtype ?? SLOT_SUBTYPES[kind] ?? 0))?.id
    ?? Object.values(catalog).find((item) => !item.custom && item.itemTypeId === itemTypeFor(kind))?.id
    ?? 1101;
}

export function customKindIsEquipment(kind: string): boolean { return EQUIPMENT_KINDS.has(kind); }
export function customKindIsShadow(kind: string): boolean { return SHADOW_KINDS.has(kind); }

const CARD_POSITION_BY_KIND: Partial<Record<CustomKind, CardPosition>> = {
  weapon: CardPosition.Weapon, leftWeapon: CardPosition.Weapon,
  headUpper: CardPosition.Head, headMiddle: CardPosition.Head, headLower: CardPosition.Head,
  armor: CardPosition.Armor, shield: CardPosition.Shield, garment: CardPosition.Garment,
  boot: CardPosition.Boot, accessory: CardPosition.Acc, accLeft: CardPosition.AccL, accRight: CardPosition.AccR,
  shadowWeapon: CardPosition.Weapon, shadowArmor: CardPosition.Armor,
  shadowShield: CardPosition.Shield, shadowBoot: CardPosition.Boot,
  shadowEarring: CardPosition.AccL, shadowPendant: CardPosition.AccR,
  costumeUpper: CardPosition.Head, costumeMiddle: CardPosition.Head,
  costumeLower: CardPosition.Head, costumeGarment: CardPosition.Garment,
};

export function cardFitsCustomKind(card: ItemModel, kind: CustomKind): boolean {
  const position = CARD_POSITION_BY_KIND[kind];
  return card.compositionPos == null || card.compositionPos === CardPosition.All || position === undefined
    || position === CardPosition.Weapon && card.compositionPos === CardPosition.Weapon
    || position !== CardPosition.Weapon && (card.compositionPos & position) !== 0;
}

export function catalogBonusKey(key: string): boolean {
  if (DIRECTIVES.has(key)) return true;
  let tail = key;
  for (let i = 0; i < 4; i++) {
    const prefix = PREFIXES.find((p) => tail.startsWith(p));
    if (!prefix) break;
    tail = tail.slice(prefix.length);
  }
  return BONUS_KEYS.has(tail) || /^cri_race_[a-z_]+$/.test(tail)
    || (/^\d+$/.test(tail) && VALID_SKILL_IDS.has(Number(tail)));
}

/** Reject unknown tokens and malformed numeric tails before the engine can treat them as zero. */
export function validateScript(script: unknown, path = 'script'): ItemValidationError[] {
  const errors: ItemValidationError[] = [];
  if (!script || typeof script !== 'object' || Array.isArray(script)) return [{ path, message: 'O script deve ser um objeto JSON.' }];
  for (const [key, entries] of Object.entries(script as Record<string, unknown>)) {
    const at = `${path}.${key}`;
    if (!catalogBonusKey(key)) { errors.push({ path: at, message: 'Bônus não reconhecido pelo simulador.' }); continue; }
    if (!Array.isArray(entries)) { errors.push({ path: at, message: 'Use uma lista de efeitos.' }); continue; }
    if (DIRECTIVES.has(key)) {
      for (const [index, entry] of entries.entries()) {
        const field = `${at}[${index}]`;
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          errors.push({ path: field, message: 'A diretiva precisa ser um objeto.' });
          continue;
        }
        const value = entry as Record<string, unknown>;
        if (key === 'autoCast' && (typeof value['skillId'] !== 'number' || !Number.isSafeInteger(value['skillId']) || !VALID_SKILL_IDS.has(Number(value['skillId']))
          || !Array.isArray(value['skillLevel']) || !Array.isArray(value['chance'])
          || !['physical-attack', 'physical-hit', 'melee-physical-attack', 'melee-physical-hit', 'ranged-physical-hit', 'magic-attack'].includes(String(value['trigger'])))) {
          errors.push({ path: field, message: 'Autoconjuração exige skillId válido, skillLevel[], chance[] e trigger suportado.' });
        }
        if (key === 'autoCast') {
          for (const nested of ['skillLevel', 'chance'] as const) {
            const lines = value[nested];
            if (!Array.isArray(lines)) continue;
            errors.push(...validateScript({ atk: lines }, `${field}.${nested}`).map((error) => ({
              ...error, path: error.path.replace('.atk[', '['),
            })));
          }
          if (value['skillLevelMode'] != null && !['fixed', 'highest-learned', 'learned-only'].includes(String(value['skillLevelMode']))) {
            errors.push({ path: `${field}.skillLevelMode`, message: 'Modo de nível da autoconjuração não reconhecido.' });
          }
        }
        if (key === 'autoCastEffect' && (typeof value['name'] !== 'string' || typeof value['label'] !== 'string'
          || typeof value['chance'] !== 'number' || !Number.isFinite(value['chance'])
          || typeof value['durationSeconds'] !== 'number' || !Number.isFinite(value['durationSeconds']))) {
          errors.push({ path: field, message: 'Efeito exige name, label, chance e durationSeconds.' });
        }
        if (key === 'autoCastEffect') {
          if (value['requiredEquippedItemIds'] != null && (!Array.isArray(value['requiredEquippedItemIds'])
            || value['requiredEquippedItemIds'].some((id: unknown) => !Number.isSafeInteger(id)))) {
            errors.push({ path: `${field}.requiredEquippedItemIds`, message: 'Use uma lista de IDs de itens.' });
          }
          if (value['bonusPerRefine'] != null && (!value['bonusPerRefine'] || typeof value['bonusPerRefine'] !== 'object'
            || Array.isArray(value['bonusPerRefine']) || Object.entries(value['bonusPerRefine']).some(([bonus, amount]) =>
              !catalogBonusKey(bonus) || typeof amount !== 'number' || !Number.isFinite(amount)))) {
            errors.push({ path: `${field}.bonusPerRefine`, message: 'Bônus por refino deve usar chaves conhecidas e valores numéricos.' });
          }
        }
        if (key === 'autoCastPending' && (typeof value['skillName'] !== 'string' || typeof value['reason'] !== 'string')) {
          errors.push({ path: field, message: 'Autoconjuração indisponível exige skillName e reason.' });
        }
        if (key === 'autoCastPending' && value['skillId'] != null && !VALID_SKILL_IDS.has(Number(value['skillId']))) {
          errors.push({ path: `${field}.skillId`, message: 'Habilidade indisponível deve usar ID conhecido.' });
        }
      }
      continue;
    }
    for (const [index, entry] of entries.entries()) {
      if (typeof entry !== 'string' || !entry.trim() || entry.length > 1024) {
        errors.push({ path: `${at}[${index}]`, message: 'Expressão deve ser texto não vazio de até 1024 caracteres.' });
        continue;
      }
      const field = `${at}[${index}]`;
      if ((entry.match(/\[/g) ?? []).length !== (entry.match(/\]/g) ?? []).length) {
        errors.push({ path: field, message: 'Colchetes da condição não estão fechados.' });
        continue;
      }
      for (const [, token, body] of entry.matchAll(/(EQUIP_ID|SKILL_ID|SKILL_ID2|ACTIVE_SKILL_ID|AMMO_SUBTYPE|LOYALTY|UNTIL|GRADE|REFINE|LEVEL)\[([^\]]*)\]/g)) {
        const pattern = ({
          EQUIP_ID: /^\d+(?:(?:\|\||&&)\d+)*$/,
          SKILL_ID: /^\d+==[1-9]\d*$/,
          SKILL_ID2: /^\d+==[1-9]\d*$/,
          ACTIVE_SKILL_ID: /^\d+$/,
          AMMO_SUBTYPE: /^\d+$/,
          LOYALTY: /^[1-4]$/,
          UNTIL: /^\d{4}-\d{2}-\d{2}$/,
          GRADE: /^(?:me|[a-zA-Z]+)==[DCBA]$/,
          REFINE: /^(?:\d+|[a-zA-Z,]+==\d+(?:\(\d+\))?)$/,
          LEVEL: /^\d+(?:-\d+)?$/,
        } as Record<string, RegExp>)[token];
        if (!pattern.test(body)) errors.push({ path: field, message: `Condição ${token} inválida.` });
        if (['SKILL_ID', 'SKILL_ID2', 'ACTIVE_SKILL_ID'].includes(token)
          && /^\d+/.test(body) && !VALID_SKILL_IDS.has(Number(body.match(/^\d+/)![0]))) {
          errors.push({ path: field, message: `Habilidade ${body} não está no catálogo.` });
        }
      }
      const numericTail = entry.match(/(?:---|===)([^=]*)$/);
      if (numericTail && !/^-?\d+(?:\.\d+)?(?:\([^)]*\))?$/.test(numericTail[1])) {
        errors.push({ path: field, message: 'O valor após a condição deve ser numérico.' });
      }
      // A full grammar check also catches typos in condition names. The numeric tail is
      // intentionally permissive about the legacy `---` / `===` forms in item.json.
      const remainder = entry.replace(/(?:EQUIP_ID|EQUIP|GRADE|GRADES|REFINE|XREFINEX|ITEM_LV|POS|POS_SPECIFIC|SPAWN|USED|UNTIL|WEAPON_LEVEL|WEAPON_TYPE|AMMO_SUBTYPE|SKILL_ID|SKILL_ID2|ACTIVE_SKILL_ID|LEARN_SKILL|LEARN_SKILL2|ACTIVE_SKILL|LEVEL|LOYALTY|SUM|REFINE_FROM|GVALUE|REFINE_NAME)\[[^\]]+\]/g, '')
        .replace(/^\[weaponType=[^\]]+\]/, '');
      if (/\[[^\]]*\]|[A-Za-z_]+\[/.test(remainder) || !/^-?(?:\d+(?:\.\d+)?|(?:level|jobLevel|str|agi|vit|int|dex|luk):[^=]+)(?:(?:---|===).+)?(?:\([^)]*\))?$/.test(remainder.replace(/^===/, '').replace(/^---/, '1---'))) {
        errors.push({ path: field, message: 'Condição ou valor não reconhecido; confira a expressão do simulador.' });
      }
    }
  }
  return errors;
}

const boundedInt = (value: unknown, min: number, max: number, path: string, errors: ItemValidationError[]): number => {
  const n = Number(value ?? 0);
  if (!Number.isInteger(n) || n < min || n > max) errors.push({ path, message: `Informe um inteiro de ${min} a ${max}.` });
  return n;
};

/** Normalize a whole batch before writing anything. No input object is mutated. */
export function validateCustomItems(raw: unknown, catalog: Record<number, ItemModel> = {}): BatchValidation {
  const errors: ItemValidationError[] = [];
  try {
    if (new TextEncoder().encode(JSON.stringify(raw)).length > CUSTOM_ITEM_MAX_BYTES) {
      return { items: [], errors: [{ path: 'items', message: 'Lote grande demais; limite de 256 KiB.' }] };
    }
  } catch {
    return { items: [], errors: [{ path: 'items', message: 'Lote JSON inválido.' }] };
  }
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > CUSTOM_ITEM_LIMIT) {
    return { items: [], errors: [{ path: 'items', message: `Envie de 1 a ${CUSTOM_ITEM_LIMIT} itens.` }] };
  }
  const used = new Set<number>();
  const ids = raw.map((draft: any, index) => {
    const id = draft?.id ?? customItemId();
    if (!validCustomId(id) || used.has(id) || (catalog[id] && !isCustomItem(catalog[id]))) {
      errors.push({ path: `items[${index}].id`, message: 'ID personalizado inválido ou duplicado.' });
    }
    used.add(id);
    return id;
  });
  const items: CustomItemDefinition[] = raw.map((draft: any, index) => {
    const path = `items[${index}]`;
    const kind = draft?.kind as CustomKind;
    if (!CUSTOM_KINDS.includes(kind)) errors.push({ path: `${path}.kind`, message: 'Tipo de item não reconhecido.' });
    const name = String(draft?.name ?? '').trim();
    if (!name) errors.push({ path: `${path}.name`, message: 'Informe um nome.' });
    const equip = customKindIsEquipment(kind);
    const subtype = Number(draft?.itemSubTypeId ?? SLOT_SUBTYPES[kind] ?? 0);
    if (WEAPON_KINDS.has(kind) && !(subtype in WeaponSubTypeNameMapById)) {
      errors.push({ path: `${path}.itemSubTypeId`, message: 'Escolha um tipo de arma suportado (256–278).' });
    }
    if (kind === 'ammo' && ![ItemSubTypeId.Arrow, ItemSubTypeId.Cannonball, ItemSubTypeId.Kunai,
      ItemSubTypeId.Bullet, ItemSubTypeId.ThrowingDagger].includes(subtype)) {
      errors.push({ path: `${path}.itemSubTypeId`, message: 'Escolha um tipo de munição suportado.' });
    }
    for (const [field, min, max] of [
      ['itemSubTypeId', 0, 4096], ['itemLevel', 0, 5], ['attack', 0, 100000],
      ['baseMatk', 0, 100000], ['defense', 0, 100000], ['weight', 0, 100000],
      ['compositionPos', -1, 4096],
    ] as const) {
      if (draft?.[field] != null && draft[field] !== '') boundedInt(draft[field], min, max, `${path}.${field}`, errors);
    }
    if (draft?.propertyAtk != null && !Object.values(ElementType).includes(draft.propertyAtk)) {
      errors.push({ path: `${path}.propertyAtk`, message: 'Escolha uma propriedade elemental da lista.' });
    }
    if (draft?.usableClass != null && (!Array.isArray(draft.usableClass)
      || draft.usableClass.some((value: unknown) => typeof value !== 'string' || value.length > 50))) {
      errors.push({ path: `${path}.usableClass`, message: 'Classes permitidas devem ser uma lista de nomes.' });
    }
    if (draft?.locations != null && (!Array.isArray(draft.locations)
      || draft.locations.some((value: unknown) => !['Upper', 'Middle', 'Lower'].includes(String(value))))) {
      errors.push({ path: `${path}.locations`, message: 'Ocupação de cabeça deve usar Topo, Meio ou Baixo.' });
    }
    const cardCapacity = boundedInt(draft?.cardCapacity, 0, equip ? 4 : 0, `${path}.cardCapacity`, errors);
    const enchantCapacity = boundedInt(draft?.enchantCapacity, 0, equip ? 4 : 0, `${path}.enchantCapacity`, errors);
    if (cardCapacity + enchantCapacity > 4) errors.push({ path: `${path}.enchantCapacity`, message: 'Cartas e encantamentos compartilham quatro posições.' });
    const baCapacity = boundedInt(draft?.baCapacity, 0, equip ? 5 : 0, `${path}.baCapacity`, errors);
    const script = draft?.script ?? {};
    errors.push(...validateScript(script, `${path}.script`));
    const defaultCards = Array.isArray(draft?.defaultCards) ? [...draft.defaultCards] : [];
    const defaultEnchants = Array.isArray(draft?.defaultEnchants) ? [...draft.defaultEnchants] : [];
    const defaultBas = Array.isArray(draft?.defaultBas) ? [...draft.defaultBas] : [];
    if (defaultCards.length > cardCapacity || defaultEnchants.length > enchantCapacity || defaultBas.length > baCapacity) {
      errors.push({ path: `${path}.defaults`, message: 'Seleções excedem as capacidades do item.' });
    }
    defaultBas.forEach((line, at) => {
      const matched = typeof line === 'string' && line.match(/^([A-Za-z][A-Za-z0-9_]*):(-?\d+(?:\.\d+)?)$/);
      if (!matched || !catalogBonusKey(matched[1])) {
        errors.push({ path: `${path}.defaultBas[${at}]`, message: 'BA deve usar uma chave de bônus conhecida e valor numérico, como atk:10.' });
      }
    });
    const iconItemId = Number(draft?.iconItemId || inferCustomIcon(kind, draft?.itemSubTypeId, catalog));
    const item: CustomItemDefinition = {
      id: ids[index], name, aegisName: `custom_${ids[index]}`,
      slots: cardCapacity, itemTypeId: itemTypeFor(kind),
      itemSubTypeId: subtype,
      itemLevel: draft?.itemLevel ?? null, attack: draft?.attack ?? null,
      defense: draft?.defense ?? 0, weight: draft?.weight ?? 0,
      location: draft?.location ?? (kind === 'headMiddle' ? 'Middle' : kind === 'headLower' ? 'Lower' : kind === 'headUpper' ? 'Upper' : null),
      ...(Array.isArray(draft?.locations) ? { locations: [...draft.locations] } : {}),
      ...(draft?.propertyAtk != null ? { propertyAtk: draft.propertyAtk } : {}),
      compositionPos: draft?.compositionPos ?? null, usableClass: draft?.usableClass?.length ? draft.usableClass : undefined,
      isRefinable: Boolean(draft?.isRefinable), canGrade: Boolean(draft?.canGrade),
      script: structuredClone(script) as Record<string, ItemScriptValue>,
      custom: true, schemaVersion: 1, revision: Number(draft?.revision ?? 1), kind,
      iconItemId, cardCapacity, enchantCapacity, baCapacity,
      defaultCards, defaultEnchants, defaultBas,
      ...(draft?.baseMatk != null ? { baseMatk: Number(draft.baseMatk) } : {}),
      presentInLatam: true,
    };
    return item;
  });
  const known = new Set([...Object.keys(catalog).map(Number), ...ids]);
  const normalized = { ...catalog, ...Object.fromEntries(items.map((item) => [item.id, item])) };
  for (const [index, item] of items.entries()) {
    for (const [field, references] of [['defaultCards', item.defaultCards], ['defaultEnchants', item.defaultEnchants]] as const) {
      references.forEach((id, at) => {
        if (!Number.isSafeInteger(id) || !known.has(id)) errors.push({ path: `items[${index}].${field}[${at}]`, message: `Item ${id} não encontrado.` });
        const attachment = normalized[id];
        if (attachment && field === 'defaultCards' && attachment.itemTypeId !== ItemTypeId.CARD) {
          errors.push({ path: `items[${index}].${field}[${at}]`, message: 'A seleção precisa ser uma carta.' });
        }
        if (attachment && field === 'defaultEnchants' && attachment.itemTypeId !== ItemTypeId.ENCHANT) {
          errors.push({ path: `items[${index}].${field}[${at}]`, message: 'A seleção precisa ser um encantamento.' });
        }
        if (attachment && field === 'defaultCards' && !cardFitsCustomKind(attachment, item.kind))
          errors.push({ path: `items[${index}].${field}[${at}]`, message: 'Carta incompatível com a posição do equipamento.' });
      });
    }
    for (const [key, lines] of itemBonusScriptEntries(item.script)) {
      for (const [lineIndex, line] of lines.entries()) {
        for (const match of line.matchAll(/EQUIP_ID\[([^\]]+)]/g)) {
          for (const token of match[1].split(/\|\||&&/)) {
            if (!known.has(Number(token))) errors.push({ path: `items[${index}].script.${key}[${lineIndex}]`, message: `Item de combinação ${token} não encontrado.` });
          }
        }
      }
    }
    const effects = Array.isArray(item.script['autoCastEffect']) ? item.script['autoCastEffect'] as any[] : [];
    for (const [effectIndex, effect] of effects.entries()) {
      const references = Array.isArray(effect?.requiredEquippedItemIds) ? effect.requiredEquippedItemIds : [];
      for (const [at, id] of references.entries()) {
        if (!known.has(id)) errors.push({ path: `items[${index}].script.autoCastEffect[${effectIndex}].requiredEquippedItemIds[${at}]`,
          message: `Item de combinação ${id} não encontrado.` });
      }
    }
  }
  return { items: errors.length ? [] : items, errors };
}

export function customItemDescription(item: CustomItemDefinition): string {
  const position = (value: string) => value === 'me' ? 'este item' : CUSTOM_KIND_LABELS[value as CustomKind] ?? value;
  const list = (value: string) => value.replace(/&&/g, ' e ').replace(/\|\|/g, ' ou ');
  const stat = (value: string) => ({ level: 'nível de base', jobLevel: 'nível de classe' }[value] ?? bonusKeyLabel(value));
  const skill = (value: string) => resolveSkillById(Number(value))?.name ?? value;
  const describe = (key: string, expression: string): string => {
    const label = bonusKeyLabel(key);
    const plain = expression.match(/^(-?\d+(?:\.\d+)?)$/);
    if (plain) return `${label} ${Number(plain[1]) >= 0 ? '+' : ''}${plain[1]}`;
    const exact = expression.match(/^(\d+)===(-?\d+(?:\.\d+)?)$/);
    if (exact) return `A partir do refino +${exact[1]}: ${label} ${Number(exact[2]) >= 0 ? '+' : ''}${exact[2]}`;
    const step = expression.match(/^(\d+)---(-?\d+(?:\.\d+)?)$/);
    if (step) return `A cada ${step[1]} refino(s): ${label} ${Number(step[2]) >= 0 ? '+' : ''}${step[2]}`;
    const statRule = expression.match(/^(level|jobLevel|str|agi|vit|int|dex|luk):(\d+)(?:\(([^)]+)\))?(---|===|&&)(.+)$/);
    if (statRule) return `${statRule[4] === '---' ? 'A cada' : 'Com pelo menos'} ${statRule[2]} de ${stat(statRule[1])}${statRule[3] ? ' (faixa ' + statRule[3] + ')' : ''}: ${describe(key, statRule[5])}`;
    const scale = expression.match(/^(REFINE|REFINE_NAME|SUM|GVALUE|SKILL_ID|LEARN_SKILL)\[(.+)==(\d+)(?:\((\d+)\))?]---(.+)$/);
    if (scale) {
      const subject = scale[1] === 'SUM' ? `soma de ${scale[2].split(',').map(stat).join(' + ')}`
        : scale[1] === 'SKILL_ID' || scale[1] === 'LEARN_SKILL' ? `níveis de ${skill(scale[2])}`
        : scale[1] === 'GVALUE' ? `graus de ${position(scale[2])}`
        : `refinos de ${scale[2].split(',').map(position).join(' + ')}`;
      return `A cada ${scale[3]} ${subject}${scale[4] ? ' (até ' + scale[4] + ')' : ''}: ${describe(key, scale[5])}`;
    }
    const refineFrom = expression.match(/^REFINE_FROM\[(\d+)]---(.+)$/);
    if (refineFrom) return `A cada refino a partir de +${refineFrom[1]}: ${describe(key, refineFrom[2])}`;
    const combo = expression.match(/^EQUIP_ID\[([^\]]+)](?:===)?(-?\d+(?:\.\d+)?)$/);
    if (combo) return `Com item(ns) ${list(combo[1])}: ${label} ${Number(combo[2]) >= 0 ? '+' : ''}${combo[2]}`;
    const simpleConditions: [RegExp, (value: string) => string][] = [
      [/^REFINE\[(\d+)]/, (n) => `refino mínimo +${n}`],
      [/^GRADE\[([^\]]+)]/, (value) => { const [slot, grade] = value.split('=='); return `${position(slot)} no grau ${grade} ou superior`; }],
      [/^GRADES\[([^\]]+)]/, (value) => value.split('&&').map((entry) => { const [slot, grade] = entry.split('=='); return `${position(slot)} no grau ${grade} ou superior`; }).join(' e ')],
      [/^REFINE\[([^\]]+)]/, (value) => { const [slots, threshold] = value.split('=='); return `soma dos refinos de ${slots.split(',').map(position).join(' + ')} de pelo menos ${threshold}`; }],
      [/^LEVEL\[([^\]]+)]/, (range) => `nível ${range}`],
      [/^LOYALTY\[([1-4])]/, (tier) => `lealdade ${['', 'baixa', 'nenhuma', 'normal', 'alta'][Number(tier)]}`],
      [/^EQUIP_ID\[([^\]]+)]/, (ids) => `equipado com ID ${list(ids)}`],
      [/^EQUIP\[([^\]]+)]/, (names) => `equipado com ${list(names)}`],
      [/^SKILL_ID2?\[([^\]]+)]/, (value) => { const [id, level] = value.split('=='); return `${skill(id)} aprendida no nível ${level} ou superior`; }],
      [/^LEARN_SKILL2?\[([^\]]+)]/, (value) => { const [name, level] = value.split('=='); return `${name} aprendida no nível ${level} ou superior`; }],
      [/^ACTIVE_SKILL_ID\[(\d+)]/, (id) => `habilidade ${skill(id)} ativa`],
      [/^ACTIVE_SKILL\[([^\]]+)]/, (name) => `habilidade ${name} ativa`],
      [/^WEAPON_TYPE\[([^\]]+)]/, (type) => `arma ${type}`],
      [/^AMMO_SUBTYPE\[([^\]]+)]/, (type) => `munição ${type}`],
      [/^POS\[([^\]]+)]/, (slot) => `posição ${position(slot)}`],
      [/^POS_SPECIFIC\[([^\]]+)]/, (value) => { const [slot, name] = value.split('=='); return `${name} em ${position(slot)}`; }],
      [/^ITEM_LV\[([^\]]+)]/, (value) => { const [slot, level] = value.split('=='); return `${position(slot)} de nível ${level}`; }],
      [/^WEAPON_LEVEL\[([^\]]+)]/, (level) => `arma de nível ${level}`],
      [/^\[weaponType=([^\]]+)]/, (type) => `arma do tipo ${type}`],
      [/^XREFINEX\[([^\]]+)]/, (value) => { const [slot, level] = value.split('=='); return `${position(slot)} no refino +${level} ou superior`; }],
      [/^SUM\[([^\]]+)]/, (value) => { const [stats, threshold] = value.split('=='); return `soma de ${stats.split(',').map(stat).join(' + ')} de pelo menos ${threshold}`; }],
      [/^SPAWN\[([^\]]+)]/, (map) => `mapa ${map}`],
      [/^UNTIL\[([^\]]+)]/, (date) => `até ${date}`],
      [/^USED\[([^\]]+)]/, (name) => `classe ${list(name)}`],
    ];
    const condition = simpleConditions.find(([pattern]) => pattern.test(expression));
    if (condition) {
      const match = expression.match(condition[0])!;
      return `${condition[1](match[1])}: ${describe(key, expression.slice(match[0].length).replace(/^===/, ''))}`;
    }
    const annotatedValue = expression.match(/^(.+\d)\(([^)]+)\)$/);
    if (annotatedValue) return `${describe(key, annotatedValue[1])} (${annotatedValue[2]})`;
    return `${label}: efeito condicional sem descrição disponível. Consulte o editor Script.`;
  };
  const rows = itemBonusScriptEntries(item.script).flatMap(([key, values]) => values.map((value) => describe(key, value)));
  for (const effect of (item.script['autoCast'] ?? []) as any[]) {
    const trigger = ({
      'physical-attack': 'ao atacar fisicamente', 'physical-hit': 'ao acertar um ataque físico',
      'melee-physical-attack': 'ao atacar corpo a corpo', 'melee-physical-hit': 'ao acertar corpo a corpo',
      'ranged-physical-hit': 'ao acertar à distância', 'magic-attack': 'ao atacar com magia',
    } as Record<string, string>)[effect.trigger] ?? 'gatilho automático';
    rows.push(`Autoconjuração de ${skill(String(effect.skillId))} ${trigger}.`);
    rows.push(...(effect.skillLevel ?? []).map((line: string) => describe('Nível', line)),
      ...(effect.chance ?? []).map((line: string) => describe('Chance %', line)));
  }
  for (const effect of (item.script['autoCastEffect'] ?? []) as any[]) {
    rows.push(`Efeito automático ${effect.label}: chance ${effect.chance}%, duração ${effect.durationSeconds}s.`);
  }
  for (const effect of (item.script['autoCastPending'] ?? []) as any[]) {
    rows.push(`Autoconjuração indisponível de ${effect.skillName}: ${effect.reason}.`);
  }
  return rows.join('\n') || 'Sem bônus mapeados';
}

export function customItemDescriptionHtml(item: CustomItemDefinition): string {
  return customItemDescription(item).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

/** The portable closure of definitions a build needs, including attachment defaults
 * and ID-based combinations. A snapshot is taken when sharing or saving. */
export function customDefinitionsForBuild(models: Record<string, any>[], catalog: Record<number, ItemModel>): CustomItemDefinition[] {
  const selected = new Set<number>();
  const visitValue = (value: unknown): void => {
    if (typeof value === 'number' && isCustomItem(catalog[value])) selected.add(value);
    else if (Array.isArray(value)) value.forEach(visitValue);
    else if (value && typeof value === 'object') Object.values(value).forEach(visitValue);
  };
  models.forEach(visitValue);
  const pending = [...selected];
  while (pending.length) {
    const item = catalog[pending.pop()!] as CustomItemDefinition;
    if (!item) continue;
    const dependencies = [...item.defaultCards, ...item.defaultEnchants,
      ...((item.script['autoCastEffect'] ?? []) as any[]).flatMap((effect) => effect.requiredEquippedItemIds ?? [])];
    for (const [, lines] of itemBonusScriptEntries(item.script)) {
      for (const line of lines) for (const match of line.matchAll(/EQUIP_ID\[([^\]]+)]/g)) {
        dependencies.push(...(match[1].match(/\d+/g) ?? []).map(Number));
      }
    }
    for (const id of dependencies) if (isCustomItem(catalog[id]) && !selected.has(id)) {
      selected.add(id); pending.push(id);
    }
  }
  return [...selected].map((id) => structuredClone(catalog[id] as CustomItemDefinition));
}
