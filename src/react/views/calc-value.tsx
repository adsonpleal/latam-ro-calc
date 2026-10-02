import { createElement } from 'react';
import { floor } from '../../app/utils/floor';
import { formatNumber } from '../../app/utils/format-number';
import { Icon } from '../ui/primitives';

export interface CalcValueProps {
  label: string; styleClass?: string; unit?: string; min?: number; max: number;
  totalHit?: number; totalHit2?: number; showPercentDiff?: boolean; enableCompare?: boolean;
  isGreaterIsBetter?: boolean; styleClass2?: string; min2?: number; max2?: number;
  raw?: number; displayRaw?: boolean;
}
export function CalcValue({ label, styleClass = '', unit = '', min, max, totalHit = 0, totalHit2 = 0,
  showPercentDiff = false, enableCompare = false, isGreaterIsBetter = true, styleClass2 = '',
  min2, max2, raw = 0, displayRaw = false }: CalcValueProps) {
  const comparing = enableCompare && max2 != null && max !== max2;
  const comparedClass = comparing ? ((max2! > max) === isGreaterIsBetter ? 'compare_greater' : 'compare_lower') : styleClass2;
  const percentage = (((totalHit2 || 1) * ((min2 || 0) + (max2 || 0)) / 2 -
    (totalHit || 1) * ((min || 0) + (max || 0)) / 2) * 100) /
    ((totalHit || 1) * ((min || 0) + (max || 0)) / 2);
  const difference = comparing && showPercentDiff ? `(${percentage > 0 ? '+' : ''}${formatNumber(floor(percentage, 1), 0, 1)} %)` : '';
  const range = (low: number | undefined, high: number | undefined) =>
    `${low != null && low !== high ? `${formatNumber(low || 0, 0, 5)} - ` : ''}${formatNumber(high || 0, 0, 5)}`;
  return createElement('app-calc-value', null, <div className="grid grid-nogutter"><div className="col-12">
    {label}{totalHit > 1 && <span><span className={`text-lg font-medium px-1 ${styleClass}`} style={{ color: 'var(--pink-300)' }}>{totalHit}</span><span>x</span></span>}
    {displayRaw && raw > 0 && <span><span className="text-lg px-1 summary_compare">{formatNumber(raw)}</span>-&gt;</span>}
    <span className={`text-lg font-medium px-1 ${styleClass}`}>{range(min, max)}{comparing ? '' : unit}</span>
    <span hidden={!comparing}><Icon className="vs_sign px-1" name="arrow-right" />
      {totalHit2 > 1 && <span><span className={`text-lg font-medium px-1 ${comparedClass}`}>{totalHit2}</span><span>x</span></span>}
      <span className={`text-lg font-medium px-1 ${comparedClass}`}>{range(min2, max2)}{unit}</span>
      <span hidden={!difference} className={`text-lg font-medium px-1 ${comparedClass}`}>{difference}</span>
    </span>
  </div></div>);
}
