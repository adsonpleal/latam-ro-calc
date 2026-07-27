/**
 * Class lookup for the server: id → a *fresh* CharacterBase, plus the LATAM release
 * gate the website applies to its class picker.
 */
import { CharacterBase } from 'src/app/jobs/_character-base.abstract';
import { CLASS_CTOR_BY_ID } from 'src/app/jobs/_class-list';
import { ClassID, ClassIcon, ClassNamePtBr } from 'src/app/jobs/_class-name';
import { HIDDEN_CLASS_IDS } from 'src/app/jobs/hidden-classes';

export interface ClassInfo {
  /** The calculator's internal class id — what a build's `class` field holds. */
  id: number;
  /** pt-BR display name, falling back to the English one. */
  name: string;
  /** Sprite/job id; also the key the LATAM release gate is keyed on. */
  icon: number;
  minLevel: number;
  maxLevel: number;
  maxJobLevel: number;
  /** 4th classes allocate trait stats (POD/STA/SAB/FEI/CON/CRV); earlier ones don't. */
  traitStats: boolean;
}

export class ClassRegistry {
  private readonly info = new Map<number, ClassInfo>();

  /**
   * @param latamClassIcons contents of `latam-classes.json` — the job icon ids whose
   *        sprite ships in the LATAM client. Classes absent from it are unreleased and
   *        hidden, matching `ro-calculator.component.ts`'s picker filter.
   */
  constructor(latamClassIcons: number[]) {
    const released = new Set(latamClassIcons);
    for (const [idStr, Ctor] of Object.entries(CLASS_CTOR_BY_ID)) {
      const id = Number(idStr);
      const icon = ClassIcon[id];
      if (!released.has(icon) || HIDDEN_CLASS_IDS.has(icon)) continue;

      const char = new Ctor();
      const { minMaxLevel, maxJob } = char.minMaxLevelCap;
      this.info.set(id, {
        id,
        name: ClassNamePtBr[id] ?? ClassID[id],
        icon,
        minLevel: minMaxLevel[0],
        maxLevel: minMaxLevel[1],
        maxJobLevel: maxJob,
        traitStats: char.isAllowTraitStat(),
      });
    }
  }

  /** Whether this class is playable on LATAM (and therefore usable in a build). */
  has(classId: number): boolean {
    return this.info.has(classId);
  }

  get(classId: number): ClassInfo | undefined {
    return this.info.get(classId);
  }

  list(): ClassInfo[] {
    return [...this.info.values()];
  }

  /**
   * A brand-new instance. Never share one: `setLearnSkills()` and
   * `getSkillBonusAndName()` mutate the instance, so a shared one would leak skill
   * state between concurrent calculations.
   */
  newInstance(classId: number): CharacterBase {
    const Ctor = CLASS_CTOR_BY_ID[classId];
    if (!Ctor || !this.info.has(classId)) {
      throw new Error(`Classe ${classId} não existe ou não está disponível no LATAM.`);
    }
    return new Ctor();
  }
}
