import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { interventionOutput } from '../fixtures/intervention-fixtures';
import { API_BASE_URL, ApiMock } from '../mocks/api-mock';
import {
  expectMinimumCssPixels,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from './appearance';
import { expectCriticalActionVisible } from './critical-visibility';
import {
  readOutboxOperations,
  readStore,
  seedOutboxOperations,
  setAppOffline,
  setAppOnline,
  type OutboxRecord,
} from './offline';

const WORKSPACE_URL = `/organizations/${E2E_ORGANIZATION_ID}/more`;
const INTERVENTION_ID = 'e2e-logout-pending-intervention';
const TITLE = 'Local changes are waiting';
const DESCRIPTION =
  /Signing out removes the changes saved on this device\. Synchronize them first, cancel, or explicitly discard them\./;

/** Persisted work includes a failed record that the shell's pending counter excludes. */
function queuedOperations(): readonly OutboxRecord[] {
  const createdAt = new Date().toISOString();
  return [
    {
      id: 'logout-pending-comment',
      interventionId: INTERVENTION_ID,
      type: 'comment.create',
      payload: { body: 'Locally saved inspection note', clientId: 'logout-comment-client' },
      createdAt,
      status: 'pending',
    },
    {
      id: 'logout-failed-comment',
      interventionId: INTERVENTION_ID,
      type: 'comment.create',
      payload: { body: 'Retained rejected note', clientId: 'logout-failed-client' },
      createdAt,
      status: 'failed',
      error: 'This operation needs explicit resolution.',
    },
  ];
}

/** Seeds the normal cached owner record without changing IndexedDB's auth metadata. */
async function seedCachedIntervention(page: Page): Promise<void> {
  await page.evaluate(
    async (intervention) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('fireguard-field-interventions');
        request.addEventListener('success', () => resolve(request.result));
        request.addEventListener('error', () => reject(request.error));
      });
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction('interventions', 'readwrite');
          transaction.objectStore('interventions').put(intervention, intervention.id);
          transaction.addEventListener('complete', () => resolve());
          transaction.addEventListener('error', () => reject(transaction.error));
        });
      } finally {
        database.close();
      }
    },
    interventionOutput({ id: INTERVENTION_ID, '@id': `/api/interventions/${INTERVENTION_ID}` }),
  );
}

/** Boots an authenticated hermetic workspace, then seeds actual offline storage. */
async function arrangePendingLogout(page: Page, mobile: boolean, logoutStatus = 200) {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockLogout({ status: logoutStatus });
  const logoutRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/auth/logout') {
      logoutRequests.push(request.method());
    }
  });
  await page.goto(WORKSPACE_URL);
  await expect(page.locator('#organization-more-page')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-interaction-mode',
    mobile ? 'mobile' : 'desktop',
  );
  await setAppOffline(page);
  const operations = queuedOperations();
  await seedOutboxOperations(page, operations);
  await seedCachedIntervention(page);
  await expectRetainedWork(page, operations);
  return { operations, logoutRequests };
}

/** Opens the production logout entry point using desktop keyboard or mobile touch. */
async function openReview(page: Page, mobile: boolean, keyboard = false): Promise<Locator> {
  if (mobile) {
    const trigger = page.getByTestId('logout-control');
    if (keyboard) await trigger.press('Enter');
    else await trigger.tap();
  } else {
    const trigger = page.locator('#account-menu-trigger').filter({ visible: true });
    if (keyboard) await trigger.press('Enter');
    else await trigger.click();
    const logout = page.getByRole('menuitem', { name: 'Log out', exact: true });
    if (keyboard) await logout.press('Enter');
    else await logout.click();
  }
  const dialog = page.getByRole('dialog', { name: TITLE, exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName(TITLE);
  await expect(dialog).toHaveAccessibleDescription(DESCRIPTION);
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  await expect(dialog.getByRole('heading', { name: TITLE, level: 2 })).toBeVisible();
  await expect(dialog.locator('[aria-live="polite"]')).toHaveText(/Pending operations:\s*2/);
  return dialog;
}

/** Compares persisted records, including failed status, rather than a mocked UI count. */
async function expectRetainedWork(page: Page, operations: readonly OutboxRecord[]): Promise<void> {
  const sorted = operations.toSorted((left, right) => left.id.localeCompare(right.id));
  await expect
    .poll(async () =>
      (await readOutboxOperations(page)).toSorted((left, right) => left.id.localeCompare(right.id)),
    )
    .toEqual(sorted);
}

/** Requires all consequential actions to remain on screen and usable without scrolling. */
async function expectDialogGeometry(page: Page, dialog: Locator, mobile: boolean): Promise<void> {
  await expectNoHorizontalOverflow(page);
  await expectNoInternalOverflow(dialog);
  await Promise.all(
    ['Cancel', 'Discard local changes and sign out', 'Synchronize and sign out'].map(
      async (name) => {
        const action = dialog.getByRole('button', { name, exact: true });
        await expectCriticalActionVisible(action);
        if (mobile) {
          const bounds = await action.boundingBox();
          if (!bounds) throw new Error(`${name} must have measurable touch bounds.`);
          expectMinimumCssPixels(bounds.width, 44);
          expectMinimumCssPixels(bounds.height, 44);
        }
      },
    ),
  );
}

/** Composites one browser-resolved foreground over its underlying RGB background. */
function compositeColor(foreground: number[], background: number[]): number[] {
  const alpha = (foreground[3] ?? 255) / 255;
  return [0, 1, 2].map(
    (channel) => (foreground[channel] ?? 0) * alpha + (background[channel] ?? 0) * (1 - alpha),
  );
}

/** Measures relative luminance from the captured sRGB channels. */
function relativeLuminance(rgb: number[]): number {
  const linear = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return (linear[0] ?? 0) * 0.2126 + (linear[1] ?? 0) * 0.7152 + (linear[2] ?? 0) * 0.0722;
}

/** Reads effective button colors from the browser, including translucent ancestor backgrounds. */
async function actionStyle(action: Locator) {
  const sample = await action.evaluate((element) => {
    const style = getComputedStyle(element);
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('A canvas color resolver is required for computed CSS evidence.');
    const resolveColor = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    };
    const backgrounds: number[][] = [];
    let ancestor: Element | null = element;
    while (ancestor) {
      const background = resolveColor(getComputedStyle(ancestor).backgroundColor);
      backgrounds.push(background);
      if (background[3] === 255) break;
      ancestor = ancestor.parentElement;
    }
    if (backgrounds.at(-1)?.[3] !== 255)
      throw new Error('The dialog must provide an opaque background for contrast measurement.');
    const bounds = element.getBoundingClientRect();
    return {
      text: element.textContent?.trim(),
      foreground: style.color,
      background: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      opacity: style.opacity,
      hovered: element.matches(':hover'),
      fontSize: style.fontSize,
      minHeight: style.minHeight,
      width: bounds.width,
      height: bounds.height,
      foregroundRgba: resolveColor(style.color),
      backgrounds,
    };
  });
  const backgroundRgb = sample.backgrounds
    .toReversed()
    .reduce((background, foreground) => compositeColor(foreground, background), [0, 0, 0]);
  const foregroundRgb = compositeColor(sample.foregroundRgba, backgroundRgb);
  const foregroundLuminance = relativeLuminance(foregroundRgb);
  const backgroundLuminance = relativeLuminance(backgroundRgb);
  return {
    ...sample,
    foregroundRgb,
    backgroundRgb,
    contrastRatio:
      (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05),
  };
}

/** Waits for finite subtree and ancestor animations before sampling effective geometry and colors. */
async function settleAnimations(locator: Locator): Promise<void> {
  await locator.evaluate(async (element) => {
    const animations = new Set(element.getAnimations({ subtree: true }));
    let ancestor: Element | null = element.parentElement;
    while (ancestor) {
      for (const animation of ancestor.getAnimations()) animations.add(animation);
      ancestor = ancestor.parentElement;
    }
    await Promise.all(
      Array.from(animations)
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

/** Samples the primary anchor variant on the same footer surface without changing product source. */
async function primaryAnchorStyles(page: Page, primary: Locator) {
  const previousPosition = await primary.evaluate((element) => {
    const parent = element.parentElement;
    if (!(parent instanceof HTMLElement)) throw new Error('The primary footer must be measurable.');
    const position = parent.style.position;
    parent.style.position = 'relative';
    const anchor = document.createElement('a');
    anchor.id = 'logout-primary-anchor-probe';
    anchor.className = element.getAttribute('class') ?? '';
    for (const name of ['data-slot', 'hlmbtn']) {
      const value = element.getAttribute(name);
      if (value !== null) anchor.setAttribute(name, value);
    }
    anchor.textContent = element.textContent;
    anchor.tabIndex = -1;
    anchor.setAttribute('aria-hidden', 'true');
    Object.assign(anchor.style, { position: 'absolute', top: '16px', left: '16px', zIndex: '1' });
    parent.append(anchor);
    return position;
  });
  const anchor = page.locator('#logout-primary-anchor-probe');
  try {
    await page.mouse.move(1, 1);
    await settleAnimations(anchor);
    const normal = await actionStyle(anchor);
    await anchor.hover();
    await settleAnimations(anchor);
    const hover = await actionStyle(anchor);
    return { normal, hover };
  } finally {
    await anchor.evaluate((element, position) => {
      const parent = element.parentElement;
      if (parent instanceof HTMLElement) parent.style.position = position;
      element.remove();
    }, previousPosition);
  }
}

/** Keeps actual dialog anatomy, focus, queued state and a settled image outside disposable output. */
async function captureDialog(
  page: Page,
  dialog: Locator,
  info: TestInfo,
  name: string,
): Promise<void> {
  const directory = `${process.env['FG_SCREENSHOT_DIR'] ?? '.tmp/review-captures/logout-pending'}/${info.project.name.replaceAll(' ', '-')}`;
  await mkdir(directory, { recursive: true });
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await settleAnimations(dialog);
  const hoverSupported = await page.evaluate(() => matchMedia('(hover: hover)').matches);
  const primary = dialog.getByRole('button', { name: 'Synchronize and sign out', exact: true });
  if (hoverSupported) {
    await page.mouse.move(1, 1);
    await settleAnimations(primary);
  }
  const actions = await Promise.all(
    ['Cancel', 'Discard local changes and sign out', 'Synchronize and sign out'].map(
      async (label) => actionStyle(dialog.getByRole('button', { name: label, exact: true })),
    ),
  );
  const mobile = (await page.locator('html').getAttribute('data-interaction-mode')) === 'mobile';
  for (const action of actions) {
    expect(
      action.contrastRatio,
      `${action.text} must retain readable normal text.`,
    ).toBeGreaterThanOrEqual(4.5);
    expect(action.opacity).toBe('1');
    expect(action.backgroundImage).toBe('none');
    if (mobile) {
      expect(
        action.height,
        `${action.text} must retain a 44px touch height.`,
      ).toBeGreaterThanOrEqual(44);
      expect(action.width, `${action.text} must retain a 44px touch width.`).toBeGreaterThanOrEqual(
        44,
      );
    }
  }
  let primaryHover = null;
  let primaryAnchor = null;
  if (hoverSupported) {
    await primary.hover();
    await settleAnimations(primary);
    primaryHover = await actionStyle(primary);
    expect(primaryHover.hovered).toBe(true);
    primaryAnchor = await primaryAnchorStyles(page, primary);
    expect(primaryAnchor.normal.hovered).toBe(false);
    expect(primaryAnchor.hover.hovered).toBe(true);
    expect(primaryAnchor.normal.contrastRatio).toBeGreaterThanOrEqual(4.5);
    expect(primaryAnchor.hover.contrastRatio).toBeGreaterThanOrEqual(4.5);
    await page.mouse.move(1, 1);
    await settleAnimations(primary);
  }
  await page.screenshot({ path: `${directory}/${name}.png`, animations: 'disabled' });
  await writeFile(
    `${directory}/${name}.json`,
    JSON.stringify(
      {
        scenario: info.title,
        project: info.project.name,
        viewport: page.viewportSize(),
        theme: await page.locator('html').getAttribute('data-theme'),
        url: page.url(),
        html: await dialog.evaluate((element) => element.outerHTML),
        accessibility: await dialog.ariaSnapshot(),
        focus: await page.evaluate(() => document.activeElement?.textContent?.trim()),
        operations: await readOutboxOperations(page),
        actions,
        primaryHover,
        primaryAnchor,
        hoverSupported,
        capturedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  await info.attach(`logout-pending-${name}`, {
    path: `${directory}/${name}.png`,
    contentType: 'image/png',
  });
}

/** Registers the same persisted-work decisions for desktop and real mobile-device projects. */
export function registerPendingLogoutScenarios(mobile: boolean): void {
  const runtimeErrors = new WeakMap<Page, string[]>();
  test.beforeEach(({ page }) => {
    const errors: string[] = [];
    runtimeErrors.set(page, errors);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /NG\d+/.test(message.text())) errors.push(message.text());
    });
  });
  test.afterEach(({ page }) => {
    expect(runtimeErrors.get(page), 'Logout must not emit Angular runtime errors.').toEqual([]);
  });

  test('cancels logout without sending a request or removing persisted local work', async ({
    page,
  }) => {
    const state = await arrangePendingLogout(page, mobile);
    const dialog = await openReview(page, mobile, !mobile);
    const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
    if (mobile) {
      await expect
        .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
        .toBe(true);
      await expect(
        dialog.getByRole('button', { name: 'Discard local changes and sign out', exact: true }),
      ).not.toBeFocused();
      await expect(
        dialog.getByRole('button', { name: 'Synchronize and sign out', exact: true }),
      ).not.toBeFocused();
    } else {
      await expect(cancel).toBeFocused();
      await Array.from({ length: 6 }).reduce(async (previous) => {
        await previous;
        await page.keyboard.press('Tab');
        await expect
          .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
          .toBe(true);
      }, Promise.resolve());
    }
    if (mobile) await cancel.tap();
    else await cancel.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(WORKSPACE_URL);
    await expectRetainedWork(page, state.operations);
    expect(state.logoutRequests).toEqual([]);
  });

  test('dismisses logout with Escape while preserving the authenticated workspace and queue', async ({
    page,
  }) => {
    const state = await arrangePendingLogout(page, mobile);
    const dialog = await openReview(page, mobile, true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(WORKSPACE_URL);
    await expectRetainedWork(page, state.operations);
    expect(state.logoutRequests).toEqual([]);
    if (mobile) await expect(page.getByTestId('logout-control')).toBeFocused();
    else
      await expect(page.locator('#account-menu-trigger').filter({ visible: true })).toBeFocused();
  });

  test('keeps both pending and failed work local when synchronization cannot run offline', async ({
    page,
  }, info) => {
    const state = await arrangePendingLogout(page, mobile);
    const dialog = await openReview(page, mobile);
    const synchronize = dialog.getByRole('button', {
      name: 'Synchronize and sign out',
      exact: true,
    });
    if (mobile) await synchronize.tap();
    else await synchronize.click();
    await expect(dialog.getByRole('alert')).toHaveText(
      'Some changes could not be synchronized. They are still saved on this device.',
    );
    await expect(synchronize).toBeEnabled();
    await expect(dialog.locator('[aria-live="polite"]')).toHaveText(/Pending operations:\s*2/);
    await expectRetainedWork(page, state.operations);
    expect(state.logoutRequests).toEqual([]);
    await captureDialog(page, dialog, info, 'synchronization-retained');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page).toHaveURL(WORKSPACE_URL);
  });

  test('retains local work and authentication when HTTP synchronization fails', async ({
    page,
  }, info) => {
    const state = await arrangePendingLogout(page, mobile);
    const commentRequests: unknown[] = [];
    await page.route(
      `${API_BASE_URL}/api/interventions/${INTERVENTION_ID}/comments`,
      async (route) => {
        expect(route.request().method()).toBe('POST');
        commentRequests.push(route.request().postDataJSON());
        await route.fulfill({
          status: 500,
          contentType: 'application/ld+json',
          body: JSON.stringify({
            '@type': 'hydra:Error',
            title: 'Synchronization unavailable',
            detail: 'Try again later.',
          }),
        });
      },
    );
    const backgroundFailure = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/interventions/${INTERVENTION_ID}/comments`,
    );
    await setAppOnline(page);
    const response = await backgroundFailure;
    expect(response.status()).toBe(500);
    await response.finished();
    await expect.poll(() => commentRequests.length).toBe(1);
    await expectRetainedWork(page, state.operations);
    const dialog = await openReview(page, mobile);
    const synchronize = dialog.getByRole('button', {
      name: 'Synchronize and sign out',
      exact: true,
    });
    if (mobile) await synchronize.tap();
    else await synchronize.click();
    await expect(dialog.getByRole('alert')).toHaveText(
      'Some changes could not be synchronized. They are still saved on this device.',
    );
    await expect(synchronize).toBeEnabled();
    await expect.poll(() => commentRequests.length).toBe(2);
    expect(commentRequests).toEqual([
      { body: 'Locally saved inspection note', clientId: 'logout-comment-client' },
      { body: 'Locally saved inspection note', clientId: 'logout-comment-client' },
    ]);
    await expectRetainedWork(page, state.operations);
    expect(state.logoutRequests).toEqual([]);
    await captureDialog(page, dialog, info, 'http-synchronization-retained');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page).toHaveURL(WORKSPACE_URL);
  });

  for (const status of [200, 503]) {
    test(
      status === 200
        ? 'discards persisted local work only after explicit confirmation and signs out'
        : 'purges explicitly discarded work and signs out even when remote logout fails',
      async ({ page }) => {
        const state = await arrangePendingLogout(page, mobile, status);
        const dialog = await openReview(page, mobile);
        expect(state.logoutRequests).toEqual([]);
        const discard = dialog.getByRole('button', {
          name: 'Discard local changes and sign out',
          exact: true,
        });
        if (mobile) await discard.tap();
        else await discard.click();
        await expect(page).toHaveURL(/\/auth\/login$/);
        await expect(page.locator('#login-page')).toBeVisible();
        await expect.poll(async () => (await readOutboxOperations(page)).length).toBe(0);
        await expect.poll(async () => (await readStore(page, 'interventions')).length).toBe(0);
        expect(state.logoutRequests).toEqual(['POST']);
      },
    );
  }

  for (const theme of ['light', 'dark'] as const) {
    test(`renders the pending-work dialog with readable actions in ${theme} mode`, async ({
      page,
      context,
      baseURL,
    }, info) => {
      if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      else
        await context.addCookies([
          { name: 'theme-preference', value: 'light', url: baseURL ?? 'http://localhost:4273' },
        ]);
      if (!mobile) await page.setViewportSize({ width: 1280, height: 900 });
      const state = await arrangePendingLogout(page, mobile);
      const dialog = await openReview(page, mobile);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await captureDialog(page, dialog, info, `pending-${theme}`);
      await expectDialogGeometry(page, dialog, mobile);
      await expectRetainedWork(page, state.operations);
      expect(state.logoutRequests).toEqual([]);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    });
  }
}
