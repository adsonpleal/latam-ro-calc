import { bonusKeyLabel } from 'src/app/core/bonus-key-label';
import { ItemValidationError } from 'src/app/core/custom-items';

const FIELD_LABELS: Record<string, string> = {
  id: 'Identificador do item', name: 'Nome', kind: 'Tipo', itemSubTypeId: 'Subtipo',
  itemLevel: 'Nível do item', attack: 'ATQ base', baseMatk: 'ATQM base', defense: 'DEF base',
  weight: 'Peso', compositionPos: 'Posição da carta', propertyAtk: 'Propriedade elemental',
  usableClass: 'Classes permitidas', locations: 'Posições ocupadas',
  cardCapacity: 'Quantidade de cartas', enchantCapacity: 'Quantidade de encantamentos', baCapacity: 'Quantidade de BAs',
  defaults: 'Cartas, encantamentos e BAs iniciais', defaultCards: 'Carta inicial',
  defaultEnchants: 'Encantamento inicial', defaultBas: 'BA inicial', script: 'Script',
  autoCast: 'Autoconjuração', autoCastEffect: 'Efeito de autoconjuração', autoCastPending: 'Autoconjuração indisponível',
  skillId: 'Habilidade', skillName: 'Nome da habilidade', skillLevel: 'Nível da habilidade',
  skillLevelMode: 'Modo do nível', chance: 'Chance', trigger: 'Gatilho',
  requiredEquippedItemIds: 'Item necessário', bonusPerRefine: 'Bônus por refino',
  durationSeconds: 'Duração em segundos', reason: 'Motivo', label: 'Descrição',
};

/** UI copy only: validation and MCP keep their structured field paths. */
export function itemValidationMessage(error: ItemValidationError, includeItem = false): string {
  const item = error.path.match(/^items\[(\d+)\]/);
  const prefix = includeItem && item ? `Item ${Number(item[1]) + 1} — ` : '';
  const path = error.path.replace(/^items(?:\[\d+\])?\.?/, '');
  if (path === 'name') return `${prefix}Dê um nome ao item.`;
  const location = path.split('.').filter(Boolean).map((part, index, parts) => {
    const [, key, entry] = part.match(/^([^[]+)(?:\[(\d+)\])?$/) ?? ['', part];
    const label = FIELD_LABELS[key] ?? (parts[index - 1] === 'script' ? bonusKeyLabel(key) : key);
    return entry == null ? label : `${label} (${parts[index - 1] === 'script' ? 'regra ' : ''}${Number(entry) + 1})`;
  }).join(' · ');
  const message = error.message.replace(/Informe um inteiro de (-?\d+) a (\d+)\./, 'Use um número inteiro entre $1 e $2.');
  return `${prefix}${location ? location + ': ' : ''}${message}`;
}

export function jsonSyntaxMessage(error: unknown, source: string): string {
  const message = error instanceof Error ? error.message : '';
  const incomplete = /unexpected end|unterminated|end of data/i.test(message);
  const position = message.match(/position (\d+)/)?.[1];
  const lineColumn = message.match(/line (\d+) column (\d+)/);
  let location = '';
  if (position != null || incomplete) {
    const before = source.slice(0, position == null ? source.length : Number(position)).split('\n');
    location = ` (linha ${before.length}, coluna ${before[before.length - 1].length + 1})`;
  } else if (lineColumn) location = ` (linha ${lineColumn[1]}, coluna ${lineColumn[2]})`;
  const guidance = incomplete ? 'O texto está incompleto. Confira se todas as aspas, chaves e colchetes foram fechados.'
    : /property name|double-quoted/i.test(message) ? 'Use aspas duplas nos nomes dos campos e remova vírgulas depois do último valor.'
    : /expected ':'/i.test(message) ? 'Separe o nome do campo e seu valor com dois-pontos (:).'
    : /expected ',' or/i.test(message) ? 'Confira as vírgulas entre os valores e o fechamento de chaves e colchetes.'
    : 'Há um caractere ou valor inválido. Confira as aspas duplas, vírgulas e chaves.';
  return `JSON: ${guidance}${location}`;
}

export function itemFailureMessages(error: unknown, fallback: string, source = ''): string[] {
  if (error instanceof SyntaxError) return [jsonSyntaxMessage(error, source)];
  if (error instanceof Error && error.name === 'QuotaExceededError') {
    return ['O armazenamento do navegador está cheio. Exporte seus itens antes de liberar espaço e tente novamente.'];
  }
  if (error instanceof DOMException || !(error instanceof Error)) return [fallback];
  return error.message.split('\n').map((message) => {
    const validation = message.match(/^(items(?:\[\d+\])?(?:\.[^:]+)?): (.+)$/);
    return validation ? itemValidationMessage({ path: validation[1], message: validation[2] }, true) : message;
  });
}
