import type { MapMarker } from '../../../../../models';
import { resolveMarkerStatusGlyph } from '../marker-status-glyph/marker-status-glyph.utils';

/**
 * Constant MARKER_BUTTON_BASE_CLASS
 * @description Layout classes every marker button carries, regardless of status.
 * @since 1.0.0
 */
const MARKER_BUTTON_BASE_CLASS: string =
  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold shadow-md ring-2 ring-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * Function buildMarkerButton
 *
 * @description
 * Builds the DOM element for one unclustered marker: a real `<button>`
 * rather than a canvas symbol, so it is reachable by keyboard and announced
 * by assistive tech without a separate hit-testing layer. The status glyph
 * and colour both come from {@link resolveMarkerStatusGlyph}, so severity
 * never rests on colour alone, and the marker's `label` becomes the
 * button's accessible name.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {MapMarker} marker - The marker to render.
 *
 * @returns {HTMLButtonElement} The button, not yet attached to the DOM.
 */
export function buildMarkerButton(marker: MapMarker): HTMLButtonElement {
  const glyph = resolveMarkerStatusGlyph(marker.statusKind);

  const button: HTMLButtonElement = document.createElement('button');
  button.type = 'button';
  button.className = `${MARKER_BUTTON_BASE_CLASS} ${glyph.className}`;
  button.textContent = glyph.glyph;
  button.setAttribute('aria-label', marker.label);
  button.dataset['markerId'] = marker.id;

  return button;
}
