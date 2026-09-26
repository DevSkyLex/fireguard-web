import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  organizationMemberOutput,
  inspectorOrganizationMemberOutput,
} from '../support/fixtures/member-fixtures';
import { collectConsoleErrors, setDarkTheme } from '../support/helpers/appearance';
import {
  capturePresence,
  deliverPresencePreference,
  deliverPresenceFrame,
  mockPresenceScenario,
  openPresenceMenu,
  presenceScenario,
  verifyPresenceControl,
  verifyPresenceNotifications,
} from '../support/helpers/presence';

for (const theme of ['light', 'dark'] as const) {
  test(`presence menu confirms keyboard NPD and persists after reload in ${theme} theme`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    const errors = collectConsoleErrors(page);
    await mockPresenceScenario(page, presenceScenario());
    if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await verifyPresenceControl(page, info, false);
    expect(errors).toEqual([]);
  });
}

test('NPD synchronizes between isolated devices and incoming notifications remain live', async ({
  browser,
  page,
  baseURL,
}, info) => {
  const state = presenceScenario();
  await mockPresenceScenario(page, state);
  const second = await browser.newContext({ baseURL });
  const other = await second.newPage();
  try {
    await mockPresenceScenario(other, state);
    await Promise.all(
      [page, other].map((device) => device.goto(`/organizations/${E2E_ORGANIZATION_ID}/more`)),
    );
    await openPresenceMenu(page, false);
    await openPresenceMenu(other, false);
    const control = page.getByRole('menuitemcheckbox', { name: 'Do not disturb', exact: true });
    const remote = other.getByRole('menuitemcheckbox', { name: 'Do not disturb', exact: true });
    await expect(remote).not.toBeChecked();
    await control.click();
    await expect(control).toBeChecked();
    await deliverPresencePreference(other, state);
    await expect(remote).toBeChecked();
    await capturePresence(other, info, 'second-device-synchronized');
    await verifyPresenceNotifications(page, state);
    await capturePresence(page, info, 'inbox-under-do-not-disturb');
    await remote.click();
    await expect(remote).not.toBeChecked();
    await deliverPresencePreference(page, state);
    await openPresenceMenu(page, false);
    await expect(control).not.toBeChecked();
  } finally {
    await second.close();
  }
});

test('a second user sees the colleague change from active to NPD and offline in the roster', async ({
  browser,
  page,
  baseURL,
}, info) => {
  const author = presenceScenario();
  const viewer = presenceScenario();
  const preferences = { 'e2e-member-1': author, 'e2e-member-2': viewer };
  await mockPresenceScenario(page, author, 1, preferences);
  const context = await browser.newContext({ baseURL });
  const colleague = await context.newPage();
  await colleague.clock.install();
  try {
    const api = await mockPresenceScenario(colleague, viewer, 2, preferences);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [
      organizationMemberOutput(),
      inspectorOrganizationMemberOutput(),
    ]);
    await api.mockOrganizationInvitations(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, []);
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/more`);
    await colleague.goto(`/organizations/${E2E_ORGANIZATION_ID}/members`);
    const row = colleague
      .getByTestId('organization-member-table-row')
      .filter({ hasText: 'Ella Uzer' });
    await expect(row.getByRole('img', { name: 'Active', exact: true })).toBeVisible();
    await openPresenceMenu(page, false);
    await page.getByRole('menuitemcheckbox', { name: 'Do not disturb', exact: true }).click();
    await expect.poll(() => author.doNotDisturb).toBe(true);
    await deliverPresenceFrame(colleague, `/organizations/${E2E_ORGANIZATION_ID}/presence`, {
      type: 'presence.changed',
      organizationId: E2E_ORGANIZATION_ID,
      memberId: 'e2e-member-1',
    });
    await expect(row.getByRole('img', { name: 'Do not disturb', exact: true })).toBeVisible();
    await capturePresence(colleague, info, 'second-user-roster-do-not-disturb');
    author.online = false;
    await colleague.clock.fastForward(45_000);
    await expect(row.getByRole('img', { name: 'Offline', exact: true })).toBeVisible();
    await expect(row.getByText('Active', { exact: true })).toBeVisible();
    await capturePresence(colleague, info, 'second-user-roster-offline');
  } finally {
    await context.close();
  }
});
