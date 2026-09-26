/**
 * Function pagePolishScreenshotDir
 * @description The durable output directory for the page-content-polish design pass's
 * BEFORE/AFTER render-test screenshots — every spec's `visual evidence` describe writes here.
 * `FG_SCREENSHOT_DIR` names one authorized run's directory explicitly; unset, captures land
 * under a fixed `default` subdirectory rather than overwriting a prior run silently. Always
 * namespaced by `projectName` — Chromium and WebKit run these same tests in parallel, and a
 * shared filename would let one engine overwrite the other's evidence.
 * @access public
 * @since 1.0.0
 * @param {string} projectName - The running Playwright project (`testInfo.project.name`).
 * @returns {string} The directory this project's captures for this run are written under.
 */
export function pagePolishScreenshotDir(projectName: string): string {
  return `${process.env['FG_SCREENSHOT_DIR'] ?? 'e2e/artifacts/page-polish/default'}/${projectName}`;
}
