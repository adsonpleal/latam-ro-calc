import { describe, expect, it } from 'vitest';
import { InfoForClass } from 'src/app/models/info-for-class.model';
import { StarEmperor } from './StarEmperor';

/**
 * As três Fúrias — Solar (435), Lunar (436) e Estelar (437) — e o alinhamento por
 * tamanho que decide qual delas vale.
 *
 * A Oposição Solar, Lunar e Estelar (434) "marca permanentemente o alvo com um
 * alinhamento solar, lunar ou estelar **de acordo com o Tamanho dele**":
 *
 *   [Nv 1] Solar l Pequeno l HP mín. —        [Nv 2] Lunar l Médio l HP mín. 6.000
 *   [Nv 3] Estelar l Grande l HP mín. 20.000
 *
 * Daí as três Fúrias não se sobreporem: contra um alvo qualquer, no máximo uma se aplica.
 * A FOR só entra na Estelar — Solar e Lunar dizem "baseado na sua SOR, DES e nível base",
 * a Estelar diz "baseado na FOR, SOR, DES e nível base".
 *
 * Tudo aqui é leitura de descrição, não medição: não existe gravação com Fúria ligada.
 * Se um `.rrf` de Gladiador Estelar aparecer, é neste arquivo que ele encosta.
 */

const alvo = (size: string, hp = 1_000_000, isPlayerTarget = false) => ({ size, data: { hp }, isPlayerTarget });

const info = (opts: { level: number; str: number; dex: number; luk: number; monster: any }): InfoForClass =>
  ({
    model: { level: opts.level },
    status: { totalStr: opts.str, totalDex: opts.dex, totalLuk: opts.luk },
    monster: opts.monster,
  } as any);

/** Instancia a classe com as Fúrias indicadas ligadas. */
const star = (...ligadas: string[]): StarEmperor => {
  const c = new StarEmperor();
  (c as any).bonuses = {
    activeSkillNames: new Set<string>(ligadas),
    usedSkillMap: new Map<string, number>(ligadas.map((s) => [s, 3])),
    learnedSkillMap: new Map<string, number>(),
    equipAtks: {},
    masteryAtks: {},
  };
  return c;
};

const BASE = { level: 239, str: 132, dex: 129, luk: 128 };
/** (239 + 128 + 129 + 132) / 3 = 209 — com FOR. */
const COM_FOR = 209;
/** (239 + 128 + 129) / 3 = 165 — sem FOR. */
const SEM_FOR = 165;

describe('Fúrias — nenhuma ligada', () => {
  it('não dá bônus nenhum', () => {
    expect(star().getWrathAtkBonus(info({ ...BASE, monster: alvo('l') }))).toBe(0);
  });
});

describe('Fúria Estelar — só alvo Grande, e é a única que soma a FOR', () => {
  it('contra Grande soma nível base + SOR + DES + FOR', () => {
    expect(star('Wrath of').getWrathAtkBonus(info({ ...BASE, monster: alvo('l') }))).toBe(COM_FOR);
  });

  it('contra Médio e Pequeno não vale nada — esses alvos não são Estelares', () => {
    const s = star('Wrath of');
    expect(s.getWrathAtkBonus(info({ ...BASE, monster: alvo('m') }))).toBe(0);
    expect(s.getWrathAtkBonus(info({ ...BASE, monster: alvo('s') }))).toBe(0);
  });

  it('alvo Grande com menos de 20.000 de HP não pode ser marcado Estelar', () => {
    expect(star('Wrath of').getWrathAtkBonus(info({ ...BASE, monster: alvo('l', 19_999) }))).toBe(0);
    expect(star('Wrath of').getWrathAtkBonus(info({ ...BASE, monster: alvo('l', 20_000) }))).toBe(COM_FOR);
  });
});

describe('Fúria Lunar — só alvo Médio, e sem a FOR', () => {
  it('contra Médio soma nível base + SOR + DES, sem FOR', () => {
    expect(star('Wrath of Moon').getWrathAtkBonus(info({ ...BASE, monster: alvo('m') }))).toBe(SEM_FOR);
  });

  it('contra Grande e Pequeno não vale nada', () => {
    const s = star('Wrath of Moon');
    expect(s.getWrathAtkBonus(info({ ...BASE, monster: alvo('l') }))).toBe(0);
    expect(s.getWrathAtkBonus(info({ ...BASE, monster: alvo('s') }))).toBe(0);
  });

  it('alvo Médio com menos de 6.000 de HP não pode ser marcado Lunar', () => {
    expect(star('Wrath of Moon').getWrathAtkBonus(info({ ...BASE, monster: alvo('m', 5_999) }))).toBe(0);
    expect(star('Wrath of Moon').getWrathAtkBonus(info({ ...BASE, monster: alvo('m', 6_000) }))).toBe(SEM_FOR);
  });
});

describe('Fúria Solar — só alvo Pequeno, sem a FOR e sem HP mínimo', () => {
  it('contra Pequeno soma nível base + SOR + DES, sem FOR', () => {
    expect(star('Wrath of Sun').getWrathAtkBonus(info({ ...BASE, monster: alvo('s', 1) }))).toBe(SEM_FOR);
  });

  it('contra Médio e Grande não vale nada', () => {
    const s = star('Wrath of Sun');
    expect(s.getWrathAtkBonus(info({ ...BASE, monster: alvo('m') }))).toBe(0);
    expect(s.getWrathAtkBonus(info({ ...BASE, monster: alvo('l') }))).toBe(0);
  });
});

describe('Fúrias — as três ligadas ao mesmo tempo', () => {
  // Ligar as três é o caso normal de quem tem a Oposição no Nv.3: o alvo escolhe.
  const todas = () => star('Wrath of Sun', 'Wrath of Moon', 'Wrath of');

  it.each([
    { tamanho: 'Pequeno', size: 's', esperado: SEM_FOR },
    { tamanho: 'Médio', size: 'm', esperado: SEM_FOR },
    { tamanho: 'Grande', size: 'l', esperado: COM_FOR },
  ])('alvo $tamanho → $esperado', ({ size, esperado }) => {
    expect(todas().getWrathAtkBonus(info({ ...BASE, monster: alvo(size) }))).toBe(esperado);
  });

  it('nunca somam entre si — o alvo tem um alinhamento só', () => {
    const grande = todas().getWrathAtkBonus(info({ ...BASE, monster: alvo('l') }));
    expect(grande).toBe(COM_FOR);
    expect(grande).toBeLessThan(COM_FOR + SEM_FOR);
  });
});

describe('Fúrias — alvo jogador', () => {
  // "É possível alinhar outros personagens, sem restrição de tamanho e HP." O alvo de
  // PVP entra como id -1 e tamanho Médio (Calculator.setPlayerTarget).
  const jogador = alvo('m', 300_000, true);

  it('aceita qualquer alinhamento, inclusive o Estelar', () => {
    expect(star('Wrath of').getWrathAtkBonus(info({ ...BASE, monster: jogador }))).toBe(COM_FOR);
    expect(star('Wrath of Sun').getWrathAtkBonus(info({ ...BASE, monster: jogador }))).toBe(SEM_FOR);
  });
});
