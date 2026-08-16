import { describe, expect, it } from 'vitest';
import { simulateRotation } from '../../../../../core/rotation-schedule';
import { buildTimelineChart, buildTimelineCharts, MIN_LABEL_PERCENT } from './rotation-timeline.logic';

const cycleOf = (steps: { key: string; cast?: number; acd?: number; cd?: number }[], aspdPeriod = 0) =>
  simulateRotation({
    steps: steps.map((s) => ({ key: s.key, cast: s.cast ?? 0, acd: s.acd ?? 0, cd: s.cd ?? 0, damage: 100 })),
    aspdPeriod,
  });

const entriesOf = (n: number, fixed = 0, cast = 0) =>
  Array.from({ length: n }, (_, i) => ({ name: `S${i}`, icon: i, isBasic: false, cast, fixed }));

describe('buildTimelineChart', () => {
  it('splits the cast into fixa and variável', () => {
    const cycle = cycleOf([{ key: 'A', cast: 0.52, acd: 0.5, cd: 1.0 }]);
    const [lane] = buildTimelineChart({
      cycle,
      entries: [{ name: 'A', isBasic: false, cast: 0.52, fixed: 0.12 }],
      scale: cycle.cycleDuration,
    }).lanes;

    const fixa = lane.blocks.find((b) => b.kind === 'fixa')!;
    const variavel = lane.blocks.find((b) => b.kind === 'variavel')!;

    expect(fixa.seconds).toBeCloseTo(0.12, 5);
    expect(variavel.seconds).toBeCloseTo(0.4, 5);
    expect(fixa.leftPercent).toBeCloseTo(0, 5);
    expect(variavel.leftPercent).toBeCloseTo(fixa.widthPercent, 5);
  });

  it('draws no block for a zero-length component', () => {
    // A skill with no cast at all: widths must stay proportional to real time.
    const cycle = cycleOf([{ key: 'A', acd: 0.5, cd: 0.7 }]);
    const [lane] = buildTimelineChart({
      cycle,
      entries: [{ name: 'A', isBasic: false, cast: 0, fixed: 0 }],
      scale: cycle.cycleDuration,
    }).lanes;

    expect(lane.blocks.some((b) => b.kind === 'fixa')).toBe(false);
    expect(lane.blocks.some((b) => b.kind === 'variavel')).toBe(false);
    expect(lane.blocks.map((b) => b.kind)).toEqual(['pos', 'recarga']);
  });

  it('starts pós and recarga together at the end of the cast', () => {
    const cycle = cycleOf([{ key: 'A', cast: 0.4, acd: 0.5, cd: 1.0 }]);
    const [lane] = buildTimelineChart({
      cycle,
      entries: [{ name: 'A', isBasic: false, cast: 0.4, fixed: 0 }],
      scale: cycle.cycleDuration,
    }).lanes;

    const pos = lane.blocks.find((b) => b.kind === 'pos')!;
    const recarga = lane.blocks.find((b) => b.kind === 'recarga')!;

    expect(pos.leftPercent).toBeCloseTo(recarga.leftPercent, 5);
    expect(recarga.widthPercent).toBeGreaterThan(pos.widthPercent);
  });

  it('draws the VelAtq wait immediately before the step it held back', () => {
    const cycle = cycleOf([{ key: 'A', acd: 0.3, cd: 0.3 }, { key: 'B', acd: 0.3, cd: 0.3 }], 0.42);
    const chart = buildTimelineChart({ cycle, entries: entriesOf(2), scale: cycle.cycleDuration });

    // B is the one that waits: A's pós ends at 0,30 but the 0,42 floor holds B to 0,42.
    const hatch = chart.lanes[1].blocks.find((b) => b.kind === 'aspd')!;
    const bCast = chart.lanes[1].blocks.find((b) => b.kind === 'pos')!;

    expect(hatch.seconds).toBeCloseTo(0.12, 5);
    expect(hatch.leftPercent + hatch.widthPercent).toBeCloseTo(bCast.leftPercent, 5);
  });

  it('wraps the first lane wait to the end of the window', () => {
    // The wait in front of step 1 happened in the previous pass — the same instant
    // modulo the cycle, so it is drawn at the right-hand end rather than off the left.
    const cycle = cycleOf([{ key: 'A', acd: 0.3, cd: 0.3 }, { key: 'B', acd: 0.3, cd: 0.3 }], 0.42);
    const chart = buildTimelineChart({ cycle, entries: entriesOf(2), scale: cycle.cycleDuration });
    const hatch = chart.lanes[0].blocks.find((b) => b.kind === 'aspd')!;

    expect(cycle.lanes[0].aspdWait).toBeCloseTo(0.12, 5);
    expect(hatch.leftPercent + hatch.widthPercent).toBeCloseTo(100, 5);
  });

  it('gives the lane to pós or recarga when the other is zero', () => {
    // Recarga 0 -> pós has the lane to itself.
    const noRecarga = cycleOf([{ key: 'A', acd: 0.5, cd: 0 }, { key: 'B', acd: 0.3 }]);
    const posOnly = buildTimelineChart({ cycle: noRecarga, entries: entriesOf(2), scale: noRecarga.cycleDuration })
      .lanes[0].blocks.find((b) => b.kind === 'pos')!;
    expect(posOnly.isFullHeight).toBe(true);

    // Pós 0 -> the recarga does (Tempestade de Flechas' shape).
    const noPos = cycleOf([{ key: 'A', acd: 0, cd: 3.2 }, { key: 'B', acd: 0.22 }]);
    const recOnly = buildTimelineChart({ cycle: noPos, entries: entriesOf(2), scale: noPos.cycleDuration })
      .lanes[0].blocks.find((b) => b.kind === 'recarga')!;
    expect(recOnly.isFullHeight).toBe(true);
  });

  it('keeps both as stripes when both exist', () => {
    const cycle = cycleOf([{ key: 'A', acd: 0.5, cd: 1.0 }]);
    const blocks = buildTimelineChart({ cycle, entries: entriesOf(1), scale: cycle.cycleDuration }).lanes[0].blocks;

    expect(blocks.find((b) => b.kind === 'pos')!.isFullHeight).toBe(false);
    expect(blocks.find((b) => b.kind === 'recarga')!.isFullHeight).toBe(false);
  });

  it('drops the label on a block too narrow to letter', () => {
    // One very long lane makes the others a sliver of the scale.
    const cycle = cycleOf([{ key: 'A', acd: 0.02, cd: 0.02 }, { key: 'B', acd: 4, cd: 4 }]);
    const chart = buildTimelineChart({ cycle, entries: entriesOf(2), scale: cycle.cycleDuration });
    const sliver = chart.lanes[0].blocks.find((b) => b.kind === 'pos')!;

    expect(sliver.widthPercent).toBeLessThan(MIN_LABEL_PERCENT);
    expect(sliver.label).toBe('');
    expect(sliver.tooltip).toContain('0,02s'); // still reachable on hover
  });

  it('marks the lane whose own recarga held the rotation up', () => {
    const cycle = cycleOf([{ key: 'A', acd: 0.3, cd: 2.0 }, { key: 'B', acd: 0.3 }]);
    const chart = buildTimelineChart({ cycle, entries: entriesOf(2), scale: cycle.cycleDuration });

    expect(chart.lanes[0].invalid).toBe(true);
    expect(chart.lanes[0].missingSeconds).toBeGreaterThan(0);
    expect(chart.lanes[1].invalid).toBe(false);
  });

  it('drops a whole-second tick that would overprint the cycle-end marker', () => {
    // A 4,02s cycle puts the "4s" tick within a hair of the "4,02s" marker.
    const cycle = cycleOf([{ key: 'A', acd: 2.01, cd: 2.01 }, { key: 'B', acd: 2.01, cd: 2.01 }]);
    const chart = buildTimelineChart({ cycle, entries: entriesOf(2), scale: cycle.cycleDuration });

    expect(cycle.cycleDuration).toBeCloseTo(4.02, 5);
    expect(chart.ticks.map((t) => t.label)).toEqual(['0s', '1s', '2s', '3s', '4,02s']);
  });

  it('anchors the outermost labels by their own edge', () => {
    // Centring a label on 0% or 100% hangs half of it off the chart.
    const cycle = cycleOf([{ key: 'A', acd: 1.2, cd: 1.2 }, { key: 'B', acd: 1.2, cd: 1.2 }]);
    const { ticks } = buildTimelineChart({ cycle, entries: entriesOf(2), scale: cycle.cycleDuration });

    expect(ticks[0].label).toBe('0s');
    expect(ticks[0].anchor).toBe('start');
    expect(ticks.find((t) => t.isCycleEnd)!.anchor).toBe('end');
    expect(ticks.find((t) => t.label === '1s')!.anchor).toBe('middle');
  });

  it('ticks whole seconds plus the cycle end', () => {
    const cycle = cycleOf([{ key: 'A', acd: 1.2, cd: 1.2 }, { key: 'B', acd: 1.2, cd: 1.2 }]);
    const chart = buildTimelineChart({ cycle, entries: entriesOf(2), scale: cycle.cycleDuration });

    expect(chart.ticks.filter((t) => !t.isCycleEnd).map((t) => t.label)).toEqual(['0s', '1s', '2s']);
    const end = chart.ticks.find((t) => t.isCycleEnd)!;
    expect(end.leftPercent).toBeCloseTo(100, 5);
    expect(end.label).toBe('2,40s');
  });
});

describe('buildTimelineCharts', () => {
  const current = { cycle: cycleOf([{ key: 'A', acd: 0.5, cd: 0.5 }]), entries: entriesOf(1) };
  const compare = { cycle: cycleOf([{ key: 'A', acd: 0.3, cd: 0.3 }]), entries: entriesOf(1) };

  it('renders one chart when not comparing', () => {
    const charts = buildTimelineCharts({ current });

    expect(charts).toHaveLength(1);
    expect(charts[0].ticks.find((t) => t.isCycleEnd)?.leftPercent).toBeCloseTo(100, 5);
  });

  it('renders two complete charts on one shared scale', () => {
    const charts = buildTimelineCharts({ current, compare });

    expect(charts).toHaveLength(2);
    expect(charts[0].title).toContain('Atual');
    expect(charts[1].title).toContain('Comparação');
    expect(charts[1].isCompare).toBe(true);

    // Shared denominator: the shorter cycle ends before the full width.
    const currentEnd = charts[0].ticks.find((t) => t.isCycleEnd)!;
    const compareEnd = charts[1].ticks.find((t) => t.isCycleEnd)!;
    expect(currentEnd.leftPercent).toBeCloseTo(100, 5);
    expect(compareEnd.leftPercent).toBeCloseTo(60, 5); // 0,3 of 0,5

    // Only the one that reaches the right-hand edge anchors there; the shorter cycle's
    // marker sits mid-axis and stays centred on its own instant.
    expect(currentEnd.anchor).toBe('end');
    expect(compareEnd.anchor).toBe('middle');
  });
});
