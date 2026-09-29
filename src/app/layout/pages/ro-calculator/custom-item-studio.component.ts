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
import { createNumberDropdownList } from 'src/app/utils/create-number-dropdown-list';
import {
  CUSTOM_KINDS, CUSTOM_KIND_LABELS, CustomItemDefinition, CustomItemDraft, CustomKind,
  CUSTOM_ITEM_MAX_BYTES, customDefinitionsForBuild, customItemDescription, customItemId, validateCustomItems,
  cardFitsCustomKind, customKindIsEquipment, inferCustomIcon,
} from 'src/app/core/custom-items';
import { CustomItemLibraryService } from 'src/app/api-services/custom-item-library.service';
import { encodeCustomBundle } from 'src/app/core/custom-item-library';
import { createExtraOptionList, ExtraOptionMap } from 'src/app/utils/create-extra-option-list';
import { WeaponSubTypeNameMapById } from 'src/app/constants/weapon-type-mapper';
import { ItemSubTypeId } from 'src/app/constants/item-sub-type.enum';
import { selectLoyaltyLines } from 'src/app/constants/pet-loyalty';
import { ElementType } from 'src/app/constants/element-type.const';
import { elementPtBr } from 'src/app/constants/monster-i18n';
import { getClassDropdownList } from 'src/app/jobs/_class-list';
import { DropdownModel } from 'src/app/models/dropdown.model';
import { ItemPickerService } from './item-picker/item-picker.service';
import { PickerRequest } from './item-picker/item-picker.model';
import { ChipView } from './equipment-grid/chip-view.model';

interface Rule { key: string; expression: string }
interface CreateContext { slot: string; compare: boolean }
interface RuleConditionOption {
  value: string;
  label: string;
  valueLabel?: string;
  example?: string;
  help?: string;
  extraLabel?: string;
  extraExample?: string;
}
type AttachmentField = 'defaultCards' | 'defaultEnchants' | 'defaultBas';

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
  scriptHelpVisible = false;
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
  cardOptions: DropdownModel[] = [];
  enchantOptions: DropdownModel[] = [];
  attachmentRows: { field: AttachmentField; label: string; views: ChipView[] }[] = [];
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

  // Off-hand is an equip destination; the weapon itself uses the same category.
  readonly kinds = CUSTOM_KINDS.filter((kind) => kind !== 'leftWeapon');
  readonly kindOptions = this.kinds.map((value) => ({ value, label: CUSTOM_KIND_LABELS[value] }));
  readonly libraryKindOptions = [{ value: '', label: 'Todas as categorias' }, ...this.kindOptions];
  readonly kindLabels = CUSTOM_KIND_LABELS;
  readonly baOptions = createExtraOptionList();
  readonly sections = [{ label: 'Item', value: 'item' }, { label: 'Slots e BAs', value: 'sockets' }, { label: 'Script', value: 'bonuses' }];
  readonly modes = [{ label: 'Visual', value: 'visual' }, { label: 'JSON bruto', value: 'json' }];
  readonly yesNoOptions = [{ label: 'Sim', value: true }, { label: 'Não', value: false }];
  readonly scriptHelpExample = JSON.stringify({ atk: ['10', '7===20'], cri: ['2---5'] }, null, 2);
  readonly mobileViews = [{ label: 'Editor', value: 'editor' }, { label: 'Prévia', value: 'preview' }];
  readonly counts = createNumberDropdownList({ from: 0, to: 4 });
  readonly baCounts = createNumberDropdownList({ from: 0, to: 5 });
  cardCounts = this.counts;
  enchantCounts = this.counts;
  readonly elements = Object.values(ElementType).map((value) => ({ value, label: elementPtBr(value) }));
  readonly classes = getClassDropdownList().map(({ label, icon, instant }) => ({ label, icon, value: instant.className }));
  readonly grades = [{ value: '', label: 'Sem grau' }, ...['D', 'C', 'B', 'A'].map((value) => ({ value, label: value }))];
  readonly loyaltyOptions = [{ value: 1, label: 'Baixa' }, { value: 2, label: 'Nenhuma' }, { value: 3, label: 'Normal' }, { value: 4, label: 'Alta' }];
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
  ].map(([label, value]) => ({ label, value }));
  readonly isEquipment = customKindIsEquipment;
  readonly mcpUrl = environment.mcpUrl;
  readonly bonusKeys = Object.keys(createRawTotalBonus()).map((key) => ({ key, label: bonusKeyLabel(key) }));
  readonly conditionOptions: RuleConditionOption[] = [
    { value: 'none', label: 'Sem condição' },
    {
      value: 'refine', label: 'Refino mínimo', valueLabel: 'Refino mínimo', example: '7',
      help: 'Refino do próprio item, sem o sinal +. Ex.: 7 ativa o bônus a partir do refino +7.',
    },
    {
      value: 'refineStep', label: 'A cada X refinos', valueLabel: 'Intervalo de refinos', example: '2',
      help: 'Aplica o bônus a cada intervalo completo de refinos. Ex.: 2 aplica uma vez no +2, duas no +4 e assim por diante.',
    },
    {
      value: 'grade', label: 'Grau mínimo', valueLabel: 'Graduação mínima', example: 'B',
      help: 'Use D, C, B ou A. A graduação indicada e as superiores ativam o bônus.',
    },
    {
      value: 'level', label: 'Nível mínimo', valueLabel: 'Nível base mínimo', example: '100',
      help: 'Nível base do personagem a partir do qual o bônus fica ativo.',
    },
    {
      value: 'stat', label: 'A cada X do atributo', valueLabel: 'Código do atributo', example: 'str',
      extraLabel: 'Pontos por bônus', extraExample: '10',
      help: 'Use str (FOR), agi (AGI), vit (VIT), int (INT), dex (DES) ou luk (SOR). Ex.: str e 10 aplicam o bônus a cada 10 pontos de FOR. Sem informar os pontos, usa 1.',
    },
    {
      value: 'equip', label: 'Equipado junto', valueLabel: 'ID do item', example: '1101',
      help: 'ID do item que precisa estar equipado. Combine IDs com && para exigir todos ou || para aceitar qualquer um.',
    },
    {
      value: 'class', label: 'Classe', valueLabel: 'Código da classe', example: 'Mechanic',
      help: 'Use o nome interno da classe, como Mechanic (Mecânico). Também aceita suas evoluções. Separe alternativas com ||.',
    },
    {
      value: 'skill', label: 'Perícia aprendida', valueLabel: 'ID da perícia aprendida', example: '2418',
      extraLabel: 'Nível mínimo da perícia', extraExample: '5',
      help: 'Informe o ID numérico da perícia e o nível mínimo aprendido. Sem informar o nível, usa 1.',
    },
    {
      value: 'activeSkill', label: 'Perícia ativa', valueLabel: 'ID da perícia ativa', example: '490',
      help: 'ID numérico da perícia que precisa estar ativada na build. Esta condição não recebe um nível mínimo.',
    },
    {
      value: 'loyalty', label: 'Lealdade do pet', valueLabel: 'Faixa de lealdade', example: '4',
      help: 'Use 1 = Baixa, 2 = Nenhuma, 3 = Normal ou 4 = Alta. Aplica a partir dessa faixa; para o mesmo bônus, prevalece a maior faixa atingida.',
    },
    {
      value: 'weaponType', label: 'Tipo de arma', valueLabel: 'Código do tipo de arma', example: 'bow',
      help: 'Use o código do tipo, como bow (arco), sword (espada) ou spear (lança). Separe alternativas com ||.',
    },
    {
      value: 'ammoType', label: 'Tipo de munição', valueLabel: 'Código do tipo de munição', example: '1024',
      help: `Use ${this.ammoSubtypes.map(({ id, label }) => `${id} = ${label}`).join('; ')}.`,
    },
    {
      value: 'position', label: 'Posição', valueLabel: 'Código da posição', example: 'accLeft',
      help: 'Posição em que o item deve estar equipado. Exemplos: weapon (arma), armor (armadura), accLeft (acessório esquerdo) e accRight (direito).',
    },
    {
      value: 'spawn', label: 'Mapa do monstro', valueLabel: 'Código do mapa', example: 'tur_d03_i',
      help: 'Código de um mapa de aparição do monstro. Separe mapas alternativos com ||, como tur_d03_i||tur_d04_i.',
    },
    {
      value: 'until', label: 'Válido até (data)', valueLabel: 'Último dia de validade', example: '2026-12-31',
      help: 'Use o formato AAAA-MM-DD. O bônus permanece ativo até o fim do dia informado.',
    },
  ];
  condition = 'none';
  conditionValue = '';
  conditionExtra = '';

  get conditionHelp(): RuleConditionOption | undefined {
    return this.conditionOptions.find((option) => option.value === this.condition && option.value !== 'none');
  }

  constructor(public readonly library: CustomItemLibraryService, private readonly picker: ItemPickerService) {}

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

  openLibrary(): void {
    this.visible = true; this.libraryMode = true; this.context = undefined;
    this.diagnostics = []; this.copied = false;
  }

  closePickers(): void { this.picker.close(); }

  openCreate(kind: string = 'weapon', context?: CreateContext): void {
    const selected = kind === 'leftWeapon' ? 'weapon' : CUSTOM_KINDS.includes(kind as CustomKind) ? kind as CustomKind : 'weapon';
    this.catalogRows = [...new Map(Object.values(this.items).map((item) => [item.id, item])).values()];
    this.enchantOptions = this.catalogRows.filter((item) => item.itemTypeId === 11).map((item) => ({ label: item.name, value: item.id }));
    this.setCardOptions(selected);
    this.draft = this.blank(selected);
    this.previewIcon = inferCustomIcon(selected, this.draft.itemSubTypeId, this.items);
    this.rawScript = '{}'; this.rules = []; this.mode = 'visual'; this.section = 'item';
    this.mobileView = 'editor';
    this.diagnostics = []; this.rawError = ''; this.importedBackup = null; this.context = context;
    this.previewRefine = 0; this.previewGrade = ''; this.previewLoyalty = 4; this.previewBonuses = []; this.previewRules = [];
    this.previewText = ''; this.previewItem = undefined;
    this.capacityNotice = '';
    this.importQuery = ''; this.importOpen = false;
    this.visible = true; this.libraryMode = false;
    this.refreshAttachments();
  }

  edit(item: CustomItemDefinition): void {
    this.openCreate(item.kind);
    this.draft = structuredClone(item);
    if (this.draft.kind === 'leftWeapon') this.draft.kind = 'weapon';
    this.draft.iconItemId = undefined;
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
    this.setCardOptions(kind);
    this.changeCapacity('cardCapacity', 0);
  }

  get sourceResults(): ItemModel[] {
    const query = this.fold(this.importQuery);
    if (!query) return [];
    const rows = this.catalogRows.filter((item) => item.script && typeof item.script === 'object');
    return rows.filter((item) => this.fold(`${item.name} ${item.id} ${item.aegisName}`).includes(query))
      .sort((a, b) => Number(b.id === Number(query)) - Number(a.id === Number(query)) || a.name.localeCompare(b.name, 'pt-BR'))
      .slice(0, 60);
  }

  sourceCategory(item: ItemModel): string {
    if (item.custom) return this.kindLabels[(item as CustomItemDefinition).kind];
    return ({ 1: 'Arma', 2: 'Equipamento', 3: 'Consumível', 4: 'Munição', 6: 'Carta', 11: 'Encantamento' } as Record<number, string>)[item.itemTypeId]
      ?? 'Item';
  }

  closeImportOutside(event: FocusEvent, source: HTMLElement): void {
    if (!source.contains(event.relatedTarget as Node | null)) this.importOpen = false;
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
      && cardFitsCustomKind(item, kind)).map((item) => ({ label: item.name, value: item.id, cardPrefix: item.cardPrefix }));
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
    const max = field === 'baCapacity' ? 5 : 4 - Number(this.draft[field === 'cardCapacity' ? 'enchantCapacity' : 'cardCapacity'] ?? 0);
    this.draft[field] = Math.max(0, Math.min(max, Math.trunc(Number(value) || 0)));
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

  private refreshAttachments(): void {
    this.cardCounts = this.counts.filter(({ value }) => Number(value) <= 4 - Number(this.draft.enchantCapacity ?? 0));
    this.enchantCounts = this.counts.filter(({ value }) => Number(value) <= 4 - Number(this.draft.cardCapacity ?? 0));
    this.attachmentRows = ([
      ['defaultCards', 'Cartas iniciais', 'card', this.draft.cardCapacity, 'Carta'],
      ['defaultEnchants', 'Encantamentos iniciais', 'enchant', this.draft.enchantCapacity, 'Encantamento'],
      ['defaultBas', 'BAs iniciais', 'option', this.draft.baCapacity, 'BA'],
    ] as const).map(([field, label, kind, capacity, placeholder]) => ({
      field, label, views: Array.from({ length: capacity ?? 0 }, (_, index): ChipView => {
        const value = this.draft[field]?.[index];
        const item = kind !== 'option' && value ? this.items[Number(value)] : undefined;
        return {
          chip: { kind, index, slotKey: this.draft.kind as ItemTypeEnum, placeholder: `${placeholder} ${index + 1}` },
          text: item?.name ?? (value ? ExtraOptionMap.get(String(value)) ?? String(value) : `${placeholder} ${index + 1}`),
          filled: !!value, icon: item?.id ?? null, descId: item?.id ?? null,
          elementClass: null, primary: false, preRelease: !!item?.preRelease,
        };
      }),
    }));
  }

  pickAttachment(field: AttachmentField, view: ChipView, anchor: HTMLElement): void {
    const base = { anchor, title: view.chip.placeholder, value: this.draft[field]?.[view.chip.index] };
    const request: PickerRequest = field === 'defaultBas'
      ? { ...base, value: String(base.value ?? ''), mode: 'tree', roots: this.baOptions, leafIndex: ExtraOptionMap }
      : { ...base, mode: 'flat', options: field === 'defaultCards' ? this.cardOptions : this.enchantOptions,
        filterKeys: ['label', 'value', 'cardPrefix'], iconKey: 'value', items: this.items };
    this.picker.open(request).subscribe((result) => {
      if (result.committed) this.setAttachment(field, view.chip.index, result.value);
    });
  }

  setAttachment(field: AttachmentField, index: number, value: string | number | null | undefined): void {
    if (field === 'defaultBas') {
      const values = [...(this.draft.defaultBas ?? [])];
      if (value) values[index] = String(value); else values.splice(index, 1);
      this.draft.defaultBas = values.filter(Boolean);
    } else {
      const values = [...(this.draft[field] ?? [])];
      if (value) values[index] = Number(value); else values.splice(index, 1);
      this.draft[field] = values.filter(Boolean);
    }
    this.validate();
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

  formatJson(): void {
    this.onRawScript();
    if (!this.rawError) this.rawScript = JSON.stringify(this.draft.script, null, 2);
  }

  setMode(mode: 'visual' | 'json'): void {
    if (!mode) return;
    if (mode === 'visual') {
      this.onRawScript();
      if (this.rawError || !this.draft.script || typeof this.draft.script !== 'object' || Array.isArray(this.draft.script)) return;
      this.readRules();
    }
    this.mode = mode;
  }

  validate(): void {
    this.draft.iconItemId = undefined;
    const input = { ...this.draft, id: this.draft.id ?? customItemId() };
    const result = validateCustomItems([input], this.items);
    this.diagnostics = [...(this.rawError ? [this.rawError] : []), ...result.errors.map((e) => `${e.path}: ${e.message}`)];
    this.previewItem = result.items[0] ?? (!this.rawError && !input.name.trim()
      ? validateCustomItems([{ ...input, name: 'Novo item' }], this.items).items[0] : undefined);
    this.previewIcon = Number(this.previewItem?.iconItemId
      || inferCustomIcon(this.draft.kind, this.draft.itemSubTypeId, this.items));
    this.previewText = this.previewItem ? customItemDescription(this.previewItem) : 'Corrija os erros do script para atualizar a descrição.';
    this.refreshAttachments();
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
        : item.kind === 'accessory' ? 'accLeft' : item.kind;
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
            : result.active ? 'Condição atendida nesta build.' : 'Condição não atendida nesta build.',
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
