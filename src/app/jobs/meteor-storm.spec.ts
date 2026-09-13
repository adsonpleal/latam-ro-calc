import { describe, expect, it } from 'vitest';
import { ElementType } from '../constants/element-type.const';
import { HighWizard } from './HighWizard';
import { SuperNovice } from './SuperNovice';
import { Warlock } from './Warlock';
import { AtkSkillModel } from './_character-base.abstract';

/**
 * "Chuva de Meteoros" on the Bruxo.
 *
 * Tracker card simulador-chuva-de-meteoros-do-bruxo-e-um-placeholder-escondido: the
 * HighWizard entry was `isDevMode: true` — filtered out of the Bruxo's skill list — and
 * carried a flat 125 with no hit count plus timings that did not match the client
 * (6,72 s variable, 5 s pós-conjuração, a fixed 7 s recarga). The Superaprendiz copy
 * written for 0.1.99-beta was already right. Both now share one definition, so the two
 * cannot drift, and the Arcano inherits it through HighWizard.
 */
const atk = (cls: any, name: string): AtkSkillModel | undefined =>
  (cls.atkSkills as AtkSkillModel[]).find((s) => s.name === name);

describe('Chuva de Meteoros', () => {
  it('is offered to the Bruxo, no longer a hidden placeholder', () => {
    const skill = atk(new HighWizard(), 'Meteor Storm');

    expect(skill, 'Meteor Storm missing from the Bruxo atkSkills').toBeDefined();
    expect(skill.isDevMode).toBeFalsy();
    expect(skill.value).toBe('Meteor Storm==10');
    expect(skill.isMatk).toBe(true);
    expect(skill.element).toBe(ElementType.Fire);
  });

  it('reaches the Arcano through inheritance', () => {
    expect(atk(new Warlock(), 'Meteor Storm')).toBeDefined();
  });

  it('is 125% per meteor with ceil(nível / 2) meteors on one target', () => {
    const skill = atk(new HighWizard(), 'Meteor Storm');

    expect(skill.formula({ skillLevel: 10 } as any)).toBe(125);
    const hits = (lv: number) => (skill.totalHit as any)({ skillLevel: lv });
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(hits)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    // No `hit` multiplier on top of the meteors: the placeholder doubled them.
    expect(skill.hit).toBeUndefined();
  });

  it('carries the client cast and delay row (skills.json id 83)', () => {
    const skill = atk(new HighWizard(), 'Meteor Storm');

    expect(skill.fct).toBe(1.5);
    expect(skill.vct).toBe(6.3);
    expect(skill.acd).toBe(1);
    const cd = (lv: number) => (skill.cd as any)(lv);
    expect([1, 5, 10].map(cd)).toEqual([2.5, 4.5, 7]);
  });

  it('offers every level, so a recording below the max can be simulated', () => {
    const skill = atk(new HighWizard(), 'Meteor Storm');

    expect(skill.levelList.map((l) => l.value)).toEqual(Array.from({ length: 10 }, (_, i) => `Meteor Storm==${i + 1}`));
  });

  it('is the very same definition on the Superaprendiz', () => {
    expect(atk(new SuperNovice(), 'Meteor Storm')).toBe(atk(new HighWizard(), 'Meteor Storm'));
  });
});
