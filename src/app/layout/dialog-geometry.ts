/**
 * Geometry for the layout dialogs, kept out of the template so it can be asserted.
 *
 * The Novidades dialog regressed twice on the same point: with no `width`, PrimeNG lets
 * a dialog grow to whatever its content wants, and the changelog is long paragraphs of
 * prose — on a wide monitor it stretched past 1900px, which is unreadable, and it sat
 * flush against the left edge instead of centred. A dialog that carries running text
 * needs a measure, so the width is pinned here and `maxWidth` keeps it inside narrow
 * viewports.
 *
 * Centring is PrimeNG's default and comes from *not* setting `position` on the dialog —
 * which is exactly the kind of thing a later edit removes by accident, so the template
 * is checked for it in `dialog-geometry.spec.ts`.
 */
export interface DialogGeometry {
  width: string;
  maxWidth: string;
  height?: string;
}

/** "Novidades" — the changelog. Reading width, not a full-screen panel. */
export const UPDATE_DIALOG_STYLE: DialogGeometry = {
  width: '60rem',
  maxWidth: '95vw',
  height: '70vh',
};

/** "Ajude o simulador" — a form, already constrained; here for the same guard. */
export const HELP_IMPROVE_DIALOG_STYLE: DialogGeometry = {
  width: '46rem',
  maxWidth: '95vw',
};
