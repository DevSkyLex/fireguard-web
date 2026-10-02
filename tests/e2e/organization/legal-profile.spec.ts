import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID, organizationOutput } from '../support/fixtures/api-fixtures';
import { organizationQuotaOutput } from '../support/fixtures/billing-fixtures';
import {
  complianceFacilityTreeOutput,
  complianceSummaryOutput,
} from '../support/fixtures/compliance-fixtures';
import { E2E_FACILITY_ID, facilityOutput } from '../support/fixtures/facility-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { captureInteractionMode } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';
import { AssetsExplorerPage } from '../support/pages/assets-explorer.page';
import { OrganizationSettingsPage } from '../support/pages/organization-settings.page';

test.describe('Organization legal profile', () => {
  test('saves a partial legal profile, preserves a draft across another save and clears the address and contact', async ({
    page,
  }, info) => {
    const api = new ApiMock(page);
    let organization: Record<string, unknown> = { ...organizationOutput() };
    const patches: Record<string, unknown>[] = [];
    await api.mockAuthenticatedSession();
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    await api.mockOrganizationLegalTypes();
    await page.route(
      new RegExp(`/api/organizations/${E2E_ORGANIZATION_ID}(\\?.*)?$`),
      async (route) => {
        if (route.request().method() === 'PATCH') {
          const patch = route.request().postDataJSON() as Record<string, unknown>;
          patches.push(patch);
          organization = { ...organization, ...patch };
        } else if (route.request().method() !== 'GET') return route.fallback();
        await route.fulfill({
          status: 200,
          contentType: 'application/ld+json',
          body: JSON.stringify(organization),
        });
      },
    );
    await new OrganizationSettingsPage(page).goto(E2E_ORGANIZATION_ID);
    await expect(
      page.getByText('You can continue with a partial profile.', { exact: false }),
    ).toBeVisible();
    await page
      .getByTestId('org-legal-address-line1')
      .fill('128 avenue des Organisations européennes et des établissements industriels');
    await page.getByTestId('org-legal-address-city').fill('Strasbourg');
    await page.getByTestId('org-legal-address-country').fill('FR');
    await page
      .getByTestId('org-legal-privacy-email')
      .fill('protection-des-donnees-et-demandes@example.org');
    await page.getByTestId('org-settings-name').fill('Updated workspace');
    await page.getByTestId('org-settings-general-submit').click();
    await expect.poll(() => patches.length).toBe(1);
    await expect(page.getByTestId('org-legal-address-city')).toHaveValue('Strasbourg');
    await expect(page.getByTestId('org-legal-privacy-email')).toHaveValue(
      'protection-des-donnees-et-demandes@example.org',
    );
    await page.getByTestId('org-legal-submit').click();
    await expect.poll(() => patches.length).toBe(2);
    expect(patches[1]).toMatchObject({
      registeredAddress: { city: 'Strasbourg', countryCode: 'FR' },
      privacyContactEmail: 'protection-des-donnees-et-demandes@example.org',
    });
    await page.reload();
    await expect(page.getByTestId('org-legal-address-city')).toHaveValue('Strasbourg');
    await expect(page.getByTestId('org-legal-privacy-email')).toHaveValue(
      'protection-des-donnees-et-demandes@example.org',
    );
    await page.getByTestId('org-legal-address-line1').scrollIntoViewIfNeeded();
    await expectNoHorizontalOverflow(page);
    await captureInteractionMode(page, info, 'legal-profile-desktop-light');
    await page.getByTestId('org-legal-address-line1').fill('');
    await page.getByTestId('org-legal-address-line2').fill('');
    await page.getByTestId('org-legal-postal-code').fill('');
    await page.getByTestId('org-legal-address-city').fill('');
    await page.getByTestId('org-legal-address-region').fill('');
    await page.getByTestId('org-legal-address-country').fill('');
    await page.getByTestId('org-legal-privacy-email').fill('');
    await page.getByTestId('org-legal-submit').click();
    await expect.poll(() => patches.length).toBe(3);
    expect(patches[2]).toMatchObject({ registeredAddress: {}, privacyContactEmail: '' });
    await page.reload();
    await expect(page.getByTestId('org-legal-address-city')).toHaveValue('');
    await expect(page.getByTestId('org-legal-privacy-email')).toHaveValue('');
  });

  test('refreshes an intact legal form after a general save while preserving later unsaved edits', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    let organization: Record<string, unknown> = {
      ...organizationOutput(),
      legalName: 'Original Corp',
      registeredAddress: { city: 'Paris' },
      privacyContactEmail: 'original@example.com',
    };
    const patches: Record<string, unknown>[] = [];
    await api.mockAuthenticatedSession();
    await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
    await api.mockOrganizationLegalTypes();
    await page.route(
      new RegExp(`/api/organizations/${E2E_ORGANIZATION_ID}(\\?.*)?$`),
      async (route) => {
        if (route.request().method() === 'PATCH') {
          const patch = route.request().postDataJSON() as Record<string, unknown>;
          patches.push(patch);
          organization = { ...organization, ...patch };
        } else if (route.request().method() !== 'GET') return route.fallback();
        await route.fulfill({
          status: 200,
          contentType: 'application/ld+json',
          body: JSON.stringify(organization),
        });
      },
    );
    await new OrganizationSettingsPage(page).goto(E2E_ORGANIZATION_ID);
    await expect(page.getByTestId('org-legal-name')).toHaveValue('Original Corp');
    await expect(page.getByTestId('org-legal-address-city')).toHaveValue('Paris');

    organization = {
      ...organization,
      legalName: 'Updated Corp',
      registeredAddress: { city: 'Lyon' },
      privacyContactEmail: 'updated@example.com',
    };
    await page.getByTestId('org-settings-name').fill('Updated workspace');
    await page.getByTestId('org-settings-general-submit').click();
    await expect.poll(() => patches.length).toBe(1);
    await expect(page.getByTestId('org-legal-name')).toHaveValue('Updated Corp');
    await expect(page.getByTestId('org-legal-address-city')).toHaveValue('Lyon');
    await expect(page.getByTestId('org-legal-privacy-email')).toHaveValue('updated@example.com');
    await expect(page.getByTestId('org-legal-submit')).toBeDisabled();

    await page.getByTestId('org-legal-name').fill('Edited Corp');
    await page.getByTestId('org-legal-submit').click();
    await expect.poll(() => patches.length).toBe(2);
    expect(patches[1]).toMatchObject({
      legalName: 'Edited Corp',
      registeredAddress: { city: 'Lyon' },
      privacyContactEmail: 'updated@example.com',
    });
    await expect(page.getByTestId('org-legal-submit')).toBeDisabled();

    await page.getByTestId('org-legal-address-city').fill('Unsaved city');
    organization = {
      ...organization,
      legalName: 'Another Corp',
      registeredAddress: { city: 'Strasbourg' },
      privacyContactEmail: 'another@example.com',
    };
    await page.getByTestId('org-settings-name').fill('Another workspace');
    await page.getByTestId('org-settings-general-submit').click();
    await expect.poll(() => patches.length).toBe(3);
    await expect(page.getByTestId('org-legal-name')).toHaveValue('Edited Corp');
    await expect(page.getByTestId('org-legal-address-city')).toHaveValue('Unsaved city');
    await expect(page.getByTestId('org-legal-privacy-email')).toHaveValue('updated@example.com');
    await expect(page.getByTestId('org-legal-submit')).toBeEnabled();
  });

  test('lets a member find the contact through desktop More without granting settings editing', async ({
    page,
    context,
    baseURL,
  }, info) => {
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const api = new ApiMock(page);
    const organization = {
      ...organizationOutput(),
      privacyContactEmail: 'protection-des-donnees-et-demandes@example.org',
    };
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, { permissions: [] });
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/more`);
    const more = page.getByRole('link', { name: 'More', exact: true }).and(page.locator('a'));
    await expect(more).toBeVisible();
    await more.click();
    const contact = page.locator('#organization-more-privacy');
    await expect(contact.getByRole('link')).toHaveAttribute(
      'href',
      `mailto:${organization.privacyContactEmail}`,
    );
    await expect(page.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await captureInteractionMode(page, info, 'legal-profile-contact-desktop-dark');
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/settings`);
    await expect(page).toHaveURL(new RegExp(`/organizations/${E2E_ORGANIZATION_ID}$`));
    await expect(page.getByText('Access denied', { exact: true })).toBeVisible();
    await expect(page.getByTestId('org-legal-submit')).toHaveCount(0);
  });

  test('shows a useful fallback when no privacy contact is provided', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, { permissions: [] });
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/more`);
    const contact = page.locator('#organization-more-privacy');
    await expect(contact).toContainText(
      "No contact provided. Use the organization's usual contact channels.",
    );
    await expect(contact.getByRole('link')).toHaveCount(0);
  });

  test('explains the configured monitoring scope and labels its rate accessibly', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    await api.mockComplianceFacilityTree(E2E_ORGANIZATION_ID, complianceFacilityTreeOutput());
    await api.mockFacilityCompliance(
      E2E_ORGANIZATION_ID,
      E2E_FACILITY_ID,
      complianceSummaryOutput(),
    );
    const explorer = new AssetsExplorerPage(page);
    await explorer.goto(E2E_ORGANIZATION_ID);
    await explorer.openComplianceAxis();
    await explorer.selectComplianceSite('North Building');
    await expect(
      page.getByRole('heading', { name: 'Monitoring summary', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Monitoring status according to the rules configured in this organization.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('progressbar', { name: 'Equipment up-to-date rate' }),
    ).toBeVisible();
    await expect(page.getByText('Up to date', { exact: true }).first()).toBeVisible();
  });
});
