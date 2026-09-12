import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { Biolo } from 'src/app/jobs/Biolo';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * Guard for the `EQUIP[name]` -> `EQUIP_ID[id]` migration of the two Primordial-LT swords —
 * 63 clauses over 8 records, every one of them a Cientista/Bioquímico combo partner:
 *
 *   EQUIP[Red Lotus Sword-LT] -> EQUIP_ID[500039]   Sabre Primordial-LT
 *   EQUIP[Slate Sword-LT]     -> EQUIP_ID[500040]   Lâmina Primordial-LT
 *
 * `EQUIP[<english name>]` is the legacy form (docs/item-json.md, CLAUDE.md): it resolves
 * through the record's English name, so a pt-BR rename or an `[Apoio]`-style suffix silently
 * stops the bonus paying, and it couples every record that happens to share a display name.
 *
 * It was **working** before this migration — `Calculator.matchName` strips a trailing `[2]`,
 * so "Red Lotus Sword-LT [2]" did match — which is exactly why the swap has to be proved
 * inert rather than assumed: the point is to remove the fragility, not to change a number.
 *
 * Two independent checks, because neither covers the other:
 *
 * - **The baseline** (`cordao-lt-combo-baseline.json`, 152 cases) was recorded from the
 *   engine *before* the migration and is asserted unchanged after it. Each of the 8 records
 *   is exercised against both partners across the refine and grade thresholds its clauses
 *   gate on, so every branch is walked at least once.
 * - **The structural invariant** catches what a baseline cannot: that each `EQUIP_ID[...]`
 *   names *every* record sharing the partner's English name. Both swords happen to have a
 *   single generation today, and that is the thing worth pinning — the client re-issues
 *   items under new ids keeping the old English name, and a one-id rewrite would then stop
 *   paying the other generation without any test noticing.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const baseline: Array<{
  id: number;
  slot: string;
  parceiro: number;
  refine: number;
  grade: string;
  bonus: Record<string, number>;
}> = JSON.parse(readFileSync('src/app/core/__tests__/cordao-lt-combo-baseline.json', 'utf8'));

/** The partner ids the migration wrote in, keyed by the English name they replaced. */
const PARCEIROS: Record<string, number> = {
  'Red Lotus Sword-LT': 500039,
  'Slate Sword-LT': 500040,
};

/** Same normalisation `Calculator.matchName` applies before comparing. */
const matchName = (n: string) => (n || '').replace(/\[\d]$/, '').trim();

describe('Primordial-LT — o conjunto migrado para EQUIP_ID', () => {
  /**
   * The behavioural half. A case is one record, in its own slot, with one partner at one
   * refine and grade; `bonus` is every non-zero key of `totalEquipStatus`. All 152 have to
   * come back identical — the migration is a rename of the matcher, not of the effect.
   */
  it.each(baseline.map((c, i) => ({ i, ...c })))(
    'caso $i: item $id com parceiro $parceiro +$refine grau "$grade"',
    ({ id, slot, parceiro, refine, grade, bonus }) => {
      const m: any = createMainModel();
      m[slot] = id;
      if (slot === 'headUpperEnchant1') m.headUpper = 400960;
      if (parceiro) {
        m.weapon = parceiro;
        m.weaponRefine = refine;
        m.weaponGrade = grade;
      }

      const st = equipStatusOf(makeCalculator(db, new Biolo()), m);
      const nz: Record<string, number> = {};
      for (const [k, v] of Object.entries(st)) if (typeof v === 'number' && v) nz[k] = v;

      expect(nz).toEqual(bonus);
    },
  );

  /**
   * The structural half. If either sword is ever re-issued under a second id carrying the
   * same English name, this fails and the `EQUIP_ID[...]` has to grow an `||` for the new
   * generation — which is precisely the trap CLAUDE.md warns about, and the one a behavioural
   * baseline recorded today cannot possibly catch.
   */
  it.each(Object.entries(PARCEIROS))('EQUIP_ID de "%s" lista todas as gerações', (nome, id) => {
    const geracoes = Object.entries<any>(db)
      .filter(([, it]) => matchName(it.name) === nome || matchName(it.unidName) === nome)
      .map(([k]) => Number(k))
      .sort((a, b) => a - b);

    expect(geracoes).toEqual([id]);
  });

  /** E nenhum dos 8 registros pode voltar a citar as duas espadas pelo nome. */
  it('nenhum registro voltou a casar as espadas por nome', () => {
    const porNome = Object.entries<any>(db).filter(([, it]) =>
      Object.keys(PARCEIROS).some((nome) => JSON.stringify(it.script ?? {}).includes(`EQUIP[${nome}]`)),
    );

    expect(porNome).toEqual([]);
  });
});
