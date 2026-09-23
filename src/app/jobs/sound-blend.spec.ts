import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CalculatorController } from '../core/calculator-controller';
import { Calculator } from '../core/calculator';
import { ElementType } from '../constants';
import { MysticSymphonyFn } from '../constants/share-passive-skills/mystic-symphony-fn';
import { createMainModel } from '../utils';
import { SOUND_BLEND } from '../skills/shared-skills';
import { Troubadour } from './Troubadour';
import { Trouvere } from './Trouvere';

// Card: simulador-arranjo-musical-diva-e-maestro-nao-esta-na-lista-de-habilida.
// Client skill 5357 gives 120% per level, base-level/SPL scaling, and arrow element.
// The class's second-version reference supplies the SPL coefficient and no cooldown:
// https://sigmathefallen.blogspot.com/2024/06/troubadour-trouvere-2nd-version.html
const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSp = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

function run(Class: typeof Troubadour | typeof Trouvere, ammo: number, symphony: boolean) {
  const cls = new Class();
  const activeSkillIds = cls.activeSkills.map((s) => s.name === 'Mystic Symphony' && symphony ? 1 : 0);
  const passiveSkillIds = cls.passiveSkills.map(() => 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds, passiveSkillIds }).getSkillBonusAndName();
  const model = createMainModel();
  model.level = 250;
  model.weapon = Class === Troubadour ? 570028 : 580028;
  model.ammo = ammo;
  model.selectedAtkSkill = 'Sound Blend==5';
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSp).setClass(cls);
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: monsters[21077], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined, extraOptionScripts: [],
    activeSkillNames, learnedSkillMap, selectedAtkSkill: 'Sound Blend==5',
    selectedChances: [], usedHpL: false,
  } as any);
  return (calc as any).damageSummary;
}

describe('Arranjo Musical', () => {
  it('is available to both classes with the client level table and magic type', () => {
    for (const Class of [Troubadour, Trouvere]) {
      const skill = new Class().atkSkills.find((s) => s.name === 'Sound Blend');
      expect(skill).toBe(SOUND_BLEND);
      expect(skill?.isMatk).toBe(true);
      for (let level = 1; level <= 5; level++) {
        expect(skill?.formula({ model: { level: 100 }, skillLevel: level, status: { totalSpl: 0 } } as any)).toBe(level * 120);
      }
      expect(skill?.formula({ model: { level: 250 }, skillLevel: 5, status: { totalSpl: 100 } } as any)).toBe(2125);
    }
  });

  it('requires a whip or instrument and an equipped arrow', () => {
    expect(SOUND_BLEND.verifyItemFn?.({ weapon: { isType: () => true }, model: { ammo: 1752 } } as any)).toBe('');
    expect(SOUND_BLEND.verifyItemFn?.({ weapon: { isType: () => true }, model: { ammo: 0 } } as any)).toBe('Flecha');
    expect(SOUND_BLEND.verifyItemFn?.({ weapon: { isType: () => false }, model: { ammo: 1752 } } as any)).toContain('instrument');
  });

  it('uses the equipped arrow element in the magic pipeline', () => {
    for (const Class of [Troubadour, Trouvere]) {
      expect(run(Class, 1752, false).skillPropertyAtk).toBe(ElementType.Fire);
      expect(run(Class, 1754, false).skillPropertyAtk).toBe(ElementType.Water);
    }
  });

  it('receives the existing +100% Sinfonia Mística skill bonus', () => {
    expect(MysticSymphonyFn().dropdown[0].bonus[5357]).toBe(100);
    const off = run(Trouvere, 1752, false);
    const on = run(Trouvere, 1752, true);
    expect(on.skillMaxDamage).toBeGreaterThan(off.skillMaxDamage);
  });
});
