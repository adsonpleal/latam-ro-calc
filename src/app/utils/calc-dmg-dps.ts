import { floor } from './floor';

export interface DmgDpsBreakdown {
  avgBasicDamage: number;
  limitedCriRate: number;
  limitedAccuracy: number;
  criHit: number;
  nonCriHit: number;
  totalDamage: number;
  oneHitDps: number;
}

/** Same formula as calcDmgDps(), but also surfaces the intermediate values —
 *  used by the "step by step" DPS breakdown popover so it can never drift
 *  from the actual engine math. */
export const calcDmgDpsDetailed = (params: { min: number; max: number; cri: number; criDmg: number; hitsPerSec: number; accRate: number }): DmgDpsBreakdown => {
  const { min, max, cri, criDmg, hitsPerSec, accRate } = params;
  const avgBasicDamage = floor((min + max) / 2);
  const limitedCriRate = Math.min(cri, 100);
  const limitedAccuracy = Math.min(accRate, 100);
  const criHit = criDmg * limitedCriRate;
  const nonCriHit = (100 - limitedCriRate) * avgBasicDamage * (1 - (100 - limitedAccuracy) / 100);
  const totalDamage = floor((nonCriHit + criHit) / 100);
  const oneHitDps = floor(hitsPerSec * totalDamage);

  return { avgBasicDamage, limitedCriRate, limitedAccuracy, criHit, nonCriHit, totalDamage, oneHitDps };
};

export const calcDmgDps = (params: {
  min: number;
  max: number;
  cri: number;
  criDmg: number;
  hitsPerSec: number;
  accRate: number;
}) => {
  return calcDmgDpsDetailed(params).oneHitDps;
};
