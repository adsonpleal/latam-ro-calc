export const profiles = [
  ['desktop-wide', 'desktop', 1920, 918, false],
  ['desktop', 'desktop', 1600, 900, false],
  ['desktop-compact', 'desktop', 1536, 864, false],
  ['tablet-portrait', 'tablet', 768, 1024, true],
  ['tablet-large', 'tablet', 820, 1180, true],
  ['tablet-landscape', 'tablet', 1024, 768, true],
  ['tablet-wide', 'tablet', 1280, 800, true],
  ['tablet-compact-screen', 'tablet', 1440, 900, true],
  ['tablet-wide-pointer', 'tablet', 1280, 800, false],
  ['tablet-compact-screen-pointer', 'tablet', 1440, 900, false],
  ['mobile-small', 'mobile', 320, 568, true],
  ['mobile', 'mobile', 360, 800, true],
  ['mobile-iphone', 'mobile', 390, 844, true],
  ['mobile-large', 'mobile', 430, 932, true],
  ['mobile-landscape', 'mobile', 844, 390, true],
  ['desktop-touch', 'desktop', 1920, 918, true],
].map(([id, family, width, height, touch]) => ({ id, family, width, height, touch }));

export const workflowIds = Array.from({ length: 14 }, (_, i) => `F${String(i + 1).padStart(2, '0')}`);
export const dimensions = ['responsiveness', 'input_ux', 'feature_parity', 'design_identity'];
export const checkKey = row => `${row.engine}/${row.viewport_id}/${row.workflow_id}`;
export function requiredChecks(ids = workflowIds, breakpoints = [768, 1536], engines = ['chromium']) {
  const probes = [];
  for (const input of ['touch', 'mouse-keyboard']) {
    const prefix = input === 'touch' ? 'touch' : 'pointer';
    for (let width = 320; width <= 1920; width += 40) {
      probes.push({ viewport_id: `sweep-${prefix}-${width}`, workflow_id: 'layout-sweep', width, height: 800, input });
    }
    for (const width of [...new Set(breakpoints.flatMap(b => [b - 1, b, b + 1]))]) {
      probes.push({ viewport_id: `boundary-${prefix}-${width}`, workflow_id: 'layout-boundaries', width, height: 800, input });
    }
  }
  const rows = [...profiles.flatMap(p => ids.map(id => ({ viewport_id: p.id, workflow_id: id, width: p.width, height: p.height, input: p.touch ? 'touch' : 'mouse-keyboard' }))), ...probes];
  return engines.flatMap(engine => rows.map(row => ({ ...row, engine })));
}
