/**
 * No class may be offered the same buff twice across the skill panel's three sections.
 *
 * Card v8ColE3Z8QamyuHAmWTM arrived as "Falta Concentração nos Músicos" and Adson rewrote
 * the job on it: "na verdade aparece, mas na sessão buffs. Precisamos refatorar isso. Buffs
 * da classe devem aparece em Habilidades e efeitos ativos. E não devem ficar duplicadas em
 * Buffs. Um outro exemplo é o Poema de Bragi, ele aparece no maestro duplicado."
 *
 * The cause is structural rather than specific to those two: the view model builds the
 * class's `activeSkills` and the shared `JobBuffs` independently and filters neither against
 * the other, so every name declared on both sides renders a second selectable control — in
 * "Buffs" when the row is a buff, at the other end of "Debuffs no monstro" when it carries
 * `isDebuff` (card ILA1aEHJlA3co9iD6zEQ, the Cometa half of the same bug). So the guard
 * below walks every class and every row, not the names the cards happen to mention.
 *
 * A collision has one honest fix, which is what `supersededBuffNames` does: the class row is
 * the survivor — it is what the engine honours when both are selected, and the only one
 * `isSkillActive()` gates can see — and the shared row drops out for that class. A new
 * shared buff that collides with a class fails here with the class and the buff named.
 *
 * Out of scope on purpose: "Aprender para bônus" (`passiveSkills`). Those rows ask which
 * level the character *learned*, which the engine reads whether or not the buff is up, so
 * they are a second question rather than a second copy of the same control — every one of
 * them carries no `bonus` at all and feeds `learnedSkillMap`, never `activeSkillNames`. Ten
 * names sit on both sides there today (Clementia, Expiatio, Impositio Manus, Striking, Dance
 * With Wug, Frigg's Song, Lerad's Dew, plus Laudaagnus, Mystical Amplification and Power
 * Thrust, which also have a class buff row) and this change leaves every one of them alone.
 */
import { describe, expect, it } from 'vitest';
import { JobBuffs } from '../constants/job-buffs';
import { CLASS_CTOR_BY_ID } from '../jobs/_class-list';
import { CharacterBase } from '../jobs/_character-base.abstract';
import { resolveSkillMeta } from '../skills';
import { supersededBuffNames } from './calculator-controller';

/**
 * The pairs that keep both controls, with what the two rows disagree about.
 *
 * `supersededBuffNames` hides a shared row only when the class row can grant everything it
 * could, and for these six it cannot: dropping the shared row would take a reachable option
 * away from the player instead of de-duplicating it. Reconciling them is a data question
 * that needs a source for which of the two numbers is the live one, so they are listed here
 * rather than resolved — and listed by name, so a seventh pair fails the first test below
 * instead of quietly joining them.
 */
const DIVERGENT_PAIRS: Record<string, string> = {
  // Shared: hit +20 / skillAspd +5 for any weapon. Class: the same, but only on axes and
  // maces, and with aspdPercent +10 on top.
  'Adrenaline Rush': 'the class row is weapon-gated and grants more',
  // Shared: "Ativo" and "Limpar EDP" (magnumBreakClearEDP). The class row has no EDP mode.
  'Magnum Break': 'only the shared row offers Limpar EDP',
  // Shared: Nv 5 (mysticAmp 25) and Nv 10 (50). Each class that casts it offers one level —
  // Nv 10 on the Bruxo line, Nv 5 on the Algoz line.
  'Mystical Amplification': 'each class row offers one of the two shared levels',
  // Shared: flatDmg 15. Class: flatDmg 25, for the same Nv 5.
  'Power Thrust': 'the two rows disagree on the number',
  // Shared: atk + movementSpeed, with a "Domínio 10" variant per level. Class: x_atk only.
  'Rush To Windmill': 'the two rows model different bonuses',
  // Shared: `venomImpression`. Class: `vi`. Two keys for one debuff, unified nowhere.
  'Venom Impression': 'the two rows write different bonus keys',
};

type PanelSkill = { name: string; label: string; isDebuff?: boolean; preview?: boolean; dropdown: any[] };
type Row = { section: string; source: 'class' | 'shared'; name: string; label: string };

/**
 * The label the panel prints, which is not the same on both sides: a shared buff keeps its
 * own curated (already pt-BR) label, a class row takes the client's pt-BR skill name. This
 * is `localize` in calculator-session.ts, reproduced here for the same reason
 * `atk-skill-picker-label.spec.ts` reproduces the rotation picker's labelling.
 */
const panelLabel = (skill: PanelSkill, isShared: boolean): string => {
  if (isShared) return skill.label;
  const meta = resolveSkillMeta(skill.name);

  return meta?.id === undefined ? skill.label : meta.label ?? skill.name;
};

/** Every control the three sections offer this class, in render order. */
const panelRows = (cls: CharacterBase, showPreviews = false): Row[] => {
  const activeSkills = cls.activeSkills as PanelSkill[];
  const superseded = supersededBuffNames(JobBuffs, activeSkills);
  const visible = (skill: PanelSkill) => showPreviews || !skill.preview;
  const sharedRow = (buff: PanelSkill) => visible(buff) && !superseded.has(buff.name);
  const row = (section: string, isShared: boolean) => (skill: PanelSkill): Row =>
    ({ section, source: isShared ? 'shared' : 'class', name: skill.name, label: panelLabel(skill, isShared) });

  return [
    ...activeSkills.filter((skill) => !skill.isDebuff && visible(skill)).map(row('Habilidades e efeitos ativos', false)),
    ...(JobBuffs as PanelSkill[]).filter((buff) => !buff.isDebuff && sharedRow(buff)).map(row('Buffs', true)),
    ...(JobBuffs as PanelSkill[]).filter((buff) => buff.isDebuff && sharedRow(buff)).map(row('Debuffs no monstro', true)),
    ...activeSkills.filter((skill) => skill.isDebuff && visible(skill)).map(row('Debuffs no monstro', false)),
  ];
};

const repeated = (rows: Row[], key: (row: Row) => string, keep: (hits: Row[]) => boolean = () => true): string[] => {
  const seen = new Map<string, Row[]>();
  for (const row of rows) {
    const value = key(row);
    const bucket = seen.get(value);
    if (bucket) bucket.push(row); else seen.set(value, [row]);
  }

  return [...seen].filter(([, hits]) => hits.length > 1 && keep(hits))
    .map(([value, hits]) => `"${value}" in ${hits.map((hit) => `${hit.section} (${hit.source}: ${hit.name})`).join(' + ')}`);
};

/**
 * Two rows of the same catalog that happen to print the same label are a different defect,
 * with a different cause: `localize` replaces a class row's curated label with the client's
 * skill name, so two rows pointing at one skill id lose the wording the class file wrote for
 * them. Two of those exist today — the Algoz's "Aplicar Toxina" (its level) and "Toxina
 * aplicada" (which toxin), both skill 2027, and the Mestre Elemental's two "Espírito
 * Elemental" rows — and neither is a buff offered twice, which is what this card is about.
 */
const acrossCatalogs = (hits: Row[]) => new Set(hits.map((hit) => hit.source)).size > 1;

/** A repeat the DIVERGENT_PAIRS table above accounts for. */
const expected = (hits: Row[]) => hits.every((hit) => hit.name in DIVERGENT_PAIRS);

describe('the buff sections of the skill panel', () => {
  it('leaves both rows up for exactly the pairs whose numbers disagree', () => {
    const diverging = new Set<string>();
    for (const Ctor of Object.values(CLASS_CTOR_BY_ID)) {
      const cls = new Ctor() as CharacterBase;
      const superseded = supersededBuffNames(JobBuffs, cls.activeSkills);
      const casts = new Set(cls.activeSkills.map((skill) => skill.name));
      for (const buff of JobBuffs) {
        if (casts.has(buff.name) && !superseded.has(buff.name)) diverging.add(buff.name);
      }
    }

    expect([...diverging].sort()).toEqual(Object.keys(DIVERGENT_PAIRS).sort());
  });

  for (const [classId, Ctor] of Object.entries(CLASS_CTOR_BY_ID)) {
    const cls = new Ctor() as CharacterBase;

    it(`offers no buff twice — ${cls.constructor.name}`, () => {
      expect(repeated(panelRows(cls), (row) => row.name, (hits) => !expected(hits)), `class ${classId}`).toEqual([]);
    });

    // What the cards describe: two rows reading "Concentrar", or "Poema de Bragi 10" under
    // the Maestro's own skills and again under "Buffs".
    it(`shows no label twice either — ${cls.constructor.name}`, () => {
      const offending = (hits: Row[]) => acrossCatalogs(hits) && !expected(hits);

      expect(repeated(panelRows(cls), (row) => row.label, offending), `class ${classId}`).toEqual([]);
    });

    it(`keeps them apart with the previews shown too — ${cls.constructor.name}`, () => {
      expect(repeated(panelRows(cls, true), (row) => row.name, (hits) => !expected(hits)), `class ${classId}`).toEqual([]);
    });
  }
});
