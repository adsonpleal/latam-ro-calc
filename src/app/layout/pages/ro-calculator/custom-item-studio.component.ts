import { Component, EventEmitter, Input, Output } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ItemModel, itemBonusScriptEntries } from 'src/app/models/item.model';
import { MainModel } from 'src/app/models/main.model';
import { MonsterModel } from 'src/app/models/monster.model';
import { CharacterBase } from 'src/app/jobs';
import { Calculator } from 'src/app/core/calculator';
import { ItemTypeEnum } from 'src/app/constants/item-type.enum';
import { CardPosition } from 'src/app/constants/card-position.enum';
import { bonusKeyLabel } from 'src/app/core/bonus-key-label';
import { createRawTotalBonus } from 'src/app/utils/create-raw-total-bonus';
import {
  CUSTOM_KINDS, CUSTOM_KIND_LABELS, CustomItemDefinition, CustomItemDraft, CustomKind,
  CUSTOM_ITEM_MAX_BYTES, customDefinitionsForBuild, customItemDescription, customItemId, validateCustomItems,
  cardFitsCustomKind, customKindIsEquipment, inferCustomIcon,
} from 'src/app/core/custom-items';
import { CustomItemLibraryService } from 'src/app/api-services/custom-item-library.service';
import { encodeCustomBundle } from 'src/app/core/custom-item-library';
import { ExtraOptionMap } from 'src/app/utils/create-extra-option-list';
import { WeaponSubTypeNameMapById } from 'src/app/constants/weapon-type-mapper';
import { ItemSubTypeId } from 'src/app/constants/item-sub-type.enum';
import { selectLoyaltyLines } from 'src/app/constants/pet-loyalty';

interface Rule { key: string; expression: string }
interface CreateContext { slot: string; compare: boolean }

@Component({
  selector: 'app-custom-item-studio',
  templateUrl: './custom-item-studio.component.html',
  styleUrls: ['./custom-item-studio.component.css'],
})
export class CustomItemStudioComponent {
  @Input() items: Record<number, ItemModel> = {};
  @Input() currentModel?: MainModel;
  @Input() character?: CharacterBase;
  @Input() currentMonster?: MonsterModel;
  @Output() saved = new EventEmitter<{ item: CustomItemDefinition; context?: CreateContext }>();
  @Output() deleted = new EventEmitter<number>();

  visible = false;
  libraryMode = true;
  mcpVisible = false;
  mode: 'visual' | 'json' = 'visual';
  mobileView: 'editor' | 'preview' = 'editor';
  section: 'item' | 'sockets' | 'bonuses' = 'item';
  draft: CustomItemDraft = this.blank('weapon');
  rawScript = '{}';
  private rawError = '';
  rules: Rule[] = [];
  importQuery = '';
  importOpen = false;
  libraryQuery = '';
  libraryKind = '';
  importedBackup: { raw: string; script: CustomItemDraft['script']; rules: Rule[] } | null = null;
  diagnostics: string[] = [];
  context?: CreateContext;
  copied = false;
  selectedCard = 0;
  selectedEnchant = 0;
  selectedBa = '';
  cardOptions: ItemModel[] = [];
  enchantOptions: ItemModel[] = [];
  private catalogRows: ItemModel[] = [];
  previewIcon = 1101;
  previewRefine = 0;
  previewGrade = '';
  previewLoyalty = 4;
  previewBonuses: { label: string; value: number }[] = [];
  previewRules: { label: string; reason: string; active: boolean; value: number }[] = [];
  previewText = '';
  private previewItem?: CustomItemDefinition;
  capacityNotice = '';

  readonly kinds = CUSTOM_KINDS;
  readonly kindLabels = CUSTOM_KIND_LABELS;
  readonly baOptions = [...ExtraOptionMap.entries()];
  readonly weaponSubtypes = Object.entries(WeaponSubTypeNameMapById).map(([id, label]) => ({
    id: Number(id), label: ({
      Dagger: 'Adaga', Sword: 'Espada', 'Two-Handed Sword': 'Espada de duas mãos',
      Spear: 'Lança', 'Two-Handed Spear': 'Lança de duas mãos', Axe: 'Machado',
      'Two-Handed Axe': 'Machado de duas mãos', Mace: 'Maça', 'Two-Handed Mace': 'Maça de duas mãos',
      Rod: 'Cajado', 'Two-Handed Rod': 'Cajado de duas mãos', Bow: 'Arco', Fistweapon: 'Soqueira',
      Instrument: 'Instrumento', Whip: 'Chicote', Book: 'Livro', Katar: 'Katar',
      Revolver: 'Revólver', Rifle: 'Rifle', 'Gatling Gun': 'Metralhadora', Shotgun: 'Espingarda',
      'Grenade Launcher': 'Lança-granadas', Shuriken: 'Shuriken',
    } as Record<string, string>)[label] ?? label,
  }));
  readonly ammoSubtypes = [ItemSubTypeId.Arrow, ItemSubTypeId.Cannonball, ItemSubTypeId.Kunai,
    ItemSubTypeId.Bullet, ItemSubTypeId.ThrowingDagger].map((id) => ({ id, label: ({
      [ItemSubTypeId.Arrow]: 'Flecha', [ItemSubTypeId.Cannonball]: 'Bala de canhão',
      [ItemSubTypeId.Kunai]: 'Kunai', [ItemSubTypeId.Bullet]: 'Projétil',
      [ItemSubTypeId.ThrowingDagger]: 'Adaga de arremesso',
    } as Record<number, string>)[id] }));
  readonly cardPositions = [
    ['Arma', CardPosition.Weapon], ['Topo, meio e baixo', CardPosition.Head],
    ['Escudo', CardPosition.Shield], ['Armadura', CardPosition.Armor],
    ['Capa', CardPosition.Garment], ['Calçado', CardPosition.Boot],
    ['Acessórios', CardPosition.Acc], ['Acessório esquerdo', CardPosition.AccL],
    ['Acessório direito', CardPosition.AccR], ['Qualquer posição', CardPosition.All],
  ] as const;
  readonly isEquipment = customKindIsEquipment;
  readonly mcpUrl = environment.mcpUrl;
  readonly bonusKeys = Object.keys(createRawTotalBonus()).map((key) => ({ key, label: bonusKeyLabel(key) }));
  readonly conditionKinds = [
    ['none', 'Sem condição'], ['refine', 'Refino mínimo'], ['refineStep', 'A cada X refinos'],
    ['grade', 'Grau mínimo'], ['level', 'Nível mínimo'], ['stat', 'A cada X do atributo'],
    ['equip', 'Equipado junto'], ['class', 'Classe'], ['skill', 'Perícia aprendida'],
    ['activeSkill', 'Perícia ativa'], ['loyalty', 'Lealdade do pet'],
    ['weaponType', 'Tipo de arma'], ['ammoType', 'Tipo de munição'],
    ['position', 'Posição'], ['spawn', 'Mapa do monstro'], ['until', 'Válido até (data)'],
  ];
  condition = 'none';
  conditionValue = '';
  conditionExtra = '';

  constructor(public readonly library: CustomItemLibraryService) {}

  blank(kind: CustomKind): CustomItemDraft {
    return {
      name: '', kind, script: {}, cardCapacity: 0, enchantCapacity: 0, baCapacity: 0,
      defaultCards: [], defaultEnchants: [], defaultBas: [],
      isRefinable: ['weapon', 'leftWeapon', 'headUpper', 'armor', 'shield', 'garment', 'boot'].includes(kind) || kind.startsWith('shadow'),
      canGrade: ['weapon', 'leftWeapon', 'headUpper', 'armor', 'shield', 'garment', 'boot'].includes(kind),
      itemLevel: kind === 'weapon' || kind === 'leftWeapon' ? 5 : null,
      itemSubTypeId: kind === 'weapon' || kind === 'leftWeapon' ? 257 : kind === 'ammo' ? ItemSubTypeId.Arrow : undefined,
      attack: 0, baseMatk: 0, defense: 0, weight: 0,
    };
  }

  openLibrary(): void { this.visible = true; this.libraryMode = true; this.context = undefined; }

  openCreate(kind: string = 'weapon', context?: CreateContext): void {
    const selected = CUSTOM_KINDS.includes(kind as CustomKind) ? kind as CustomKind : 'weapon';
    this.catalogRows = Object.values(this.items);
    this.enchantOptions = this.catalogRows.filter((item) => item.itemTypeId === 11);
    this.setCardOptions(selected);
    this.draft = this.blank(selected);
    this.previewIcon = inferCustomIcon(selected, this.draft.itemSubTypeId, this.items);
    this.rawScript = '{}'; this.rules = []; this.mode = 'visual'; this.section = 'item';
    this.mobileView = 'editor';
    this.diagnostics = []; this.rawError = ''; this.importedBackup = null; this.context = context;
    this.previewRefine = 0; this.previewGrade = ''; this.previewLoyalty = 4; this.previewBonuses = []; this.previewRules = [];
    this.previewText = ''; this.previewItem = undefined;
    this.capacityNotice = '';
    this.visible = true; this.libraryMode = false;
  }

  edit(item: CustomItemDefinition): void {
    this.openCreate(item.kind);
    this.draft = structuredClone(item);
    this.rawScript = JSON.stringify(item.script ?? {}, null, 2);
    this.readRules();
    this.validate();
  }

  duplicate(item: CustomItemDefinition): void {
    this.edit(item);
    this.draft.id = undefined;
    this.draft.name = `${item.name} (cópia)`;
  }

  selectKind(kind: CustomKind): void {
    const fresh = this.blank(kind);
    this.draft = { ...this.draft, kind, cardCapacity: fresh.cardCapacity, enchantCapacity: fresh.enchantCapacity,
      baCapacity: fresh.baCapacity, isRefinable: fresh.isRefinable, canGrade: fresh.canGrade,
      itemSubTypeId: fresh.itemSubTypeId, iconItemId: undefined, itemLevel: fresh.itemLevel,
      location: undefined, locations: undefined };
    this.selectedCard = 0;
    this.setCardOptions(kind);
    this.validate();
  }

  get sourceResults(): ItemModel[] {
    const query = this.fold(this.importQuery);
    if (!query) return [];
    const rows = [...new Map(this.catalogRows.filter((item) => item?.script && typeof item.script === 'object')
      .map((item) => [item.id, item])).values()];
    return rows.filter((item) => this.fold(`${item.name} ${item.id} ${item.aegisName}`).includes(query))
      .sort((a, b) => Number(b.id === Number(query)) - Number(a.id === Number(query)) || a.name.localeCompare(b.name, 'pt-BR'))
      .slice(0, 60);
  }

  sourceCategory(item: ItemModel): string {
    if (item.custom) return this.kindLabels[(item as CustomItemDefinition).kind];
    return ({ 1: 'Arma', 2: 'Equipamento', 3: 'Consumível', 4: 'Munição', 6: 'Carta', 11: 'Encantamento' } as Record<number, string>)[item.itemTypeId]
      ?? 'Item';
  }

  private fold(s: string): string { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

  get libraryItems(): CustomItemDefinition[] {
    const q = this.fold(this.libraryQuery);
    return this.library.items.filter((item) => (!this.libraryKind || item.kind === this.libraryKind)
      && (!q || this.fold(`${item.name} ${item.id}`).includes(q)));
  }

  importScript(source: ItemModel): void {
    this.importedBackup = { raw: this.rawScript, script: structuredClone(this.draft.script ?? {}), rules: structuredClone(this.rules) };
    this.draft.script = structuredClone(source.script);
    this.rawScript = JSON.stringify(this.draft.script, null, 2);
    this.rawError = '';
    this.readRules();
    this.importOpen = false;
    this.importQuery = '';
    this.validate();
  }

  undoImport(): void {
    if (!this.importedBackup) return;
    this.rawScript = this.importedBackup.raw;
    this.draft.script = this.importedBackup.script;
    this.rules = this.importedBackup.rules;
    this.importedBackup = null;
    this.onRawScript();
  }

  private setCardOptions(kind: CustomKind): void {
    this.cardOptions = this.catalogRows.filter((item) => item.itemTypeId === 6 && item.presentInLatam
      && cardFitsCustomKind(item, kind));
  }

  get allowedClasses(): string { return (this.draft.usableClass ?? []).filter((name) => name !== 'all').join(', '); }
  set allowedClasses(value: string) {
    this.draft.usableClass = value.split(',').map((name) => name.trim()).filter(Boolean);
  }

  get headOccupancy(): string[] {
    const defaultLocation = this.draft.kind.endsWith('Middle') ? 'Middle'
      : this.draft.kind.endsWith('Lower') ? 'Lower' : 'Upper';
    return this.draft.locations ?? [this.draft.location ?? defaultLocation];
  }
  toggleHeadLocation(location: string, checked: boolean): void {
    const existing = new Set(this.headOccupancy);
    if (checked) existing.add(location); else existing.delete(location);
    this.draft.locations = [...existing];
    this.draft.location = this.draft.locations[0] ?? null;
    this.validate();
  }

  changeCapacity(field: 'cardCapacity' | 'enchantCapacity' | 'baCapacity', value: number): void {
    this.draft[field] = Number(value);
    const removed: string[] = [];
    for (const [capacity, defaults] of [
      ['cardCapacity', 'defaultCards'], ['enchantCapacity', 'defaultEnchants'], ['baCapacity', 'defaultBas'],
    ] as const) {
      const list = this.draft[defaults] ?? [];
      const limit = Math.max(0, Number(this.draft[capacity]) || 0);
      if (list.length > limit) {
        removed.push(`${list.length - limit} ${defaults === 'defaultBas' ? 'BA(s)' : defaults === 'defaultCards' ? 'carta(s)' : 'encantamento(s)'}`);
        (this.draft as any)[defaults] = list.slice(0, limit);
      }
    }
    this.capacityNotice = removed.length ? `Capacidade reduzida: ${removed.join(', ')} removido(s) das seleções iniciais.` : '';
    this.validate();
  }

  addCard(): void {
    const list = this.draft.defaultCards ?? [];
    if (this.selectedCard && list.length < Number(this.draft.cardCapacity)) { this.draft.defaultCards = [...list, this.selectedCard]; this.validate(); }
  }
  addEnchant(): void {
    const list = this.draft.defaultEnchants ?? [];
    if (this.selectedEnchant && list.length < Number(this.draft.enchantCapacity)) { this.draft.defaultEnchants = [...list, this.selectedEnchant]; this.validate(); }
  }
  addBa(): void {
    const list = this.draft.defaultBas ?? [];
    if (this.selectedBa && list.length < Number(this.draft.baCapacity)) { this.draft.defaultBas = [...list, this.selectedBa]; this.validate(); }
  }

  addRule(): void { this.rules.push({ key: 'atk', expression: '1' }); this.writeRules(); }
  removeRule(index: number): void { this.rules.splice(index, 1); this.writeRules(); }

  applyCondition(index: number): void {
    const value = this.conditionValue.trim();
    if (!value) return;
    const token = (() => {
      switch (this.condition) {
        case 'refine': return `REFINE[${value}]`;
        case 'grade': return `GRADE[me==${value.toUpperCase()}]`;
        case 'level': return `LEVEL[${value}]`;
        case 'stat': return `${value}:${this.conditionExtra || '1'}---`;
        case 'equip': return `EQUIP_ID[${value}]`;
        case 'class': return `USED[${value}]`;
        case 'skill': return `SKILL_ID[${value}==${this.conditionExtra || '1'}]`;
        case 'activeSkill': return `ACTIVE_SKILL_ID[${value}]`;
        case 'loyalty': return `LOYALTY[${value}]`;
        case 'weaponType': return `WEAPON_TYPE[${value}]`;
        case 'ammoType': return `AMMO_SUBTYPE[${value}]`;
        case 'position': return `POS[${value}]`;
        case 'spawn': return `SPAWN[${value}]`;
        case 'until': return `UNTIL[${value}]`;
        default: return '';
      }
    })();
    if (this.condition === 'refineStep') this.rules[index].expression = `${value}---${this.rules[index].expression}`;
    else this.rules[index].expression = `${token}${this.rules[index].expression}`;
    this.writeRules();
  }

  private readRules(): void {
    this.rules = Object.entries(this.draft.script ?? {}).filter(([, v]) => Array.isArray(v) && (v as unknown[]).every((x) => typeof x === 'string'))
      .flatMap(([key, values]) => (values as string[]).map((expression) => ({ key, expression })));
  }

  writeRules(): void {
    const directives = Object.fromEntries(Object.entries(this.draft.script ?? {}).filter(([key]) => key.startsWith('autoCast')));
    const script: Record<string, any> = { ...directives };
    for (const rule of this.rules) (script[rule.key] ??= []).push(rule.expression);
    this.draft.script = script;
    this.rawScript = JSON.stringify(script, null, 2);
    this.rawError = '';
    this.validate();
  }

  onRawScript(): void {
    try { this.draft.script = JSON.parse(this.rawScript); }
    catch (error) {
      const message = error instanceof Error ? error.message : 'JSON inválido';
      const position = Number(message.match(/position (\d+)/)?.[1]);
      if (Number.isFinite(position)) {
        const before = this.rawScript.slice(0, position).split('\n');
        this.rawError = `JSON: linha ${before.length}, coluna ${before[before.length - 1].length + 1}: ${message}`;
      } else this.rawError = `JSON: ${message}`;
      this.diagnostics = [this.rawError];
      return;
    }
    this.rawError = '';
    this.validate();
  }

  setMode(mode: 'visual' | 'json'): void {
    if (mode === 'visual') {
      this.onRawScript();
      if (this.diagnostics.length) return;
      this.readRules();
    }
    this.mode = mode;
  }

  validate(): void {
    const input = { ...this.draft, id: this.draft.id ?? customItemId() };
    const result = validateCustomItems([input], this.items);
    this.diagnostics = [...(this.rawError ? [this.rawError] : []), ...result.errors.map((e) => `${e.path}: ${e.message}`)];
    this.previewItem = result.items[0];
    this.previewIcon = Number(this.previewItem?.iconItemId || this.draft.iconItemId
      || inferCustomIcon(this.draft.kind, this.draft.itemSubTypeId, this.items));
    this.previewText = this.previewItem ? customItemDescription(this.previewItem)
      : Object.entries(this.draft.script ?? {}).map(([key, values]) => `${bonusKeyLabel(key)}: ${JSON.stringify(values)}`).join('\n');
    this.updatePreview();
  }

  updatePreview(): void {
    this.previewBonuses = [];
    this.previewRules = [];
    if (!this.character || !this.currentModel || !this.previewItem) return;
    try {
      const item = this.previewItem;
      const id = item.id;
      const model = structuredClone(this.currentModel) as Record<string, any>;
      const slot = item.kind === 'card' ? 'weaponCard1' : item.kind === 'enchant' ? 'weaponEnchant1'
        : item.kind === 'ammo' ? 'ammo' : item.kind === 'consumable' ? 'consumable' : item.kind;
      if (slot !== 'consumable') model[slot] = id;
      model[`${slot}Refine`] = this.previewRefine;
      model[`${slot}Grade`] = this.previewGrade;
      model['petLoyalty'] = this.previewLoyalty;
      const calc = new Calculator().setMasterItems({ ...this.items, [id]: item }).setClass(this.character)
        .loadItemFromModel(model);
      if (this.currentMonster) calc.setMonster(this.currentMonster);
      this.previewBonuses = Object.entries(calc.evaluateItemScript(slot as ItemTypeEnum, item, this.previewRefine))
        .filter(([, value]) => Number.isFinite(value) && value !== 0)
        .map(([key, value]) => ({ label: bonusKeyLabel(key), value }));
      this.previewRules = itemBonusScriptEntries(item.script).flatMap(([key, lines]) => {
        const selected = selectLoyaltyLines(lines, this.previewLoyalty);
        return lines.map((line) => {
          const replaced = !selected.includes(line);
          const result = replaced ? { active: false, value: 0 } : calc.evaluateItemRule(slot as ItemTypeEnum, line, this.previewRefine);
          return { label: bonusKeyLabel(key), reason: replaced ? 'Substituída pela faixa de lealdade mais alta.'
            : result.active ? `Condição atendida: ${line}` : `Condição não atendida nesta build: ${line}`,
            ...result };
        });
      });
    } catch { this.previewBonuses = []; this.previewRules = []; }
  }

  save(): void {
    this.onRawScript();
    if (this.diagnostics.length) return;
    const draft = { ...this.draft, id: this.draft.id ?? customItemId(), revision: (this.draft.revision ?? 0) + 1 };
    const result = validateCustomItems([draft], this.items);
    if (result.errors.length) { this.diagnostics = result.errors.map((e) => `${e.path}: ${e.message}`); return; }
    try {
      this.library.save(result.items[0]);
      this.saved.emit({ item: result.items[0], context: this.context });
      this.visible = false;
    } catch (error) { this.diagnostics = [error instanceof Error ? error.message : 'Falha ao salvar item.']; }
  }

  remove(item: CustomItemDefinition): void {
    if (!window.confirm(`Excluir "${item.name}" dos Meus itens? As simulações salvas mantêm uma cópia.`)) return;
    try { this.library.remove(item.id); this.deleted.emit(item.id); }
    catch (error) { this.diagnostics = [error instanceof Error ? error.message : 'Falha ao excluir item.']; }
  }

  async share(item: CustomItemDefinition): Promise<void> {
    try {
      const dependencies = customDefinitionsForBuild([{ item: item.id }], this.items);
      await navigator.clipboard.writeText(`${location.origin}/#/?customItem=${encodeCustomBundle(dependencies)}`);
      this.copied = true;
    }
    catch (error) { this.diagnostics = [error instanceof Error ? error.message : 'Não foi possível copiar o link.']; }
  }

  exportJson(): void {
    const blob = new Blob([JSON.stringify({ version: 1, items: this.library.items }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'meus-itens.json'; link.click();
    URL.revokeObjectURL(url);
  }

  async importJson(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      if (file.size > CUSTOM_ITEM_MAX_BYTES) throw new Error('Arquivo de itens grande demais (máximo de 256 KiB).');
      const parsed = JSON.parse(await file.text());
      if (parsed?.version !== 1) throw new Error('Versão do arquivo de itens não reconhecida.');
      this.library.store.import(parsed.items, this.items);
      this.library.refresh();
      for (const item of this.library.items) this.saved.emit({ item });
    } catch (error) { this.diagnostics = [error instanceof Error ? error.message : 'Arquivo inválido.']; }
  }
}
