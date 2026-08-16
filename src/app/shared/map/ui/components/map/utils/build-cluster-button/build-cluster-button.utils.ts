/**
 * Constant CLUSTER_BUTTON_CLASS
 * @description Layout and colour classes a cluster button always carries — the
 * app's `primary` token, so a cluster is visually distinct from any single
 * marker's status glyph.
 * @since 1.0.0
 */
const CLUSTER_BUTTON_CLASS: string =
  'flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-bold text-primary-foreground shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * Function buildClusterButton
 *
 * @description
 * Builds the DOM element for a cluster: a real `<button>` labelled with the
 * point count, so expanding a cluster is a keyboard-reachable action rather
 * than a canvas circle a pointer-only user must hit precisely.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {number} count - How many markers the cluster groups.
 *
 * @returns {HTMLButtonElement} The button, not yet attached to the DOM.
 */
export function buildClusterButton(count: number): HTMLButtonElement {
  const button: HTMLButtonElement = document.createElement('button');
  button.type = 'button';
  button.className = CLUSTER_BUTTON_CLASS;
  button.textContent = String(count);
  button.setAttribute(
    'aria-label',
    $localize`:@@map.cluster.label:${count}:count: markers at this location`,
  );

  return button;
}
