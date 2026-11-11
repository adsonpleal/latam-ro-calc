/**
 * The spells [Memorizar] can store, and therefore the only ones [Lançar Magia] can fire.
 *
 * The client's own text is the whole rule. `Memorizar (Reading Spell Book)`:
 *
 *   Permite ler Grimórios e memorizar magias.
 *   Magias memorizadas são autoconjuradas quando usar [Lançar Magia] em nível 1.
 *   (...) É possível memorizar somente as magias de habilidades aprendidas pelo usuário.
 *
 * So a spell is memorizable exactly when the client ships a Grimório for it. The live
 * family is `WL_MB_*` (ids 100065-100074), ten books, each saying "Contém o feitiço de
 * [X] armazenado" — read from the LATAM item table on 11/11/2026. The older 6189-6205
 * Grimórios are deliberately left out: their own description says they "perderam todo o
 * seu poder e não têm mais função".
 *
 * Keyed by in-game skill id, because two catalog names share id 2213 (`Comet` and the
 * `Comet Amp` toggle) and the id is what the engine resolves a skill to anyway.
 *
 * Nothing above the Warlock is in here, which is the point: a fourth-class Magus skill
 * such as Espíritos Ancestrais (5220) has no Grimório, so [Lançar Magia] never casts it
 * and never takes its cast times or its recarga away — card yZwUijZVK81HxNrvkVrV.
 */
export const MEMORIZABLE_SKILL_IDS: ReadonlySet<number> = new Set([
  83, // Chuva de Meteoros (Meteor Storm) — Grimório 100067
  85, // Ira de Thor (Lord of Vermilion) — Grimório 100066
  89, // Nevasca (Storm Gust) — Grimório 100065
  2204, // Esquife de Gelo (Jack Frost) — Grimório 100069
  2210, // Drenar Vida (Drain Life) — Grimório 100068
  2211, // Meteoro Escarlate (Crimson Rock) — Grimório 100071
  2213, // Cometa (Comet) — Grimório 100073
  2214, // Corrente Elétrica (Chain Lightning) — Grimório 100072
  2216, // Abalo Sísmico (Earth Strain) — Grimório 100070
  2217, // Tetra Vortex — Grimório 100074
]);

/** Whether [Lançar Magia] can fire this skill, i.e. whether a Grimório exists for it. */
export const isMemorizableSkill = (skillId: number | string | undefined): boolean =>
  typeof skillId === 'number' && MEMORIZABLE_SKILL_IDS.has(skillId);
