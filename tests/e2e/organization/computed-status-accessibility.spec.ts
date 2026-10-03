import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
  hydraCollection,
} from '../support/fixtures/api-fixtures';
import { equipmentOutput, inStockEquipmentOutput } from '../support/fixtures/equipment-fixtures';
import { facilityOutput } from '../support/fixtures/facility-fixtures';
import { expectAccessibleStatus } from '../support/helpers/accessibility-evidence';
import { collectConsoleErrors } from '../support/helpers/appearance';
import { mockMessagesWorkspace } from '../support/helpers/direct-messages';
import { ApiMock } from '../support/mocks/api-mock';

const evidenceDirectory = '.tmp/review-captures/web-sonar-status-20261003';

/** Retains native accessibility and keyboard evidence from the actual application. */
async function recordStatus(
  page: Page,
  target: Locator,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  const evidenceName = `${testInfo.project.name}-repeat${testInfo.repeatEachIndex}-retry${testInfo.retry}-${name}`;
  await target.scrollIntoViewIfNeeded();
  await expectAccessibleStatus(page, target, evidenceName);
  expect(await target.evaluate((element: HTMLElement) => element.tabIndex)).toBe(-1);
  await expect(target).not.toBeFocused();
  await mkdir(evidenceDirectory, { recursive: true });
  await Promise.all(
    ['json', 'png'].map((extension) =>
      copyFile(
        `tests/e2e/artifacts/accessibility/${evidenceName}.${extension}`,
        `${evidenceDirectory}/${evidenceName}.${extension}`,
      ),
    ),
  );
  await writeFile(
    `${evidenceDirectory}/${evidenceName}-keyboard.json`,
    JSON.stringify(
      {
        target: await target.evaluate((element) => element.outerHTML),
        focus: await page.locator(':focus').evaluate((element) => element.outerHTML),
        tabIndex: await target.evaluate((element: HTMLElement) => element.tabIndex),
      },
      null,
      2,
    ),
  );
}

/** Holds a matched GET until release, then delegates to the existing hermetic fixture. */
async function holdGet(page: Page, pattern: RegExp): Promise<() => void> {
  let release: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(pattern, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await pending;
    await route.fallback();
  });
  return () => release?.();
}

test('announces the selected-label calculation while keyboard selection keeps focus', async ({
  page,
}, testInfo: TestInfo) => {
  const errors = collectConsoleErrors(page);
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, [
    equipmentOutput(),
    inStockEquipmentOutput({ serialNumber: 'SN-2024-002' }),
  ]);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/equipments`);
  const opener = page.getByTestId('equipments-print-labels');
  await opener.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByTestId('equipment-labels-dialog');
  const counter = dialog.locator('output');
  await expect(counter).toHaveText('0 labels selected');
  const checkbox = dialog.getByRole('checkbox', { name: 'SN-2024-001' });
  await checkbox.focus();
  await page.keyboard.press('Space');
  await expect(counter).toHaveText('1 labels selected');
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toBeFocused();
  await recordStatus(page, counter, 'equipment-label-count-native-output', testInfo);
  await page.keyboard.press('Space');
  await expect(counter).toHaveText('0 labels selected');
  await expect(checkbox).not.toBeChecked();
  await expect(checkbox).toBeFocused();
  expect(errors).toEqual([]);
});

test('announces the facility server page while Next and Previous remain keyboard controls', async ({
  page,
}, testInfo: TestInfo) => {
  const errors = collectConsoleErrors(page);
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, [equipmentOutput()]);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()], { totalItems: 201 });
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/equipments?create=1`);
  const picker = page.getByTestId('equipment-create-sheet').locator('app-facility-option-picker');
  const counter = picker.locator('output');
  await expect(counter).toHaveText('1 / 2');
  const next = picker.getByRole('button', { name: 'Next', exact: true });
  await next.focus();
  const requested = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return (
      request.method() === 'GET' &&
      url.pathname === `/api/organizations/${E2E_ORGANIZATION_ID}/facilities` &&
      url.searchParams.get('page') === '2'
    );
  });
  await page.keyboard.press('Enter');
  await requested;
  await expect(counter).toHaveText('2 / 2');
  const previous = picker.getByRole('button', { name: 'Previous', exact: true });
  await previous.focus();
  await recordStatus(page, counter, 'facility-page-native-output', testInfo);
  await page.keyboard.press('Tab');
  await expect(counter).not.toBeFocused();
  await previous.focus();
  await page.keyboard.press('Enter');
  await expect(counter).toHaveText('1 / 2');
  expect(errors).toEqual([]);
});

test('exposes facility loading as a polite advisory paragraph without moving form focus', async ({
  page,
}, testInfo: TestInfo) => {
  const errors = collectConsoleErrors(page);
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: [
      ...ALL_ORGANIZATION_PERMISSIONS,
      'organization.events.read',
      'organization.events.write',
    ],
  });
  await api.mockCalendarFeed(E2E_ORGANIZATION_ID);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
  const release = await holdGet(
    page,
    new RegExp(`/api/organizations/${E2E_ORGANIZATION_ID}/facilities(?:\\?|$)`),
  );
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/calendar`);
  await page.getByTestId('calendar-new-event').focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByTestId('calendar-event-dialog');
  const status = dialog.getByRole('status').filter({ hasText: 'Loading facilities' });
  const title = page.getByTestId('calendar-event-title');
  try {
    await expect(status).toBeVisible();
    expect(await status.evaluate((element) => element.localName)).toBe('p');
    await title.focus();
    await page.keyboard.press('Tab');
    await expect(status).not.toBeFocused();
    await title.focus();
    await recordStatus(page, status, 'calendar-facilities-loading-status', testInfo);
    await expect(title).toBeFocused();
  } finally {
    release();
  }
  await expect(status).toHaveCount(0);
  await expect(title).toBeFocused();
  await title.fill('Keyboard-created event');
  await expect(title).toHaveValue('Keyboard-created event');
  expect(errors).toEqual([]);
});

test('exposes history loading as a polite advisory paragraph while retaining toggle focus', async ({
  page,
}, testInfo: TestInfo) => {
  const errors = collectConsoleErrors(page);
  await mockMessagesWorkspace(page);
  const endpoint = `/api/organizations/${E2E_ORGANIZATION_ID}/assistant/threads`;
  await page.route(new RegExp(`${endpoint}(?:\\?|$)`), async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({ json: hydraCollection([]) });
  });
  const release = await holdGet(page, new RegExp(`${endpoint}(?:\\?|$)`));
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/messages`);
  const opener = page.getByTestId('assistant-toggle').filter({ visible: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  const toggle = page.getByTestId('assistant-history-toggle');
  await toggle.focus();
  await page.keyboard.press('Enter');
  const status = page.locator('#assistant-history p[role="status"]');
  try {
    await expect(status).toHaveText('Loading conversation history…');
    expect(await status.evaluate((element) => element.localName)).toBe('p');
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(status).not.toBeFocused();
    await toggle.focus();
    await recordStatus(page, status, 'assistant-history-loading-status', testInfo);
  } finally {
    release();
  }
  await expect(status).toHaveCount(0);
  await expect(page.getByText('No previous conversations.', { exact: true })).toBeVisible();
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#assistant-history')).toHaveCount(0);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(errors).toEqual([]);
});
