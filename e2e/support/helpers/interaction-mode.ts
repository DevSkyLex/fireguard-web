import { writeFile } from 'node:fs/promises';
import { expect, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { interventionOutput } from '../fixtures/intervention-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { sourceFingerprint } from './visual-run';

export const INTERACTION_MODE_INTERVENTIONS = [
  interventionOutput({
    id: 'interaction-mode-planned',
    '@id': '/api/interventions/interaction-mode-planned',
    name: 'Quarterly extinguisher inspection — northern distribution depot and maintenance annex',
    status: 'planned',
  }),
  interventionOutput({
    id: 'interaction-mode-progress',
    '@id': '/api/interventions/interaction-mode-progress',
    name: 'Sprinkler riser inspection',
    status: 'in_progress',
  }),
];

/**
 * Function mockInteractionModeInterventions
 * @description Composes existing hermetic endpoint families, including offline prefetch reads.
 * @access public
 * @since 1.0.0
 * @param {Page} page - Isolated test page.
 * @returns {Promise<ApiMock>} Installed mocks for additional scenario overrides.
 */
export async function mockInteractionModeInterventions(page: Page): Promise<ApiMock> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockInterventionList(E2E_ORGANIZATION_ID, INTERACTION_MODE_INTERVENTIONS);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionWorkItems(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionChanges(E2E_ORGANIZATION_ID, []);
  await Promise.all(
    INTERACTION_MODE_INTERVENTIONS.map((intervention) =>
      api.mockInterventionIssues(intervention.id, []),
    ),
  );
  return api;
}

/**
 * Function emulateMobilePlatform
 * @description Completes Playwright device emulation on Windows, where navigator.platform can
 * retain the host platform despite a mobile UA. Supplies coherent device evidence, never the
 * application's classification, and leaves touch/media capabilities to the browser context.
 * @access public
 * @since 1.0.0
 * @param {BrowserContext} context - Mobile device context before its first navigation.
 * @param {'android' | 'android-tablet' | 'ios' | 'ipad'} platform - Emulated platform matching the context UA.
 * @returns {Promise<void>} Platform signals installed for each document.
 */
export async function emulateMobilePlatform(
  context: BrowserContext,
  platform: 'android' | 'android-tablet' | 'ios' | 'ipad',
): Promise<void> {
  await context.addInitScript((device) => {
    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      get: () =>
        device.startsWith('android') ? 'Linux armv8l' : device === 'ipad' ? 'MacIntel' : 'iPhone',
    });
    Object.defineProperty(navigator, 'userAgentData', {
      configurable: true,
      get: () =>
        device.startsWith('android')
          ? { platform: 'Android', mobile: device === 'android' }
          : undefined,
    });
    if (device === 'ipad') {
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => 5 });
    }
  }, platform);
}

/**
 * Function captureInteractionMode
 * @description Keeps settled visual evidence and source/scenario identity outside disposable
 * runner output, namespaced by project. A transient Vite compilation overlay invalidates capture.
 * @access public
 * @since 1.0.0
 * @param {Page} page - Settled UI.
 * @param {TestInfo} info - Project identity for parallel-safe paths.
 * @param {string} name - Scenario name.
 * @returns {Promise<void>} Screenshot saved and attached to the test.
 */
export async function captureInteractionMode(
  page: Page,
  info: TestInfo,
  name: string,
): Promise<void> {
  const run = process.env['FG_VISUAL_RUN'] ?? 'inspection';
  if (!/^[a-zA-Z0-9_-]+$/.test(run))
    throw new Error('FG_VISUAL_RUN must be a simple directory name.');
  const path = `e2e/artifacts/mobile-visual-review/branch-review/${run}/interaction-mode/${info.project.name.replaceAll(' ', '-')}/${name}.png`;
  const source = sourceFingerprint();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await page.screenshot({ path, animations: 'disabled' });
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  const sourceEnd = sourceFingerprint();
  await writeFile(
    path.replace(/\.png$/, '.json'),
    JSON.stringify(
      {
        source,
        sourceEnd,
        sourceChanged: source.fingerprint !== sourceEnd.fingerprint,
        scenario: info.title,
        capture: name,
        project: info.project.name,
        url: page.url(),
        viewport: page.viewportSize(),
        capturedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  await info.attach(name, { path, contentType: 'image/png' });
}
