import { expect, type Locator } from '@playwright/test';

/**
 * Function criticalVisibility
 * @description Measures full bounds against the viewport and clipping ancestors, with one CSS
 * pixel of rounding tolerance. Hit tests cover the center and inset corners without scrolling.
 * @access public
 * @since 1.0.0
 * @param {Locator} locator - The critical action in its settled viewport position.
 * @returns {Promise<{ visible: boolean; failures: string[] }>} Measured visibility and occlusion failures.
 */
export async function criticalVisibility(
  locator: Locator,
): Promise<{ visible: boolean; failures: string[] }> {
  return locator.evaluate((element) => {
    const tolerance = 1;
    const bounds = element.getBoundingClientRect();
    const viewport = window.visualViewport;
    const clip = {
      left: viewport?.offsetLeft ?? 0,
      top: viewport?.offsetTop ?? 0,
      right: (viewport?.offsetLeft ?? 0) + (viewport?.width ?? innerWidth),
      bottom: (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight),
    };
    const failures: string[] = [];
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (style.visibility !== 'visible' || Number(style.opacity) === 0 || style.display === 'none')
        failures.push('An action or ancestor is hidden.');
      if (ancestor === element) continue;
      const rect = ancestor.getBoundingClientRect();
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
        clip.left = Math.max(clip.left, rect.left + ancestor.clientLeft);
        clip.right = Math.min(clip.right, rect.left + ancestor.clientLeft + ancestor.clientWidth);
      }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
        clip.top = Math.max(clip.top, rect.top + ancestor.clientTop);
        clip.bottom = Math.min(clip.bottom, rect.top + ancestor.clientTop + ancestor.clientHeight);
      }
    }
    if (bounds.width <= 0 || bounds.height <= 0) failures.push('The action has no area.');
    if (
      bounds.left < clip.left - tolerance ||
      bounds.right > clip.right + tolerance ||
      bounds.top < clip.top - tolerance ||
      bounds.bottom > clip.bottom + tolerance
    )
      failures.push(
        `Full action bounds ${JSON.stringify(bounds.toJSON())} exceed visible bounds ${JSON.stringify(clip)} (tolerance 1px).`,
      );
    const insetX = Math.min(4, bounds.width / 4);
    const insetY = Math.min(4, bounds.height / 4);
    const points = [
      [bounds.left + bounds.width / 2, bounds.top + bounds.height / 2],
      [bounds.left + insetX, bounds.top + insetY],
      [bounds.right - insetX, bounds.top + insetY],
      [bounds.left + insetX, bounds.bottom - insetY],
      [bounds.right - insetX, bounds.bottom - insetY],
    ];
    for (const [x, y] of points) {
      const hit = document.elementFromPoint(x, y);
      if (!hit || (hit !== element && !element.contains(hit)))
        failures.push(`The action is occluded at (${x}, ${y}) by ${hit?.tagName ?? 'nothing'}.`);
    }
    return { visible: failures.length === 0, failures };
  });
}

/**
 * Function expectCriticalActionVisible
 * @description Requires a fully visible, unobscured action in its current position; never auto-scrolls it.
 * @access public
 * @since 1.0.0
 * @param {Locator} locator - Critical action to measure.
 * @returns {Promise<void>} Fails with measured bounds or occlusion evidence.
 */
export async function expectCriticalActionVisible(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
  await expect
    .poll(async () => (await criticalVisibility(locator)).failures, {
      message: 'Critical action must be fully visible and unobscured.',
    })
    .toEqual([]);
}
