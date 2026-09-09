import { describe, expect, it } from 'vitest';
import { CLASS_CTOR_BY_ID } from './_class-list';
import { ClassName } from './_class-name';

/**
 * Every playable class's ancestry, pinned against the game's own job tree.
 *
 * `classNameSet` is the whole of the item class gate: `usableClass: ["Bard"]` reaches a
 * character exactly when 'Bard' is in that set. So a wrong ancestor is not a cosmetic
 * slip — it hands the item to the wrong job and hides it from the right one, with nothing
 * failing anywhere.
 *
 * That is what happened to the Bard and Dancer lines, which were crossed: Minstrel
 * (Trovador) inherited from Dancer and Wanderer (Musa) from Bard, so the Trovador was
 * offered the Chicote Sobrenatural and denied the Violino Sobrenatural. Nothing caught it
 * because both classes are otherwise identical in shape — same skills (none), same
 * structure — and the 3rd/4th jobs override the job-bonus table, so only the gate moved.
 * Forty item records had been patched by hand to list the 3rd and 4th jobs explicitly,
 * which is the workaround this file makes unnecessary.
 *
 * The expected chains come from the client's own `jobs.json`, which names each job in
 * pt-BR alongside its engine constant — `19 Bardo JT_BARD` → `4020 Menestrel JT_BARD_H`
 * → `4068 Trovador JT_MINSTREL`. That is the authority here, not a wiki and not the
 * English names, which is why the pt-BR name is written next to every token below.
 */

/** classId -> the ancestry that class must carry, in job order, ending with itself. */
const LINEAGE: Record<number, ClassName[]> = {
  // Espadachim (JT_SWORDMAN)
  12: [ClassName.Swordman, ClassName.Knight, ClassName.LordKnight, ClassName.RuneKnight], // Cavaleiro Rúnico
  4252: [ClassName.Swordman, ClassName.Knight, ClassName.LordKnight, ClassName.RuneKnight, ClassName.DragonKnight], // Cavaleiro Draconiano
  11: [ClassName.Swordman, ClassName.Crusader, ClassName.Paladin, ClassName.RoyalGuard], // Guardião Real
  4258: [ClassName.Swordman, ClassName.Crusader, ClassName.Paladin, ClassName.RoyalGuard, ClassName.ImperialGuard], // Guardião Imperial

  // Mago (JT_MAGICIAN)
  6: [ClassName.Mage, ClassName.Wizard, ClassName.HighWizard, ClassName.Warlock], // Arcano
  4255: [ClassName.Mage, ClassName.Wizard, ClassName.HighWizard, ClassName.Warlock, ClassName.ArchMage], // Magus
  8: [ClassName.Mage, ClassName.Sage, ClassName.Scholar, ClassName.Sorcerer], // Feiticeiro
  4261: [ClassName.Mage, ClassName.Sage, ClassName.Scholar, ClassName.Sorcerer, ClassName.ElementalMaster], // Elementalista

  // Gatuno (JT_THIEF). Mercenário is JT_ASSASSIN, not the NPC mercenary.
  5: [ClassName.Thief, ClassName.Assassin, ClassName.AssassinCross, ClassName.GuillotineCross], // Sicário
  4254: [ClassName.Thief, ClassName.Assassin, ClassName.AssassinCross, ClassName.GuillotineCross, ClassName.ShadowCross], // Executor
  4: [ClassName.Thief, ClassName.Rogue, ClassName.Stalker, ClassName.ShadowChaser], // Renegado
  4260: [ClassName.Thief, ClassName.Rogue, ClassName.Stalker, ClassName.ShadowChaser, ClassName.AbyssChaser], // Mandraque

  // Mercador (JT_MERCHANT)
  10: [ClassName.Merchant, ClassName.Blacksmith, ClassName.Whitesmith, ClassName.Mechanic], // Mecânico
  4253: [ClassName.Merchant, ClassName.Blacksmith, ClassName.Whitesmith, ClassName.Mechanic, ClassName.Meister], // Engenheiro
  9: [ClassName.Merchant, ClassName.Alchemist, ClassName.Creator, ClassName.Genetic], // Bioquímico
  4259: [ClassName.Merchant, ClassName.Alchemist, ClassName.Creator, ClassName.Genetic, ClassName.Biolo], // Cientista

  // Noviço (JT_ACOLYTE) — the Acolyte, not the Aprendiz.
  7: [ClassName.Acolyte, ClassName.Priest, ClassName.HighPriest, ClassName.ArchBishop], // Arcebispo
  4256: [ClassName.Acolyte, ClassName.Priest, ClassName.HighPriest, ClassName.ArchBishop, ClassName.Cardinal], // Cardeal
  13: [ClassName.Acolyte, ClassName.Monk, ClassName.Champion, ClassName.Sura], // Shura
  4262: [ClassName.Acolyte, ClassName.Monk, ClassName.Champion, ClassName.Sura, ClassName.Inquisitor], // Inquisidor

  // Arqueiro (JT_ARCHER). Bardo -> Menestrel -> Trovador, Odalisca -> Cigana -> Musa.
  2: [ClassName.Archer, ClassName.Hunter, ClassName.Sniper, ClassName.Ranger], // Sentinela
  4257: [ClassName.Archer, ClassName.Hunter, ClassName.Sniper, ClassName.Ranger, ClassName.Windhawk], // Falcão do Vento
  21: [ClassName.Archer, ClassName.Bard, ClassName.Clown, ClassName.Minstrel], // Trovador
  4263: [ClassName.Archer, ClassName.Bard, ClassName.Clown, ClassName.Minstrel, ClassName.Troubadour], // Maestro
  22: [ClassName.Archer, ClassName.Dancer, ClassName.Gypsy, ClassName.Wanderer], // Musa
  4264: [ClassName.Archer, ClassName.Dancer, ClassName.Gypsy, ClassName.Wanderer, ClassName.Trouvere], // Diva

  // Expanded classes — no rebirth, so no transcendent step.
  33: [ClassName.Taekwondo, ClassName.StarGladiator, ClassName.StarEmperor], // Mestre Estelar
  4302: [ClassName.Taekwondo, ClassName.StarGladiator, ClassName.StarEmperor, ClassName.SkyEmperor], // Mestre Celestial
  3: [ClassName.Taekwondo, ClassName.SoulLinker, ClassName.SoulReaper], // Ceifador de Almas
  4303: [ClassName.Taekwondo, ClassName.SoulLinker, ClassName.SoulReaper, ClassName.SoulAscetic], // Asceta das Almas
  18: [ClassName.Ninja, ClassName.Kagerou], // Kagerou
  4304: [ClassName.Ninja, ClassName.Kagerou, ClassName.Shinkiro], // Shinkiro
  17: [ClassName.Ninja, ClassName.Oboro], // Oboro
  4305: [ClassName.Ninja, ClassName.Oboro, ClassName.Shiranui], // Shiranui
  1: [ClassName.Gunslinger, ClassName.Rebellion], // Insurgente — Justiceiro is JT_GUNSLINGER
  4306: [ClassName.Gunslinger, ClassName.Rebellion, ClassName.NightWatch], // Guerrilheiro
  30: [ClassName.Novice, ClassName.SuperNovice], // Superaprendiz — Aprendiz is JT_NOVICE
  4307: [ClassName.Novice, ClassName.SuperNovice, ClassName.HyperNovice], // Hiperaprendiz
  31: [ClassName.Doram], // Invocador
  4308: [ClassName.Doram, ClassName.SpiritHandler], // Animista
};

/** Markers, not jobs: they ride along in the set and are checked separately. */
const MARKERS: string[] = [ClassName.ALL, ClassName.HiClass, ClassName.Only_3rd, ClassName.Only_4th];

const lineageOf = (id: string | number) => {
  const instance: any = new (CLASS_CTOR_BY_ID as any)[id]();
  return [...instance.classNameSet].filter((n: string) => !MARKERS.includes(n));
};

describe('class lineage', () => {
  it('covers every playable class', () => {
    const playable = Object.keys(CLASS_CTOR_BY_ID).map(Number).sort((a, b) => a - b);
    const pinned = Object.keys(LINEAGE).map(Number).sort((a, b) => a - b);

    expect(pinned).toEqual(playable);
  });

  it.each(Object.entries(LINEAGE))('builds the job tree of class %s', (id, expected) => {
    expect(lineageOf(id)).toEqual(expected);
  });

  it('keeps the Bard and Dancer lines apart', () => {
    // The regression that prompted this file. Stated as its consequence — which line each
    // token reaches — because that is what an item's `usableClass` actually asks.
    const reaches = (token: ClassName) =>
      Object.keys(LINEAGE)
        .filter((id) => lineageOf(id).includes(token))
        .map(Number)
        .sort((a, b) => a - b);

    expect(reaches(ClassName.Bard)).toEqual([21, 4263]); // Trovador, Maestro
    expect(reaches(ClassName.Clown)).toEqual([21, 4263]);
    expect(reaches(ClassName.Dancer)).toEqual([22, 4264]); // Musa, Diva
    expect(reaches(ClassName.Gypsy)).toEqual([22, 4264]);
  });

  it('lets a base-job token reach the whole line below it', () => {
    // What "Mercenários e evoluções" -> ["Assassin"] relies on.
    const reaches = (token: ClassName) => Object.keys(LINEAGE).filter((id) => lineageOf(id).includes(token)).length;

    expect(reaches(ClassName.Assassin)).toBe(2); // Sicário + Executor
    expect(reaches(ClassName.Thief)).toBe(4); // …plus Renegado + Mandraque
    expect(reaches(ClassName.Acolyte)).toBe(4); // Arcebispo, Cardeal, Shura, Inquisidor
    expect(reaches(ClassName.Priest)).toBe(2); // Arcebispo, Cardeal — never the Monk side
  });
});
