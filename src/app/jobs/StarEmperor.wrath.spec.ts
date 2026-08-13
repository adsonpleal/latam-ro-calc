import { describe, expect, it } from 'vitest';
import { InfoForClass } from 'src/app/models/info-for-class.model';
import { StarEmperor } from './StarEmperor';

/**
 * Fúria Estelar (Wrath of, id 437) — o bônus de ATQ que entra em modifyFinalAtk.
 *
 * A descrição pt-BR do cliente: "Melhora o ATQ contra alvos Estelares. Aumentar o nv. da
 * habilidade melhora o ATQ baseado na FOR, SOR, DES e nível base." A FOR está na lista sem
 * condição nenhuma — até 13/08/2026 o código só a somava contra alvos de tamanho Grande,
 * o que zerava a parcela da FOR contra qualquer boss de tamanho Médio.
 *
 * Estes testes travam a leitura da descrição, não uma medição: não existe gravação com a
 * Fúria ligada. Se um `.rrf` de Gladiador Estelar aparecer, é aqui que ele encosta.
 */

const info = (opts: { level: number; str: number; dex: number; luk: number; size: string }): InfoForClass =>
  ({
    model: { level: opts.level },
    status: { totalStr: opts.str, totalDex: opts.dex, totalLuk: opts.luk },
    monster: { size: opts.size },
  } as any);

/** Instancia a classe com a Fúria ligada ou desligada. */
const star = (ligada: boolean): StarEmperor => {
  const c = new StarEmperor();
  (c as any).bonuses = {
    activeSkillNames: new Set<string>(ligada ? ['Wrath of'] : []),
    usedSkillMap: new Map<string, number>(ligada ? [['Wrath of', 3]] : []),
    learnedSkillMap: new Map<string, number>(),
    equipAtks: {},
    masteryAtks: {},
  };
  return c;
};

describe('Fúria Estelar — o bônus de ATQ', () => {
  it('desligada não dá bônus nenhum', () => {
    expect(star(false).getWrathAtkBonus(info({ level: 239, str: 132, dex: 129, luk: 128, size: 'm' }))).toBe(0);
  });

  it('soma nível base + SOR + DES + FOR, dividido por 3', () => {
    // (239 + 128 + 129 + 132) / 3 = 628 / 3 = 209,33 -> 209
    expect(star(true).getWrathAtkBonus(info({ level: 239, str: 132, dex: 129, luk: 128, size: 'm' }))).toBe(209);
  });

  it('o tamanho do alvo não muda mais o bônus — Médio, Grande e Pequeno dão o mesmo', () => {
    const s = star(true);
    const base = { level: 239, str: 132, dex: 129, luk: 128 };
    const medio = s.getWrathAtkBonus(info({ ...base, size: 'm' }));
    const grande = s.getWrathAtkBonus(info({ ...base, size: 'l' }));
    const pequeno = s.getWrathAtkBonus(info({ ...base, size: 's' }));

    expect(medio).toBe(grande);
    expect(pequeno).toBe(grande);
  });

  it('a FOR realmente pesa: zerá-la derruba o bônus', () => {
    const s = star(true);
    const comFor = s.getWrathAtkBonus(info({ level: 239, str: 132, dex: 129, luk: 128, size: 'm' }));
    const semFor = s.getWrathAtkBonus(info({ level: 239, str: 0, dex: 129, luk: 128, size: 'm' }));

    expect(comFor - semFor).toBe(44); // ⌊628/3⌋ − ⌊496/3⌋ = 209 − 165
  });
});
