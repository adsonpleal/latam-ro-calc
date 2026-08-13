/**
 * "Não mostrar de novo pelos próximos 3 dias" — the only thing that stops the
 * dialog from opening on load. Closing it (or even sending a recording) leaves
 * no trace on purpose: the ask is cheap and we would rather keep it in sight.
 *
 * Lives apart from the component so the topbar can decide whether to auto-open
 * without instantiating the dialog.
 */
const SNOOZE_KEY = 'helpImproveSnoozeUntil';
export const SNOOZE_DAYS = 3;

export function isHelpImproveSnoozed(): boolean {
  const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
  return Number.isFinite(until) && Date.now() < until;
}

export function snoozeHelpImprove(days = SNOOZE_DAYS): void {
  localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
}
