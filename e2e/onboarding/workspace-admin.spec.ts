import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { organizationQuotaOutput } from '../support/fixtures/billing-fixtures';
import { organizationRoleOutput } from '../support/fixtures/role-fixtures';
import { workspaceRequest } from '../support/fixtures/workspace-fixtures';
import {
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

const CAPTURES = 'e2e/artifacts/join-workspace-20260907';
for (const width of [390, 1440]) {
  for (const dark of [false, true]) {
    test(`renders domain settings and manager review at ${width}px in ${dark ? 'dark' : 'light'} mode`, async ({
      page,
      context,
      baseURL,
    }) => {
      await mkdir(CAPTURES, { recursive: true });
      await page.setViewportSize({ width, height: 900 });
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
      await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
      await api.mockOrganizationInvitations(E2E_ORGANIZATION_ID, []);
      await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, [organizationRoleOutput()]);
      await api.mockOrganizationAccessPolicy(E2E_ORGANIZATION_ID, {
        '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/access-policy`,
        '@type': 'OrganizationAccessPolicy',
        mode: 'approval_required',
        eligibleRoles: [{ id: 'member-role', label: 'Member' }],
        domains: [
          {
            '@id': '/api/organizations/domains/domain-1',
            '@type': 'OrganizationDomain',
            id: 'domain-1',
            domain: 'regional-maintenance.example.com',
            status: 'verified',
            dnsName: '_fireguard-verification.regional-maintenance.example.com',
            dnsValue:
              'fireguard-verification=1234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefgh',
          },
        ],
      });
      await api.mockOrganizationJoinRequests(E2E_ORGANIZATION_ID, [
        workspaceRequest({
          applicantEmail: 'regional.safety.coordinator.north@regional-maintenance.example.com',
          actions: ['approve', 'reject'],
        }),
      ]);
      await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/settings?tab=access`);
      const access = page.getByTestId('organization-access-panel');
      await expect(
        access.getByRole('heading', { name: 'Organization access', exact: true }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoInternalOverflow(access);
      await page.screenshot({
        path: `${CAPTURES}/admin-access-${width}-${dark ? 'dark' : 'light'}.png`,
        animations: 'disabled',
      });
      const verify = access.getByRole('button', { name: 'Verify domain', exact: true });
      await verify.scrollIntoViewIfNeeded();
      await expect(verify).toBeInViewport();
      await expectNoInternalOverflow(access);
      await page.screenshot({
        path: `${CAPTURES}/admin-dns-${width}-${dark ? 'dark' : 'light'}.png`,
        animations: 'disabled',
      });
      await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/members?tab=requests`);
      const requests = page.getByTestId('organization-join-requests');
      await expect(
        requests.getByText('regional.safety.coordinator.north@regional-maintenance.example.com'),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoInternalOverflow(requests);
      await page.screenshot({
        path: `${CAPTURES}/admin-requests-${width}-${dark ? 'dark' : 'light'}.png`,
        animations: 'disabled',
      });
      await requests.getByRole('button', { name: 'Review request' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expectNoInternalOverflow(dialog);
      await page.screenshot({
        path: `${CAPTURES}/admin-review-${width}-${dark ? 'dark' : 'light'}.png`,
        animations: 'disabled',
      });
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    });
  }
}
