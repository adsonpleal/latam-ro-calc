import { MonsterModel } from '../models/monster.model';

/** HP by difficulty reported by Ynk. Difficulty is independent of Aliviar. */
export const BETELGEUSE_HP_OPTIONS = [
  { label: 'Selado — 500 M', value: 500_000_000 },
  { label: 'Nível 1 — 800 M', value: 800_000_000 },
  { label: 'Nível 2 — 1,1 B', value: 1_100_000_000 },
  { label: 'Nível 3 — 1,4 B', value: 1_400_000_000 },
  { label: 'Nível 4 — 1,7 B', value: 1_700_000_000 },
  { label: 'Nível 5 — 2 B', value: 2_000_000_000 },
];

export function normalizeBetelgeuseHp(value: number): number {
  return BETELGEUSE_HP_OPTIONS.some(option => option.value === value) ? value : 2_000_000_000;
}

export function withBetelgeuseHp(monster: MonsterModel, hp: number): MonsterModel {
  return monster?.id === 20994
    ? { ...monster, stats: { ...monster.stats, health: normalizeBetelgeuseHp(hp) } }
    : monster;
}
