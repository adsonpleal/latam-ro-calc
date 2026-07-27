/**
 * The build contract agents speak: a share link as the base, sparse overrides on top,
 * or a build from scratch.
 */
import { z } from 'zod';
import { MainItemWithRelations } from 'src/app/constants/item-type.enum';
import { CharacterBase } from 'src/app/jobs/_character-base.abstract';
import { MainModel } from 'src/app/models/main.model';
import { createMainModel, toRawOptionTxtList } from 'src/app/utils';
import { ClassInfo } from '../data/class-registry';
import { Dataset } from '../data/dataset';
import { applyJobBonus, applySkillMaps, clampLevels, resolveAtkSkill } from './derive';
import { applyPreset } from './preset';
import { parseShare } from './share';

export const STAT_KEYS = ['str', 'agi', 'vit', 'int', 'dex', 'luk', 'pow', 'sta', 'wis', 'spl', 'con', 'crt'] as const;

/** Every model field name, taken from the model factory itself. */
const MODEL_KEYS = new Set(Object.keys(createMainModel()));

/** The main equipment slots — the ones the app can compare, each with its own relations. */
export const MAIN_ITEM_SLOTS: readonly string[] = Object.keys(MainItemWithRelations);

/** A main slot's card/enchant keys, empty for slots that have none. */
export const relatedItemKeys = (slot: string): readonly string[] => (MainItemWithRelations as Record<string, string[]>)[slot] ?? [];

/**
 * The model keys that hold an item id — every main slot plus its cards/enchants.
 * Taken from `MainItemWithRelations` rather than pattern-matched, so a new slot is
 * picked up automatically and `*Refine`/`*Grade` are excluded by construction.
 */
export const ITEM_ID_KEYS: readonly string[] = [
  ...MAIN_ITEM_SLOTS,
  ...Object.values(MainItemWithRelations).flat(),
] as string[];

export const buildInputSchema = z
  .object({
    share: z
      .string()
      .optional()
      .describe('Link de compartilhamento do simulador (URL completa, encurtada, fragmento #/?b=… ou o token puro). Base da build.'),
    preset: z.record(z.string(), z.unknown()).optional().describe('Preset bruto, alternativa ao `share`.'),

    class: z.number().int().optional().describe('Id interno da classe (ex.: 4261 Elementalista). Veja list_classes.'),
    level: z.number().int().min(1).max(300).optional(),
    jobLevel: z.number().int().min(1).max(70).optional(),
    stats: z
      // 300 is a sanity guard, not a game rule: the pickers stop at 130 base / 100
      // trait, but a share link or a replay import can legitimately carry more, and
      // validating tighter than the app itself loads would reject valid builds.
      .object(Object.fromEntries(STAT_KEYS.map((k) => [k, z.number().int().min(0).max(300).optional()])) as Record<string, z.ZodOptional<z.ZodNumber>>)
      .optional()
      .describe('Atributos base alocados. POD/STA/SAB/FEI/CON/CRV só valem para classes de 4ª.'),

    gear: z
      .record(z.string(), z.union([z.number().int(), z.string(), z.null()]))
      .optional()
      .describe(
        'Equipamentos por slot: weapon, weaponRefine, weaponCard1..4, weaponEnchant0..3, headUpper, armor, shield, garment, boot, accLeft, accRight, shadow*, costume*, ammo, pet. Use null para limpar.',
      ),

    atkSkill: z.string().optional().describe('Habilidade ofensiva no formato "Nome==Nível" (ex.: "Arrow Storm==10"). Veja list_skills.'),
    skills: z
      .object({
        active: z.record(z.string(), z.number()).optional(),
        passive: z.record(z.string(), z.number()).optional(),
        buffs: z.record(z.string(), z.number()).optional(),
      })
      .optional()
      .describe('Níveis por NOME da habilidade (nunca por posição).'),

    options: z.record(z.string(), z.string().nullable()).optional().describe('Bônus aleatórios por número de slot, no formato "attr:valor".'),
    consumables: z.array(z.number().int()).optional(),
    aspdPotion: z.number().int().optional(),
    propertyAtk: z.string().optional().describe('Elemento do ataque (conversor/endow).'),
  })
  .describe('Build a calcular. Sem `share`/`preset`, parte de uma build vazia com os overrides aplicados.');

export type BuildInput = z.infer<typeof buildInputSchema>;

export interface ResolvedBuild {
  model: MainModel & Record<string, any>;
  char: CharacterBase;
  classInfo: ClassInfo | undefined;
  /** Non-fatal problems worth telling the agent about (unknown item ids, etc.). */
  warnings: string[];
}

/** Apply the sparse overrides onto a model produced by `applyPreset`. */
function applyOverrides(model: any, input: BuildInput, warnings: string[], dataset: Dataset): void {
  if (input.class !== undefined) model.class = input.class;
  if (input.level !== undefined) model.level = input.level;
  if (input.jobLevel !== undefined) model.jobLevel = input.jobLevel;
  if (input.propertyAtk !== undefined) model.propertyAtk = input.propertyAtk;
  if (input.atkSkill !== undefined) model.selectedAtkSkill = input.atkSkill;
  if (input.aspdPotion !== undefined) model.aspdPotion = input.aspdPotion;
  if (input.consumables) model.consumables = [...input.consumables];

  for (const [stat, value] of Object.entries(input.stats ?? {})) {
    if (value !== undefined) model[stat] = value;
  }

  for (const [slot, value] of Object.entries(input.gear ?? {})) {
    if (!MODEL_KEYS.has(slot)) {
      warnings.push(`Slot desconhecido "${slot}" ignorado.`);
      continue;
    }
    model[slot] = value === null ? 0 : value;
  }

  for (const [slot, txt] of Object.entries(input.options ?? {})) {
    const index = Number(slot);
    if (!Number.isInteger(index) || index < 0) {
      warnings.push(`Slot de bônus aleatório inválido "${slot}" ignorado.`);
      continue;
    }
    model.rawOptionTxts[index] = txt;
  }

  // Skill overrides go through the name-keyed maps, which applySkillMaps then turns
  // into the positional arrays the engine reads.
  if (input.skills?.active) model.activeSkillMap = { ...model.activeSkillMap, ...input.skills.active };
  if (input.skills?.passive) model.passiveSkillMap = { ...model.passiveSkillMap, ...input.skills.passive };
  if (input.skills?.buffs) model.skillBuffMap = { ...model.skillBuffMap, ...input.skills.buffs };

  // An id the calculator has no record for is silently ignored by loadItemFromModel,
  // and 7.7k LATAM items legitimately fall in that bucket — so say so out loud.
  for (const key of ITEM_ID_KEYS) {
    const id = model[key];
    if (typeof id !== 'number' || id <= 0 || dataset.items[id]) continue;
    const latamName = dataset.latamItems[id]?.name;
    warnings.push(
      latamName
        ? `Item ${id} ("${latamName}") existe no LATAM mas ainda não está no banco do calculador — ignorado em ${key}.`
        : `Item ${id} desconhecido — ignorado em ${key}.`,
    );
  }
}

/**
 * share/preset → MainModel → derived state → a fresh class instance, ready to solve.
 * Mirrors `loadItemSet`'s ordering: clamp, then job bonus, then skills, then skill choice.
 */
export function resolveBuild(input: BuildInput, dataset: Dataset): ResolvedBuild {
  const warnings: string[] = [];

  let base: Record<string, any> | null = null;
  if (input.share) {
    base = parseShare(input.share).preset;
  } else if (input.preset) {
    base = input.preset as Record<string, any>;
  }

  const model = applyPreset(base) as any;
  applyOverrides(model, input, warnings, dataset);

  if (!dataset.classes.has(model.class)) {
    throw new Error(`Classe ${model.class} não existe ou não está disponível no LATAM. Use list_classes para ver as opções.`);
  }
  const char = dataset.classes.newInstance(model.class);

  clampLevels(model, char);
  applyJobBonus(model, char);
  applySkillMaps(model, char);
  resolveAtkSkill(model, char);
  model.rawOptionTxts = toRawOptionTxtList(model, dataset.items);

  return { model: model as ResolvedBuild['model'], char, classInfo: dataset.classes.get(model.class), warnings };
}
