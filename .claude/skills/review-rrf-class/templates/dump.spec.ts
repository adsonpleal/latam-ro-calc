/*
 * Modelo de despejo de uma gravação .rrf — copie para
 *   src/app/replay/__tests__/_tmp-dump.spec.ts       (caminho git-ignored)
 * troque ARQUIVO, e rode:
 *   npx vitest run src/app/replay/__tests__/_tmp-dump.spec.ts
 *
 * Imprime, em ordem: personagem, criaturas, linha do tempo das armas, todos os pacotes de
 * dano (já com a arma e a contagem do medidor resolvidas), os ZC_PAR_CHANGE e os EFST.
 * Apague o arquivo pelo nome quando terminar.
 */
import { readFileSync } from 'node:fs';
import { it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { importReplayBuffer } from '../replay-to-model';

const ARQUIVO = 'C:/Users/adson/Downloads/TROQUE-AQUI.rrf';
/** EFST do contador que acumula (Pontos de Foco = 1346). 0 desliga a contagem. */
const EFST_CONTADOR = 0;

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));
/** JSON.stringify quebra em BigInt — os pacotes têm alguns. */
const j = (o: unknown) => JSON.stringify(o, (_k, v) => (typeof v === 'bigint' ? String(v) : v));

function buf(p: string) {
  const b = readFileSync(p);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

it('despejo', () => {
  const r: any = decodeReplay(buf(ARQUIVO));
  const { model, learnedSkills, summary }: any = importReplayBuffer(buf(ARQUIVO), items);
  const out: string[] = [];

  out.push('### personagem');
  out.push(j(r.sessionInfo));
  out.push('resumo da importação: ' + j(summary));
  out.push('habilidades aprendidas: ' + j(learnedSkills));

  out.push('\n### criaturas (o mascote entra aqui, não no inventário)');
  for (const e of r.entities?.values?.() ?? []) out.push(`aid=${e.aid} kind=${e.kind} view=${e.view} ${e.name}`);

  out.push('\n### equipamento importado');
  for (const [k, v] of Object.entries(model)) {
    if (typeof v !== 'number' || v < 100 || /^(level|jobLevel|class|str|agi|vit|int|dex|luk|pow|sta|wis|spl|con|crt|job)/.test(k)) continue;
    const nome = latam[String(v)]?.name ?? items[String(v)]?.name ?? '???';
    out.push(`${k} = ${v} ${items[String(v)] ? '' : '[FORA DO item.json] '}${nome}`);
  }
  out.push('bônus aleatórios: ' + j(model.rawOptionTxts?.filter(Boolean)));

  out.push('\n### armas ao longo do tempo');
  const trocas = (r.equipChanges ?? []).filter((e: any) => e.location === 34);
  for (const e of trocas) out.push(`${e.time} ${e.equipped ? 'EQUIPA ' : 'RETIRA '} ${e.itemId} +${e.refine} cartas=[${e.cards.join(',')}] ${latam[String(e.itemId)]?.name ?? ''}`);

  out.push('\n### dano');
  const ticks = EFST_CONTADOR ? (r.statusEvents ?? []).filter((s: any) => s.statusId === EFST_CONTADOR).map((s: any) => s.time) : [];
  let arma = model.weapon;
  let anterior = -1;
  for (const d of r.damage ?? []) {
    for (const t of trocas) if (t.equipped && t.time <= d.time) arma = t.itemId;
    // A gravação costuma começar com o medidor cheio; nos disparos seguintes, conte os ticks.
    const cont = !EFST_CONTADOR ? '' : ` contador=${anterior < 0 ? 'cheio?' : ticks.filter((t: number) => t > anterior && t <= d.time).length}`;
    anterior = d.time;
    out.push(`${String(d.time).padStart(6)} arma=${arma} hab=${d.skillId} nv=${d.skillLevel} dano=${d.damage} count=${d.hits} tipo=${d.hitType}${cont}`);
  }

  out.push('\n### ZC_PAR_CHANGE (41 ATQ · 42 ATQ equip · 52 Crítico · 53 amotion · 225 P.ATQ · 226 S.ATQM · 227 RES · 228 RESM · 229 C.Mais · 230 T.CRÍT)');
  for (const p of r.paramChanges ?? []) out.push(`${String(p.time).padStart(6)} sp=${p.type} valor=${p.value}`);

  out.push('\n### EFST ligados/desligados (nomes: stateicon/efstids.lub no GRF)');
  const vistos = new Map<number, number>();
  for (const s of r.statusEvents ?? []) vistos.set(s.statusId, (vistos.get(s.statusId) ?? 0) + 1);
  for (const [id, n] of [...vistos].sort((a, b) => b[1] - a[1])) out.push(`efst ${id}: ${n} evento(s)`);

  console.log(out.join(String.fromCharCode(10)));
});
