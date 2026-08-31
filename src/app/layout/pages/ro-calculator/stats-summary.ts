import { formatNumber, formatRate, formatSignedNumber } from '../../../utils';

/**
 * The "Resumo de atributos" panel as data.
 *
 * The panel is a fixed grid of ~20 rows, each needing a label, a formatted value, a
 * breakdown lookup and — while a comparison is active — a third cell with the compared
 * build's value and the delta. Expressing that in the template would mean the same three
 * cells written out twenty times with a comparison branch inside each; expressing it here
 * means the comparison rules (when a cell shows at all, which direction counts as better,
 * what shape the compared value repeats) are written once and testable without a DOM.
 *
 * Pure: it reads two `getTotalSummary()` results and returns strings. The only injected
 * piece is `bonusValueText`, the component's own cast/delay formatter — the reduction rows
 * have to keep printing "-72%" for a stored +72, and that rule lives with the component
 * because the item-description rows share it.
 */

/** Which side of a comparison the reader benefits from. */
export type DeltaClass = 'compare_greater' | 'compare_lower';

export interface CompareCell {
  /** The compared build's value, in the same shape as the current one ("821 + 932"). */
  text: string;
  /** Signed change, e.g. "+48" — no unit, the value cell already carries it. */
  deltaText: string;
  deltaClass: DeltaClass;
}

export interface SummaryRow {
  label: string;
  /** Formatted current value: "821 + 884", "427%", "-72%", "9". */
  text: string;
  /** `summary_stat_*` colour class, also handed to the breakdown dialog. */
  valueClass: string;
  /** Bonus keys the breakdown drills into. Empty means the row is never clickable. */
  keys: string[];
  /** Dialog title when it should differ from the row label. */
  bdLabel?: string;
  /** Line printed above the breakdown's source rows. Doubles as the "*" marker's gate:
   *  the only row that carries one is Crítico, and it carries both or neither. */
  note?: string;
  /** Trailing text outside the value, e.g. DES2 INT1's "( faltam 12 )". */
  suffix?: string;
  compare: CompareCell | null;
  /** Whether each column's value opens a breakdown. Answered here, once per calculation,
   *  rather than by a predicate the template would call twice per row per change-detection
   *  pass — the sources these read are already settled by the time the view is built. */
  clickable: boolean;
  compareClickable: boolean;
  /** What hovering the value names it — the row's own label, so a value and its tooltip
   *  can't drift apart. Set whether or not the value is clickable: a value with no sources
   *  behind it still benefits from being named, and in the compared column the label is the
   *  only thing that says which row a bare "→ 664 -9" belongs to. */
  tooltip: string;
  compareTooltip: string;
}

export interface SummaryGroup {
  title: string;
  rows: SummaryRow[];
  /** Renders the "Redução de dano" link on the group header's right edge. */
  showReduction?: boolean;
}

export interface SummaryHeadline extends SummaryRow {
  /** 'rate' is the hits/s item: it opens the ASPD curve instead of a breakdown. */
  kind: 'stat' | 'rate';
}

export interface StatsSummaryView {
  headline: SummaryHeadline[];
  /** Three columns, each a list of groups. */
  columns: SummaryGroup[][];
}

export interface StatsSummaryOptions {
  /** Show the HP/SP group — off for the classes in `hideHpSp`. */
  showHpSp: boolean;
  /** The component's cast/delay formatter (negates reduction stats, adds "%"). */
  bonusValueText: (key: string, value: number) => string;
  /** Whether the build (or the compared one) sources any of these keys — the component
   *  owns the answer, since it owns the bonus-source maps. */
  canBreakdown: (keys: string[], compare: boolean) => boolean;
}

/** A displayed value: the text the cell prints and the single number a delta is taken on. */
interface Displayed {
  text: string;
  total: number;
}

const n = (v: any): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Plain integer, pt-BR grouped: 1705 -> "1.705". */
const num = (v: any): Displayed => ({ text: formatNumber(n(v)), total: n(v) });

/** Percentage: 427 -> "427%". */
const pct = (v: any): Displayed => ({ text: `${formatNumber(n(v))}%`, total: n(v) });

/**
 * The game's own "A + B" reading (ATQ, DEF, Esquiva…). The delta is taken on the sum,
 * because that is the number the reader is comparing — but the text keeps both halves,
 * so a compared row reads "821 + 932" and never collapses to "1.753".
 */
const pair = (a: any, b: any): Displayed => ({ text: `${formatNumber(n(a))} + ${formatNumber(n(b))}`, total: n(a) + n(b) });

/** ATQ's second half: weapon base + refine + mastery + equip, as the status window sums it. */
const weaponAtk = (s: any): number =>
  n(s?.weapon?.baseWeaponAtk) + n(s?.weapon?.refineBonus) + n(s?.calc?.totalMasteryAtk) + n(s?.calc?.totalEquipAtk);

/** ATQM's second half: weapon base + both refine bonuses + equip MATK. */
const weaponMatk = (s: any): number =>
  n(s?.weapon?.baseWeaponMatk) + n(s?.weapon?.refineBonus) + n(s?.calc?.leftWeaponRefineBonus) + n(s?.matk);

/**
 * Where a row's value comes from when it does not come from equipment.
 *
 * The bonus-breakdown dialog can only list *sources* — an item, a card, a buff, a skill.
 * Most of these values are not sums of those: a Precisão of 376 is mostly
 * `175 + nível + DES + SOR/3 + CON×2`, and a build with no gear at all still has one.
 * Listing the equipment alone would either open an empty dialog or, worse, show three rows
 * adding up to a fraction of the number that was clicked.
 *
 * So the rows that have one name it here. The dialog prints it as one more row, valued at
 * whatever the equipment does not account for, and `canBreakdown` treats having an origin
 * as reason enough to make the value clickable — a value that comes purely from attributes
 * is exactly the one whose reader most needs to be told so.
 *
 * It rides on the RowSpec rather than in a table of its own so that the total it is the
 * remainder of is the row's own `read` — one expression, not two that have to agree. A
 * second spelling of "HP máx. is `calc.maxHp`" would leave the panel right and the dialog
 * silently wrong by the difference.
 */
export interface StatOrigin {
  /** How the dialog names the row. */
  label: string;
  /**
   * The subset of the row's keys that add *linearly* into its value, so subtracting the
   * equipment's contribution leaves the origin's own. Defaults to every key.
   *
   * The exceptions are the ones that multiply rather than add: `hpPercent` scales the whole
   * HP pool, `aspdPercent` scales the distance to the ASPD ceiling, and `criRange` is not
   * summed into the crit rate at all (it counts only on the ranged basic attack). Summing
   * those in as if they were points would show a remainder that is simply wrong.
   */
  sumKeys?: string[];
}

interface RowSpec {
  label: string;
  valueClass: string;
  keys: string[];
  bdLabel?: string;
  read: (s: any, opts: StatsSummaryOptions) => Displayed;
  /** Present when the value carries more than equipment — see StatOrigin. Labels ending in
   *  "e outros" are the ones whose remainder holds more than the attributes named: refine,
   *  ASPD potions, or a percentage that scaled the equipment's own share along with the
   *  base. Naming the dominant term and admitting the rest beats a false claim of purity. */
  origin?: StatOrigin;
  /**
   * Whether a rising value is an improvement. False for the cast/delay rows: they are
   * printed already negated, so -72% -> -77% is a *fall* in the displayed number and a
   * gain for the build.
   */
  greaterIsBetter?: boolean;
  /** Decimals the delta is printed with — the only row that needs any is Conj. Fixa. */
  deltaDecimals?: number;
  note?: (s: any) => string | undefined;
  suffix?: (s: any) => string | undefined;
  /** What the hover text calls this value, when the printed label won't do — only the
   *  hits/s figure, which carries its unit instead of a label. */
  tooltipLabel?: string;
}

/**
 * The comparison cell for one row, or null when there is nothing to say.
 *
 * Nothing to say means either no compared build or an unchanged value — an unchanged row
 * renders no cell at all rather than a muted "→ 705 ±0", so the delta column carries only
 * the rows the swap actually moved.
 */
function compareCell(cur: Displayed, cmp: Displayed | null, greaterIsBetter: boolean, deltaDecimals?: number): CompareCell | null {
  if (!cmp || cmp.total === cur.total) return null;

  const delta = cmp.total - cur.total;
  const better = greaterIsBetter ? delta > 0 : delta < 0;

  return {
    text: cmp.text,
    deltaText: formatSignedNumber(delta, 0, deltaDecimals ?? 0),
    deltaClass: better ? 'compare_greater' : 'compare_lower',
  };
}

function buildRow(spec: RowSpec, cur: any, cmp: any | null, opts: StatsSummaryOptions): SummaryRow {
  const value = spec.read(cur, opts);
  const clickable = spec.keys.length > 0 && opts.canBreakdown(spec.keys, false);
  const compareClickable = spec.keys.length > 0 && opts.canBreakdown(spec.keys, true);
  const tip = spec.tooltipLabel || spec.label;

  return {
    label: spec.label,
    text: value.text,
    valueClass: spec.valueClass,
    keys: spec.keys,
    bdLabel: spec.bdLabel,
    note: spec.note?.(cur) || undefined,
    suffix: spec.suffix?.(cur) || undefined,
    compare: compareCell(value, cmp ? spec.read(cmp, opts) : null, spec.greaterIsBetter !== false, spec.deltaDecimals),
    clickable,
    compareClickable,
    tooltip: tip,
    compareTooltip: `${tip} (comparação)`,
  };
}

// --- Row definitions --------------------------------------------------------------
//
// Values are the same expressions the panel has always read off totalSummary; only the
// layout around them changed. Colour classes follow the stat family: orange for the ATQ
// side, blue for ATQM and casting, purple for defence, yellow for HP/SP and DES2 INT1.

const ATTACK_ROWS: RowSpec[] = [
  {
    label: 'Alt+Q ATQ',
    valueClass: 'summary_stat_atk',
    keys: ['atk'],
    bdLabel: 'ATQ',
    read: (s) => pair(s?.calc?.totalStatusAtk, weaponAtk(s)),
    origin: { label: 'Base (arma/atributos/outros)' },
  },
  { label: 'P.ATQ', valueClass: 'summary_stat_atk2', keys: ['pAtk'], read: (s) => num(s?.dmg?.pAtk), origin: { label: 'Atributos (POD/CON)' } },
  { label: 'Corpo a corpo', valueClass: 'summary_stat_atk', keys: ['melee'], read: (s) => pct(s?.melee) },
  { label: 'À distância', valueClass: 'summary_stat_atk', keys: ['range'], read: (s) => pct(s?.range) },
];

const MAGIC_ROWS: RowSpec[] = [
  {
    label: 'Alt+Q ATQM',
    valueClass: 'summary_stat_matk',
    keys: ['matk'],
    bdLabel: 'ATQM',
    read: (s) => pair(s?.calc?.totalStatusMatk, weaponMatk(s)),
    origin: { label: 'Base (arma/atributos/outros)' },
  },
  { label: 'ATQM %', valueClass: 'summary_stat_matk', keys: ['matkPercent'], read: (s) => pct(s?.matkPercent) },
  { label: 'S.ATQM', valueClass: 'summary_stat_matk2', keys: ['sMatk'], read: (s) => num(s?.dmg?.sMatk), origin: { label: 'Atributos (FEI/CON)' } },
];

// The Crítico value is the crit EVERY attack takes; "CRIT à distância" is not summed into
// it, because it only counts on the ranged basic attack. When the build has some, the
// value carries a "*" and the breakdown says so in full.
const criRangeNote = (s: any): string | undefined =>
  s?.calc?.criRangeBonus
    ? `CRIT à distância +${s.calc.criRangeBonus} conta só no ataque básico com arma de longo alcance — habilidades não recebem, por isso ele não entra no valor acima.`
    : undefined;

const ACCURACY_ROWS: RowSpec[] = [
  { label: 'Precisão', valueClass: 'summary_stat_atk', keys: ['hit'], read: (s) => num(s?.calc?.totalHit), origin: { label: 'Base (nível, DES, SOR e CON)' } },
  {
    label: 'Precisão perfeita',
    valueClass: 'summary_stat_atk',
    keys: ['perfectHit'],
    read: (s) => pct(s?.calc?.totalPerfectHit),
    // Every build starts at DEFAULT_PERFECT_HIT (5), which belongs to no equipped source.
    origin: { label: 'Base e atributos (SOR)' },
  },
  {
    label: 'Crítico',
    valueClass: 'summary_stat_atk',
    keys: ['cri', 'criRange'],
    read: (s) => pct(s?.calc?.totalCri),
    note: criRangeNote,
    // Katar doubles the whole crit rate, the equipment's share included — hence "e arma".
    origin: { label: 'Atributos (SOR) e arma', sumKeys: ['cri'] },
  },
  { label: 'Dano crítico', valueClass: 'summary_stat_atk', keys: ['criDmg'], read: (s) => pct(s?.criDmg) },
  { label: 'T.CRIT', valueClass: 'summary_stat_atk2', keys: ['cRate'], read: (s) => num(s?.dmg?.cRate), origin: { label: 'Atributos (CRV)' } },
];

const RESOURCE_ROWS: RowSpec[] = [
  {
    label: 'HP máx.',
    valueClass: 'summary_stat_yellow',
    keys: ['hp', 'hpPercent'],
    read: (s) => num(s?.calc?.maxHp),
    origin: { label: 'Base (classe, nível e VIT) e outros', sumKeys: ['hp'] },
  },
  {
    label: 'SP máx.',
    valueClass: 'summary_stat_yellow',
    keys: ['sp', 'spPercent'],
    read: (s) => num(s?.calc?.maxSp),
    origin: { label: 'Base (classe, nível e INT) e outros', sumKeys: ['sp'] },
  },
  // Display only: the engine never applies either (see EquipmentSummaryModel.healReceived
  // and .healPower), so the rows read the equipment sum straight and carry no origin —
  // there is no base healing figure for a remainder to be taken against. The two are the
  // heal a character receives and the heal it casts, and the game words them apart.
  { label: 'Regen. HP', valueClass: 'summary_stat_yellow', keys: ['hpRecovRate'], read: (s) => pct(s?.hpRecovRate) },
  { label: 'Regen. SP', valueClass: 'summary_stat_yellow', keys: ['spRecovRate'], read: (s) => pct(s?.spRecovRate) },
  { label: 'Cura recebida', valueClass: 'summary_stat_yellow', keys: ['healReceived'], read: (s) => pct(s?.healReceived) },
  { label: 'Efetividade de cura', valueClass: 'summary_stat_yellow', keys: ['healPower'], read: (s) => pct(s?.healPower) },
];

// TEN / TENM share one line in the game's own window, but they are two independent stats
// with a breakdown each — a single row could only ever carry one delta honestly.
const DEFENCE_ROWS: RowSpec[] = [
  // DEF and DEFM print "50 + 120" and the origin row carries both halves, so its label
  // names them in the same order: an armour's own DEF is not a scripted bonus and can never
  // be listed as a source of its own.
  {
    label: 'DEF',
    valueClass: 'summary_stat_def',
    keys: ['def'],
    read: (s) => pair(s?.calc?.softDef, s?.calc?.def),
    origin: { label: 'DEF suave (VIT/AGI/nível) + DEF do equipamento' },
  },
  {
    label: 'DEFM',
    valueClass: 'summary_stat_def',
    keys: ['mdef'],
    read: (s) => pair(s?.calc?.softMdef, s?.calc?.mdef),
    origin: { label: 'DEFM suave (INT/VIT/DES/nível) + DEFM do equipamento' },
  },
  { label: 'TEN', valueClass: 'summary_stat_def2', keys: ['res'], read: (s) => num(s?.calc?.res), origin: { label: 'Atributos (STA) e refino' } },
  { label: 'TENM', valueClass: 'summary_stat_def2', keys: ['mres'], read: (s) => num(s?.calc?.mres), origin: { label: 'Atributos (SAB) e refino' } },
  {
    label: 'Esquiva',
    valueClass: 'summary_stat_def',
    keys: ['flee', 'perfectDodge'],
    read: (s) => pair(s?.calc?.totalFlee, s?.calc?.totalPerfectDodge),
    origin: { label: 'Base (nível, AGI, SOR e CON)' },
  },
  // Display only, like the sustain rows in Recursos: the engine models damage dealt, so a
  // reflected-damage reduction has nothing to reduce here. It sits in Defesa because that
  // is where the reductions read, not because the pipeline uses it.
  { label: 'Res. dano refletido', valueClass: 'summary_stat_def2', keys: ['reduceDamageReturn'], read: (s) => pct(s?.reduceDamageReturn) },
];

/** A cast/delay row: the component formats the text (negated, with its unit); the delta is
 *  taken on that same displayed number, so "more negative" reads as the gain it is. */
const castRow = (label: string, key: string, unit = '', deltaDecimals?: number): RowSpec => ({
  label,
  valueClass: 'summary_stat_matk',
  keys: [key],
  greaterIsBetter: false,
  deltaDecimals,
  read: (s, opts) => ({ text: `${opts.bonusValueText(key, n(s?.[key]))}${unit}`, total: -n(s?.[key]) }),
});

const CASTING_ROWS: RowSpec[] = [
  castRow('Pós-conjuração', 'acd'),
  castRow('Conj. Fixa', 'fct', 's', 3),
  castRow('Conj. Variável', 'vct'),
  {
    // A pure formula over DES/INT — no equipment sources, so no breakdown to open.
    label: 'DES2 INT1',
    valueClass: 'summary_stat_yellow',
    keys: [],
    read: (s) => num(s?.calc?.dex2int1),
    suffix: (s) => (n(s?.calc?.to530) > 0 ? `( faltam ${formatNumber(n(s.calc.to530))} )` : undefined),
  },
];

type HeadlineSpec = RowSpec & { kind: 'stat' | 'rate'; tooltip?: string };

const HEADLINE_SPECS: HeadlineSpec[] = [
  { kind: 'stat', label: 'ATQ', valueClass: 'summary_stat_atk', keys: ['atk'], read: (s) => num(n(s?.calc?.totalStatusAtk) + weaponAtk(s)) },
  { kind: 'stat', label: 'ATQM', valueClass: 'summary_stat_matk', keys: ['matk'], read: (s) => num(n(s?.calc?.totalStatusMatk) + weaponMatk(s)) },
  {
    kind: 'stat',
    label: 'Vel.Atq',
    valueClass: 'summary_stat_atk',
    keys: ['aspd', 'aspdPercent', 'skillAspd', 'skillAspdPercent'],
    read: (s) => num(s?.calc?.totalAspd),
    // Only the flat `aspd` is added to the result; `skillAspd` is scaled by AGI and
    // `aspdPercent` by the room left to the cap, so neither can be subtracted as points.
    origin: { label: 'Base (classe, arma, AGI e DES) e outros', sumKeys: ['aspd'] },
  },
  {
    kind: 'rate',
    label: '',
    valueClass: 'summary_highlight',
    keys: [],
    tooltipLabel: 'Golpes por segundo',
    // formatRate is the 0/2 precision this rate is printed at everywhere else (the curve
    // dialog, the cast popover); a compared "7 hits/s" beside "7,14 hits/s" would read as
    // a change that isn't there. The delta is carried in centi-hits so a 0,01 move still
    // registers as one.
    read: (s) => ({ text: `${formatRate(n(s?.calc?.hitPerSecs))} hits/s`, total: Math.round(n(s?.calc?.hitPerSecs) * 100) }),
  },
];

/** Drop the groups a build has no use for, so a column never renders a bare header. */
/**
 * The origins, indexed the way the breakdown dialog asks for them: by the whole key list a
 * click carries (`keys.join('|')`), not by a single key. "Esquiva" asks for `flee` and
 * `perfectDodge` together and "HP máx." for `hp` and `hpPercent`, and the origin belongs to
 * the pair rather than to either half. An exact match also keeps this from firing on some
 * other caller that happens to share one key.
 *
 * Built from the specs above rather than written out again, so the value the origin is the
 * remainder of is the row's own `read` and cannot drift from what the panel prints. The
 * three rows that share a signature with a headline (ATQ, ATQM, Vel.Atq) read the same
 * total either way.
 */
const ORIGIN_BY_KEYS: ReadonlyMap<string, StatOrigin & { total: (s: any) => number }> = new Map(
  [...ATTACK_ROWS, ...MAGIC_ROWS, ...ACCURACY_ROWS, ...RESOURCE_ROWS, ...DEFENCE_ROWS, ...CASTING_ROWS, ...HEADLINE_SPECS]
    .filter((spec) => !!spec.origin)
    .map((spec) => [spec.keys.join('|'), { ...spec.origin!, total: (s: any) => spec.read(s, ORIGIN_READ_OPTS).total }]),
);

/** No row that declares an origin reads `opts` — only the cast/delay rows do, and a
 *  reduction is pure equipment. Passing a stub keeps `read` to one signature. */
const ORIGIN_READ_OPTS = { showHpSp: true, bonusValueText: () => '', canBreakdown: () => false } as StatsSummaryOptions;

/** The non-equipment origin of a breakdown lookup, or null when it has none — every value
 *  granted by gear alone (Corpo a corpo, Dano crítico, the cast reductions). */
export function statOriginFor(keys: string[]): (StatOrigin & { total: (s: any) => number }) | null {
  return ORIGIN_BY_KEYS.get(keys.join('|')) ?? null;
}

const groups = (...list: (SummaryGroup | null)[]): SummaryGroup[] => list.filter((g): g is SummaryGroup => !!g);

export function buildStatsSummary(cur: any, cmp: any | null, opts: StatsSummaryOptions): StatsSummaryView {
  const rows = (specs: RowSpec[]) => specs.map((spec) => buildRow(spec, cur, cmp, opts));

  const headline = HEADLINE_SPECS.map((spec): SummaryHeadline => {
    const row = buildRow(spec, cur, cmp, opts);

    return {
      ...row,
      kind: spec.kind,
      // The headline prints its own name — "ATQ 328" — where the rows below put the label
      // in a column of its own. The rate has no name, only the unit inside its value.
      text: spec.label ? `${spec.label} ${row.text}` : row.text,
      // The rate opens the curve rather than a breakdown, so it is clickable regardless of
      // whether any equipment sources it — and then it has a tooltip to promise.
      clickable: spec.kind === 'rate' || row.clickable,
      compareClickable: spec.kind === 'rate' || row.compareClickable,
      tooltip: spec.kind === 'rate' ? spec.tooltipLabel : row.tooltip,
      compareTooltip: spec.kind === 'rate' ? `${spec.tooltipLabel} (comparação)` : row.compareTooltip,
      // The headline already shouts the figure; the compared one repeats it, but the raw
      // delta belongs to the row below, where it has a column of its own to line up in.
      compare: row.compare ? { ...row.compare, deltaText: spec.kind === 'rate' ? '' : row.compare.deltaText } : null,
    };
  });

  return {
    headline,
    // Paired so the three columns come out 8 / 8 / 7 rows deep. Ataque with Conjuração
    // rather than with Mágico is what keeps the panel as short as the two input cells
    // beside it — the alternative leaves Defesa+Conjuração nine rows deep and the whole
    // row grows to match.
    columns: [
      groups(
        { title: 'Ataque', rows: rows(ATTACK_ROWS) },
        { title: 'Conjuração', rows: rows(CASTING_ROWS) },
      ),
      groups(
        { title: 'Mágico', rows: rows(MAGIC_ROWS) },
        { title: 'Precisão e crítico', rows: rows(ACCURACY_ROWS) },
      ),
      groups(
        { title: 'Defesa', rows: rows(DEFENCE_ROWS), showReduction: true },
        opts.showHpSp ? { title: 'Recursos', rows: rows(RESOURCE_ROWS) } : null,
      ),
    ],
  };
}
