import { ViewState } from '../state/view-state';
import { Events } from '../services/events';
import { environment } from 'src/environments/environment';
import { ItemModel, itemBonusScriptEntries } from 'src/app/models/item.model';
import { MainModel } from 'src/app/models/main.model';
import { MonsterModel } from 'src/app/models/monster.model';
import { Calculator } from 'src/app/core/calculator';
import { ensureCustomAttachment } from 'src/app/core/custom-attachments';
import { ItemTypeEnum } from 'src/app/constants/item-type.enum';
import { isEquipmentEnchant } from 'src/app/constants/enchant_item';
import { CardPosition } from 'src/app/constants/card-position.enum';
import { bonusKeyLabel } from 'src/app/core/bonus-key-label';
import { createRawTotalBonus } from 'src/app/utils/create-raw-total-bonus';
import { createNumberDropdownList } from 'src/app/utils/create-number-dropdown-list';
import { getGradeList } from 'src/app/utils/to-grade-list';
import {
  CUSTOM_KINDS, CUSTOM_KIND_LABELS, CustomItemDefinition, CustomItemDraft, CustomKind,
  CUSTOM_ITEM_MAX_BYTES, customDefinitionsForBuild, customItemDescription, customItemDescriptionHtml, customItemId, validateCustomItems,
  cardFitsCustomKind, customIconCandidates, customKindIsEquipment, customKindIsShadow, inferCustomIcon,
} from 'src/app/core/custom-items';
import { CustomItems as CustomItemLibraryService } from '../services/custom-items';
import { encodeCustomBundle } from 'src/app/core/custom-item-library';
import { createExtraOptionList, ExtraOptionMap } from 'src/app/utils/create-extra-option-list';
import { WeaponSubTypeNameMapById, WeaponTypeNameMapBySubTypeId } from 'src/app/constants/weapon-type-mapper';
import { ItemSlotLabelPtBr } from 'src/app/constants/item-slot-i18n';
import { VALID_SKILL_IDS, resolveSkillById } from 'src/app/skills';
import { compileVisualItemRule, readVisualItemRule, VisualCondition, VisualConditionKind, VisualItemRule as Rule } from 'src/app/core/custom-item-visual-script';
import { ItemSubTypeId } from 'src/app/constants/item-sub-type.enum';
import { selectLoyaltyLines } from 'src/app/constants/pet-loyalty';
import { ElementType } from 'src/app/constants/element-type.const';
import { elementPtBr } from 'src/app/constants/monster-i18n';
import { CLASS_CTOR_BY_ID, getClassDropdownList } from 'src/app/jobs/_class-list';
import { DropdownModel } from 'src/app/models/dropdown.model';
import { ItemPicker as ItemPickerService } from '../services/pickers';
import { PickerRequest } from '../../app/layout/pages/ro-calculator/item-picker/item-picker.model';
import { ChipView } from '../../app/layout/pages/ro-calculator/equipment-grid/chip-view.model';
import { itemFailureMessages, itemValidationMessage, jsonSyntaxMessage } from '../../app/layout/pages/ro-calculator/custom-item-feedback';
import { itemDescPopoverHtml } from 'src/app/utils';
import { shortenUrl } from 'src/app/core/shorten-url';

interface CreateContext { slot: string; compare: boolean }
interface RuleConditionOption {
  value: VisualConditionKind;
  label: string;
  input?: 'number' | 'select' | 'item' | 'text' | 'date';
  options?: DropdownModel[];
  valueLabel?: string;
  example?: string;
  help?: string;
  extraLabel?: string;
  extraExample?: string;
}
type AttachmentField = 'defaultCards' | 'defaultEnchants' | 'defaultBas';
type PreviewField = 'refine' | 'grade';
const INTERNAL_ITEM_FIELDS = new Set(['refine', 'weight']);


export class CustomItemStudioComponent extends ViewState {
   items: Record<number, ItemModel> = {};
   currentModel?: MainModel;
   currentMonster?: MonsterModel;
   saved = new Events<{ item: CustomItemDefinition; context?: CreateContext }>();
   deleted = new Events<number>();

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
  private visualErrors: string[] = [];
  rules: Rule[] = [];
  importQuery = '';
  importOpen = false;
  libraryQuery = '';
  libraryKind = '';
  importedBackup: { raw: string; script: CustomItemDraft['script']; rules: Rule[]; rawError: string; visualErrors: string[] } | null = null;
  diagnostics: string[] = [];
  context?: CreateContext;
  copied = false;
  cardOptions: DropdownModel[] = [];
  enchantOptions: DropdownModel[] = [];
  attachmentRows: { field: AttachmentField; label: string; views: ChipView[] }[] = [];
  private catalogRows: ItemModel[] = [];
  conditionItemOptions: DropdownModel[] = [];
  previewIcon = 1101;
  iconQuery = '';
  iconOptions: ItemModel[] = [];
  iconFilteredOptions: ItemModel[] = [];
  visibleIcons: ItemModel[] = [];
  private readonly unavailableIconIds = new Set<number>();
  previewRefine = 0;
  previewGrade = '';
  previewLoyalty = 4;
  previewControls: { field: PreviewField; view: ChipView }[] = [];
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
  readonly sectionsWithoutSlots = this.sections.filter((section) => section.value !== 'sockets');
  get availableSections() { return this.isEquipment(this.draft.kind) ? this.sections : this.sectionsWithoutSlots; }
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
  readonly grades = getGradeList();
  readonly previewRefines = createNumberDropdownList({ from: 0, to: 18, prefixLabel: '+ ' });
  readonly previewShadowRefines = createNumberDropdownList({ from: 0, to: 10, prefixLabel: '+ ' });
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
  readonly trackIcon = (_: number, item: ItemModel) => item.id;
  readonly mcpUrl = environment.mcpUrl;
  readonly bonusKeys = Object.keys(createRawTotalBonus()).filter((key) => !INTERNAL_ITEM_FIELDS.has(key))
    .map((key) => ({ key, label: bonusKeyLabel(key) }));
  readonly bonusLabel = bonusKeyLabel;
  readonly attributeOptions: DropdownModel[] = [
    ['str', 'FOR'], ['agi', 'AGI'], ['vit', 'VIT'], ['int', 'INT'], ['dex', 'DES'], ['luk', 'SOR'],
    ['level', 'Nível base'], ['jobLevel', 'Nível de classe'],
  ].map(([value, label]) => ({ value, label }));
  readonly conditionSkills: DropdownModel[] = [...VALID_SKILL_IDS].map((id) => {
    const skill = resolveSkillById(id);
    return { value: id, label: skill?.name ?? `Habilidade #${id}`, icon: id, iconType: skill?.iconType ?? 'skill' };
  });
  readonly conditionWeaponTypes: DropdownModel[] = [...new Map(this.weaponSubtypes.map(({ id, label }) =>
    [WeaponTypeNameMapBySubTypeId[id], { value: WeaponTypeNameMapBySubTypeId[id], label: id >= 273 && id <= 277 ? 'Arma de fogo' : label }])).values()];
  readonly conditionOptions: RuleConditionOption[] = [
    { value: 'none', label: 'Sem condição' },
    {
      value: 'refine', label: 'Refino mínimo', input: 'number', valueLabel: 'Refino mínimo', example: '7',
      help: 'Refino do próprio item, sem o sinal +. Ex.: 7 ativa o bônus a partir do refino +7.',
    },
    {
      value: 'refineStep', label: 'A cada X refinos', input: 'number', valueLabel: 'Intervalo de refinos', example: '2',
      help: 'Aplica o bônus a cada intervalo completo de refinos. Ex.: 2 aplica uma vez no +2, duas no +4 e assim por diante.',
    },
    {
      value: 'grade', label: 'Grau mínimo', input: 'select', options: this.grades.filter(({ value }) => !!value), valueLabel: 'Graduação mínima',
      help: 'Use D, C, B ou A. A graduação indicada e as superiores ativam o bônus.',
    },
    {
      value: 'level', label: 'Nível mínimo', input: 'number', valueLabel: 'Nível base mínimo', example: '100',
      help: 'Nível base do personagem a partir do qual o bônus fica ativo.',
    },
    {
      value: 'stat', label: 'A cada X do atributo', input: 'select', options: this.attributeOptions, valueLabel: 'Atributo ou nível',
      extraLabel: 'Pontos por bônus', extraExample: '10',
      help: 'Aplica o valor do bônus a cada quantidade completa de pontos do atributo ou nível escolhido.',
    },
    {
      value: 'statMin', label: 'Atributo mínimo', input: 'select', options: this.attributeOptions, valueLabel: 'Atributo ou nível',
      extraLabel: 'Quantidade mínima', extraExample: '120', help: 'O bônus fica ativo quando o atributo base ou nível alcança esta quantidade.',
    },
    {
      value: 'equip', label: 'Equipado junto', input: 'item', valueLabel: 'Item necessário',
      help: 'Escolha o item que precisa estar equipado. Adicione outra condição deste tipo para exigir mais um item.',
    },
    {
      value: 'class', label: 'Classe', input: 'select', options: this.classes.map((job) => ({ ...job, iconType: 'job' })), valueLabel: 'Classe necessária',
      help: 'O bônus também vale para as evoluções da classe escolhida.',
    },
    {
      value: 'skill', label: 'Habilidade aprendida', input: 'select', options: this.conditionSkills, valueLabel: 'Habilidade aprendida',
      extraLabel: 'Nível mínimo da habilidade', extraExample: '5',
      help: 'Escolha a habilidade e o nível mínimo que o personagem precisa ter aprendido.',
    },
    {
      value: 'activeSkill', label: 'Perícia ativa', input: 'select', options: this.conditionSkills, valueLabel: 'Perícia ativa',
      help: 'Escolha a perícia que precisa estar ativada na build.',
    },
    {
      value: 'loyalty', label: 'Lealdade do pet', input: 'select', options: this.loyaltyOptions, valueLabel: 'Faixa de lealdade',
      help: 'Aplica a partir dessa faixa; para o mesmo bônus, prevalece a maior faixa atingida.',
    },
    {
      value: 'weaponType', label: 'Tipo de arma', input: 'select', options: this.conditionWeaponTypes, valueLabel: 'Tipo de arma',
      help: 'O bônus exige uma arma deste tipo equipada.',
    },
    {
      value: 'ammoType', label: 'Tipo de munição', input: 'select', options: this.ammoSubtypes.map(({ id, label }) => ({ value: id, label })), valueLabel: 'Tipo de munição',
      help: 'O bônus exige uma munição deste tipo equipada.',
    },
    {
      value: 'position', label: 'Posição', input: 'select', options: Object.entries(ItemSlotLabelPtBr).map(([value, label]) => ({ value, label })), valueLabel: 'Posição do item',
      help: 'Posição em que este item precisa estar equipado.',
    },
    {
      value: 'spawn', label: 'Mapa do monstro', input: 'text', valueLabel: 'Código do mapa', example: 'tur_d03_i',
      help: 'Informe um mapa de aparição do monstro.',
    },
    {
      value: 'until', label: 'Válido até (data)', input: 'date', valueLabel: 'Último dia de validade',
      help: 'O bônus permanece ativo até o fim do dia informado.',
    },
  ];
  conditionHelp(kind: VisualConditionKind): RuleConditionOption {
    return this.conditionOptions.find((option) => option.value === kind)!;
  }

  constructor(public readonly library: CustomItemLibraryService, private readonly picker: ItemPickerService) { super();}

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

    this.publish();
}

  closePickers(): void { this.picker.close(); }

  openCreate(kind: string = 'weapon', context?: CreateContext): void {
    const selected = kind === 'leftWeapon' ? 'weapon' : CUSTOM_KINDS.includes(kind as CustomKind) ? kind as CustomKind : 'weapon';
    this.catalogRows = [...new Map(Object.values(this.items).map((item) => [item.id, item])).values()];
    this.conditionItemOptions = this.catalogRows.map((item) => ({ label: item.name, value: item.id }));
    this.enchantOptions = this.catalogRows.filter(isEquipmentEnchant).map((item) => ({ label: item.name, value: item.id }));
    this.setCardOptions(selected);
    this.draft = this.blank(selected);
    this.refreshIconOptions();
    this.previewIcon = inferCustomIcon(selected, this.draft.itemSubTypeId, this.items);
    this.rawScript = '{}'; this.rules = []; this.mode = 'visual'; this.section = 'item';
    this.mobileView = 'editor';
    this.diagnostics = []; this.rawError = ''; this.visualErrors = []; this.importedBackup = null; this.context = context;
    this.previewRefine = 0; this.previewGrade = ''; this.previewLoyalty = 4; this.previewBonuses = []; this.previewRules = [];
    this.previewText = ''; this.previewItem = undefined;
    this.capacityNotice = '';
    this.importQuery = ''; this.importOpen = false;
    this.visible = true; this.libraryMode = false;
    this.refreshAttachments();
    this.updatePreview();

    this.publish();
}

  edit(item: CustomItemDefinition): void {
    this.openCreate(item.kind);
    this.draft = structuredClone(item);
    if (this.draft.kind === 'leftWeapon') this.draft.kind = 'weapon';
    this.refreshIconOptions();
    this.rawScript = JSON.stringify(item.script ?? {}, null, 2);
    this.readRules();
    this.validate();

    this.publish();
}

  duplicate(item: CustomItemDefinition): void {
    this.edit(item);
    this.draft.id = undefined;
    this.draft.name = `${item.name} (cópia)`;
  }

  selectKind(kind: CustomKind): void {
    if (!this.isEquipment(kind) && this.section === 'sockets') this.section = 'item';
    const fresh = this.blank(kind);
    this.draft = { ...this.draft, kind, cardCapacity: fresh.cardCapacity, enchantCapacity: fresh.enchantCapacity,
      baCapacity: fresh.baCapacity, isRefinable: fresh.isRefinable, canGrade: fresh.canGrade,
      itemSubTypeId: fresh.itemSubTypeId, iconItemId: undefined, itemLevel: fresh.itemLevel,
      location: undefined, locations: undefined };
    this.setCardOptions(kind);
    this.changeCapacity('cardCapacity', 0);
    this.refreshIconOptions();
  }

  onSubtypeChange(): void {
    this.draft.iconItemId = undefined;
    this.refreshIconOptions();
    this.validate();
  }

  private refreshIconOptions(): void {
    this.iconQuery = '';
    this.iconOptions = customIconCandidates(this.draft.kind, this.draft.itemSubTypeId, this.items)
      .filter((item) => !this.unavailableIconIds.has(item.id));
    this.filterIconOptions();
  }

  filterIconOptions(): void {
    const query = this.fold(this.iconQuery);
    this.iconFilteredOptions = query
      ? this.iconOptions.filter((item) => this.fold(`${item.name} ${item.id}`).includes(query))
      : this.iconOptions;
    this.visibleIcons = this.iconFilteredOptions.slice(0, 90);
  }

  loadMoreIcons(event: Event): void {
    const viewport = event.target as HTMLElement;
    if (this.visibleIcons.length >= this.iconFilteredOptions.length
      || viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > 160) return;
    this.visibleIcons = this.iconFilteredOptions.slice(0, this.visibleIcons.length + 90);
  }

  iconLoadFailed(id: number): void {
    this.unavailableIconIds.add(id);
    this.iconOptions = this.iconOptions.filter((item) => item.id !== id);
    this.iconFilteredOptions = this.iconFilteredOptions.filter((item) => item.id !== id);
    this.visibleIcons = this.iconFilteredOptions.slice(0, Math.max(90, this.visibleIcons.length));
  }

  selectIcon(id?: number): void {
    this.draft.iconItemId = id;
    this.validate();
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

  descriptionTooltip(item: CustomItemDefinition): string {
    return itemDescPopoverHtml(item, customItemDescriptionHtml(item));
  }

  importScript(source: ItemModel): void {
    this.importedBackup = { raw: this.rawScript, script: structuredClone(this.draft.script ?? {}), rules: structuredClone(this.rules), rawError: this.rawError, visualErrors: [...this.visualErrors] };
    this.draft.script = structuredClone(source.script);
    this.rawScript = JSON.stringify(this.draft.script, null, 2);
    this.rawError = ''; this.visualErrors = [];
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
    this.rawError = this.importedBackup.rawError;
    this.visualErrors = this.importedBackup.visualErrors;
    this.importedBackup = null;
    this.validate();
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
    this.picker.open(request).then((result) => { if (this.lifetime.active) this.action(() => {
      if (result.committed) this.setAttachment(field, view.chip.index, result.value);
    }); });
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

  addRule(): void { this.rules.push({ key: 'atk', value: 1, conditions: [] }); this.writeRules(); }
  removeRule(index: number): void { this.rules.splice(index, 1); this.writeRules(); }

  addCondition(rule: Rule): void {
    rule.conditions.push({ kind: 'none', value: null });
    this.writeRules();
  }

  changeCondition(condition: VisualCondition, kind: VisualConditionKind): void {
    condition.kind = kind;
    condition.value = null;
    condition.extra = this.conditionHelp(kind).extraLabel ? 1 : undefined;
    this.writeRules();
  }

  removeCondition(rule: Rule, index: number): void {
    rule.conditions.splice(index, 1);
    this.writeRules();
  }

  pickConditionItem(condition: VisualCondition, anchor: HTMLElement): void {
    this.picker.open({ mode: 'flat', anchor, title: 'Item necessário', value: condition.value,
      options: this.conditionItemOptions, filterKeys: ['label', 'value'], iconKey: 'value', items: this.items,
    }).then((result) => { if (this.lifetime.active) this.action(() => {
      if (!result.committed) return;
      condition.value = result.value == null ? null : Number(result.value);
      this.writeRules();
    }); });
  }

  conditionItemName(condition: VisualCondition): string {
    return this.items[Number(condition.value)]?.name ?? (condition.value ? `Item #${condition.value}` : 'Escolher item');
  }

  private readRules(): void {
    this.visualErrors = [];
    this.rules = itemBonusScriptEntries(this.draft.script).flatMap(([key, values]) => values.map((expression) => {
      const rule = readVisualItemRule(key, expression);
      if (INTERNAL_ITEM_FIELDS.has(key) || rule.conditions.some((condition) => {
        const options = this.conditionHelp(condition.kind).options;
        return options && !options.some((option) => option.value === condition.value);
      })) rule.readOnly = true;
      if (rule.readOnly) rule.description = customItemDescription({ script: { [key]: [expression] } });
      if (!INTERNAL_ITEM_FIELDS.has(key) && !this.bonusKeys.some((option) => option.key === key)) {
        this.bonusKeys.push({ key, label: bonusKeyLabel(key) });
      }
      return rule;
    }));
  }

  writeRules(): void {
    const bonusKeys = new Set(itemBonusScriptEntries(this.draft.script).map(([key]) => key));
    const script = Object.fromEntries(Object.entries(this.draft.script ?? {}).filter(([key]) => !bonusKeys.has(key)));
    this.visualErrors = [];
    this.rules.forEach((rule, index) => {
      const result = compileVisualItemRule(rule);
      this.visualErrors.push(...result.errors.map((error) => `Bônus ${index + 1}: ${error}`));
      if (result.expression != null) {
        const values = script[rule.key] ?? [];
        if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
          this.visualErrors.push(`Bônus ${index + 1}: este campo contém dados incompatíveis. Corrija-o no JSON.`);
        } else script[rule.key] = [...values as string[], result.expression];
      }
    });
    if (this.visualErrors.length) { this.validate(); return; }
    this.draft.script = script;
    this.rawScript = JSON.stringify(script, null, 2);
    this.rawError = '';
    this.validate();
  }

  onRawScript(): void {
    try { this.draft.script = JSON.parse(this.rawScript); }
    catch (error) {
      this.rawError = jsonSyntaxMessage(error, this.rawScript);
      this.diagnostics = [this.rawError];
      return;
    }
    this.rawError = ''; this.visualErrors = [];
    this.validate();
  }

  formatJson(): void {
    this.onRawScript();
    if (!this.rawError) this.rawScript = JSON.stringify(this.draft.script, null, 2);
  }

  setMode(mode: 'visual' | 'json'): void {
    if (!mode || mode === this.mode) return;
    if (mode === 'json' && this.visualErrors.length) return;
    if (mode === 'visual') {
      this.onRawScript();
      if (this.rawError || !this.draft.script || typeof this.draft.script !== 'object' || Array.isArray(this.draft.script)) return;
      this.readRules();
    }
    this.mode = mode;
  }

  validate(): void {
    const input = { ...this.draft, id: this.draft.id ?? customItemId() };
    const result = validateCustomItems([input], this.items);
    this.diagnostics = [...(this.rawError ? [this.rawError] : []), ...this.visualErrors, ...result.errors.map((error) => itemValidationMessage(error))];
    this.previewItem = this.visualErrors.length ? undefined : result.items[0] ?? (!this.rawError && !input.name.trim()
      ? validateCustomItems([{ ...input, name: 'Novo item' }], this.items).items[0] : undefined);
    this.previewIcon = Number(this.previewItem?.iconItemId
      || inferCustomIcon(this.draft.kind, this.draft.itemSubTypeId, this.items));
    this.previewText = this.previewItem ? customItemDescription(this.previewItem) : 'Corrija os erros do script para atualizar a descrição.';
    this.refreshAttachments();
    this.updatePreview();
  }

  pickPreview(field: PreviewField, anchor: HTMLElement): void {
    this.picker.open({
      mode: 'flat', anchor, title: field === 'refine' ? 'Refino' : 'Grau',
      value: field === 'refine' ? this.previewRefine : this.previewGrade,
      options: field === 'refine'
        ? customKindIsShadow(this.draft.kind) ? this.previewShadowRefines : this.previewRefines
        : this.grades.filter(({ value }) => value !== ''),
      filterKeys: ['label'],
    }).then((result) => { if (this.lifetime.active) this.action(() => {
      if (result.committed) this.setPreviewValue(field, result.value);
    }); });
  }

  setPreviewValue(field: PreviewField, value: string | number | null | undefined): void {
    if (field === 'refine') this.previewRefine = Number(value) || 0;
    else this.previewGrade = String(value ?? '');
    this.updatePreview();
  }

  updatePreview(): void {
    if (!this.draft.isRefinable) this.previewRefine = 0;
    else this.previewRefine = Math.min(this.previewRefine, customKindIsShadow(this.draft.kind) ? 10 : 18);
    if (!this.draft.canGrade) this.previewGrade = '';
    this.previewControls = (['refine', 'grade'] as const)
      .filter((field) => field === 'refine' ? this.draft.isRefinable : this.draft.canGrade)
      .map((field) => ({ field, view: {
        chip: { kind: field, index: 0, slotKey: this.draft.kind as ItemTypeEnum, placeholder: field === 'refine' ? '+ 0' : 'Grau' },
        text: field === 'refine' ? `+ ${this.previewRefine}` : this.previewGrade ? `Grau ${this.previewGrade}` : 'Grau',
        filled: field === 'refine' ? this.previewRefine > 0 : !!this.previewGrade,
        icon: null, descId: null, elementClass: null, primary: false, preRelease: false,
      } }));
    this.previewBonuses = [];
    this.previewRules = [];
    if (!this.currentModel || !this.previewItem) return;
    const Character = CLASS_CTOR_BY_ID[this.currentModel.class];
    if (!Character) return;
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
      if (this.isEquipment(item.kind)) {
        const attachments = ensureCustomAttachment(model, slot, item)!;
        attachments.refine = this.previewRefine;
        attachments.grade = this.previewGrade;
      }
      const character = new Character().setLearnSkills({
        activeSkillIds: this.currentModel.activeSkills,
        passiveSkillIds: this.currentModel.passiveSkills,
      });
      const { activeSkillNames, learnedSkillMap } = character.getSkillBonusAndName();
      const calc = new Calculator().setMasterItems({ ...this.items, [id]: item }).setClass(character)
        .loadItemFromModel(model).setUsedSkillNames(activeSkillNames).setLearnedSkills(learnedSkillMap);
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
    if (this.mode === 'visual') this.writeRules(); else this.onRawScript();
    if (this.diagnostics.length) return;
    const draft = { ...this.draft, id: this.draft.id ?? customItemId(), revision: (this.draft.revision ?? 0) + 1 };
    const result = validateCustomItems([draft], this.items);
    if (result.errors.length) { this.diagnostics = result.errors.map((error) => itemValidationMessage(error)); return; }
    try {
      this.library.save(result.items[0]);
      this.saved.emit({ item: result.items[0], context: this.context });
      this.visible = false;
    } catch (error) { this.diagnostics = itemFailureMessages(error, 'Não foi possível salvar o item. Seu rascunho foi mantido; tente novamente.'); }
  }

  remove(item: CustomItemDefinition): void {
    if (!window.confirm(`Excluir "${item.name}" dos Meus itens? As simulações salvas mantêm uma cópia.`)) return;
    try { this.library.remove(item.id); this.deleted.emit(item.id); }
    catch (error) { this.diagnostics = itemFailureMessages(error, 'Não foi possível excluir o item. Tente novamente.'); }
  }

  async share(item: CustomItemDefinition): Promise<void> {
    try {
      const dependencies = customDefinitionsForBuild([{ item: item.id }], this.items);
      const url = `${location.origin}/#/?customItem=${encodeCustomBundle(dependencies)}`;
      await navigator.clipboard.writeText(await shortenUrl(url, environment.shortenerUrl));
      this.copied = true;
    }
    catch (error) { this.diagnostics = itemFailureMessages(error, 'Não foi possível copiar o link. Verifique a permissão do navegador e tente novamente.'); }
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
    let source = '';
    try {
      if (file.size > CUSTOM_ITEM_MAX_BYTES) throw new Error('Arquivo de itens grande demais (máximo de 256 KiB).');
      source = await file.text();
      const parsed = JSON.parse(source);
      if (parsed?.version !== 1) throw new Error('Versão do arquivo de itens não reconhecida.');
      this.library.store.import(parsed.items, this.items);
      this.library.refresh();
      for (const item of this.library.items) this.saved.emit({ item });
    } catch (error) { this.diagnostics = itemFailureMessages(error, 'Não foi possível importar. Escolha um arquivo JSON de itens válido.', source); }
  }
}
