import { VALID_SKILL_IDS } from '../skills';
import { WeaponTypeNameMapBySubTypeId } from '../constants/weapon-type-mapper';

export type VisualConditionKind = 'none' | 'refine' | 'refineStep' | 'grade' | 'level' | 'stat' | 'statMin'
  | 'equip' | 'class' | 'skill' | 'activeSkill' | 'loyalty' | 'weaponType' | 'ammoType' | 'position' | 'spawn' | 'until';

export interface VisualCondition {
  kind: VisualConditionKind;
  value: string | number | null;
  extra?: number | null;
}

export interface VisualItemRule {
  key: string;
  value: number | null;
  conditions: VisualCondition[];
  /** Untouched imports retain their exact legacy spelling and order. */
  source?: { expression: string; state: string };
  readOnly?: boolean;
  description?: string;
}

const stateOf = (rule: VisualItemRule) => JSON.stringify([rule.value, rule.conditions.filter(({ kind }) => kind !== 'none')]);
const stats = new Set(['str', 'agi', 'vit', 'int', 'dex', 'luk', 'level', 'jobLevel']);
const weaponTypes = new Set<string>(Object.values(WeaponTypeNameMapBySubTypeId));

export function compileVisualItemRule(rule: VisualItemRule): { expression?: string; errors: string[] } {
  if (rule.source && (rule.readOnly || rule.source.state === stateOf(rule))) {
    return { expression: rule.source.expression, errors: [] };
  }
  const errors: string[] = [];
  if (rule.value == null || !Number.isFinite(rule.value)) errors.push('Informe um valor numérico para o bônus.');
  const gates = new Map<VisualConditionKind, string>();
  const equipped: number[] = [];
  let scale = '';
  for (const [index, condition] of rule.conditions.entries()) {
    const { kind, extra } = condition;
    if (kind === 'none') continue;
    const value = String(condition.value ?? '').trim();
    const n = Number(value);
    const integer = (min = 1, max = Number.MAX_SAFE_INTEGER) => value !== '' && Number.isSafeInteger(n) && n >= min && n <= max;
    const fail = (message: string) => errors.push(`Condição ${index + 1}: ${message}`);
    if (!value) { fail('preencha o valor ou selecione uma opção.'); continue; }
    if (kind !== 'equip' && rule.conditions.slice(0, index).some((entry) => entry.kind === kind)) {
      fail('este tipo já está presente neste bônus. Edite a condição existente.');
      continue;
    }
    let token = '';
    switch (kind) {
      case 'refine':
        if (!integer(0, 20)) fail('informe um refino entre 0 e 20.');
        token = `REFINE[${n}]`;
        break;
      case 'refineStep':
        if (!integer()) fail('o intervalo de refinos deve ser um inteiro maior que zero.');
        token = `${n}---`;
        break;
      case 'grade':
        if (!/^[DCBA]$/.test(value)) fail('selecione uma graduação.');
        token = `GRADE[me==${value}]`;
        break;
      case 'level':
        if (!integer()) fail('informe um nível base inteiro maior que zero.');
        token = `LEVEL[${n}]`;
        break;
      case 'stat': case 'statMin':
        if (!stats.has(value)) fail('selecione um atributo ou nível.');
        if (extra == null || !Number.isSafeInteger(extra) || extra < 1) fail('informe uma quantidade inteira maior que zero.');
        token = `${value}:${extra}${kind === 'stat' ? '---' : '==='}`;
        break;
      case 'equip':
        if (!integer()) fail('selecione o item que deve estar equipado.');
        equipped.push(n);
        break;
      case 'class':
        if (!/^[\w -]+$/.test(value)) fail('selecione uma classe.');
        token = `USED[${value}]`;
        break;
      case 'skill': case 'activeSkill':
        if (!integer() || !VALID_SKILL_IDS.has(n)) fail('selecione uma habilidade do catálogo.');
        if (kind === 'skill' && (extra == null || !Number.isSafeInteger(extra) || extra < 1)) fail('informe o nível mínimo aprendido.');
        // SKILL_ID2 gates a following condition or scaling as well as a constant.
        token = kind === 'skill' ? `SKILL_ID2[${n}==${extra}]` : `ACTIVE_SKILL_ID[${n}]`;
        break;
      case 'loyalty':
        if (!integer(1, 4)) fail('selecione a faixa de lealdade.');
        token = `LOYALTY[${n}]`;
        break;
      case 'weaponType':
        if (!weaponTypes.has(value)) fail('selecione um tipo de arma.');
        token = `WEAPON_TYPE[${value}]`;
        break;
      case 'ammoType':
        if (!integer(1024, 1028)) fail('selecione um tipo de munição.');
        token = `AMMO_SUBTYPE[${n}]`;
        break;
      case 'position':
        if (!/^[a-zA-Z]+[0-4]?$/.test(value)) fail('selecione uma posição.');
        token = `POS[${value}]`;
        break;
      case 'spawn':
        if (!/^[a-zA-Z0-9_@-]+$/.test(value)) fail('informe um único código de mapa.');
        token = `SPAWN[${value}]`;
        break;
      case 'until': {
        const date = new Date(`${value}T12:00:00Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
          fail('informe uma data válida.');
        }
        token = `UNTIL[${value}]`;
        break;
      }
    }
    if (kind === 'refineStep' || kind === 'stat' || kind === 'statMin') {
      if (scale) fail('use apenas um intervalo ou limite de atributo por bônus; esta combinação não é suportada pelo cálculo.');
      scale = token;
    } else if (token) gates.set(kind, token);
  }
  if (errors.length) return { errors };
  if (equipped.length) gates.set('equip', `EQUIP_ID[${[...new Set(equipped)].join('&&')}]`);
  // Keep weapon type last: the legacy evaluator's weapon regex is greedy across
  // nonnumeric clauses. All other gates precede the numeric/scaling tail.
  const order: VisualConditionKind[] = ['equip', 'ammoType', 'until', 'loyalty', 'grade', 'class', 'skill',
    'level', 'activeSkill', 'position', 'spawn', 'refine', 'weaponType'];
  const prefix = order.map((kind) => gates.get(kind) ?? '').join('');
  const tail = scale ? `${scale}${rule.value}` : `${prefix ? '===' : ''}${rule.value}`;
  return { expression: `${prefix}${tail}`, errors };
}

/** Parse only expressions that can be represented without losing clauses. */
export function readVisualItemRule(key: string, expression: string): VisualItemRule {
  const rule: VisualItemRule = { key, value: null, conditions: [] };
  let rest = expression;
  const add = (kind: VisualConditionKind, value: string | number, extra?: number) => {
    rule.conditions.push(extra == null ? { kind, value } : { kind, value, extra });
  };
  while (rest.startsWith('===') || /^[A-Z_][A-Z_0-9]*\[/.test(rest)) {
    if (rest.startsWith('===')) { rest = rest.slice(3); continue; }
    const match = rest.match(/^([A-Z_][A-Z_0-9]*)\[([^\]]+)]/);
    if (!match || rest.slice(match[0].length).startsWith('---')) break;
    const [, token, body] = match;
    let supported = true;
    if (token === 'REFINE' && /^\d+$/.test(body)) add('refine', Number(body));
    else if (token === 'GRADE' && /^me==[DCBA]$/.test(body)) add('grade', body.slice(4));
    else if (token === 'EQUIP_ID' && /^\d+(?:&&\d+)*$/.test(body)) body.split('&&').forEach((id) => add('equip', Number(id)));
    else if (['SKILL_ID', 'SKILL_ID2'].includes(token) && /^\d+==\d+$/.test(body)) {
      // SKILL_ID (without 2) only gates a numeric tail in the legacy engine.
      if (token === 'SKILL_ID' && !/^(?:===)?-?\d/.test(rest.slice(match[0].length))) supported = false;
      else { const [id, level] = body.split('==').map(Number); add('skill', id, level); }
    } else {
      const kind = ({ LEVEL: 'level', LOYALTY: 'loyalty', AMMO_SUBTYPE: 'ammoType', ACTIVE_SKILL_ID: 'activeSkill',
        USED: 'class', WEAPON_TYPE: 'weaponType', POS: 'position', SPAWN: 'spawn', UNTIL: 'until' } as const)[token];
      if (!kind) supported = false;
      else if (['level', 'loyalty', 'ammoType', 'activeSkill'].includes(kind)) {
        if (/^\d+$/.test(body)) add(kind, Number(body)); else supported = false;
      } else add(kind, body);
    }
    if (!supported) break;
    rest = rest.slice(match[0].length);
  }
  const number = '-?\\d+(?:\\.\\d+)?';
  const plain = rest.match(new RegExp(`^(${number})$`));
  const refine = rest.match(new RegExp(`^(\\d+)(===|---)(${number})$`));
  const stat = rest.match(new RegExp(`^(str|agi|vit|int|dex|luk|level|jobLevel):(\\d+)(===|---)(${number})$`));
  if (plain) rule.value = Number(plain[1]);
  else if (refine) { add(refine[2] === '===' ? 'refine' : 'refineStep', Number(refine[1])); rule.value = Number(refine[3]); }
  else if (stat) { add(stat[3] === '===' ? 'statMin' : 'stat', stat[1], Number(stat[2])); rule.value = Number(stat[4]); }
  else rule.readOnly = true;
  if (!rule.readOnly && compileVisualItemRule(rule).errors.length) rule.readOnly = true;
  rule.source = { expression, state: stateOf(rule) };
  return rule;
}
