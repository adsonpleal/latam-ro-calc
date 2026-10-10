/** The bootstrap is needed to display the sole calculator route. Other dynamic
 * imports (release history, replay parsing, dialogs) stay outside startup. */
export function startupOutputs(outputs, entries) {
  const startup = new Set();
  function collect(name) {
    if (startup.has(name)) return;
    startup.add(name);
    for (const entry of outputs[name]?.imports ?? []) {
      if (!entry.external && entry.kind !== 'dynamic-import') collect(entry.path);
    }
  }
  for (const name of entries) collect(name);
  return startup;
}
