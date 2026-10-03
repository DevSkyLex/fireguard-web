import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID, organizationOutput } from '../support/fixtures/api-fixtures';
import { organizationQuotaOutput } from '../support/fixtures/billing-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { captureInteractionMode, emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';
import { OrganizationSettingsPage } from '../support/pages/organization-settings.page';

test.beforeEach(async ({ context, browserName }) => {
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
});

test('opens the organization contact from mobile More in light theme without settings permission', async ({
  page,
}, info) => {
  const api = new ApiMock(page);
  const organization = {
    ...organizationOutput(),
    privacyContactEmail: 'protection-des-donnees-et-demandes@example.org',
  };
  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, { permissions: [] });
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/more`);
  const navigation = page.locator('#organization-mobile-navigation');
  await expect(navigation).toBeVisible();
  await navigation.getByRole('link', { name: 'More', exact: true }).tap();
  const contact = page.locator('#organization-more-privacy');
  await expect(contact.getByRole('link')).toHaveAttribute(
    'href',
    `mailto:${organization.privacyContactEmail}`,
  );
  await expect(page.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await captureInteractionMode(page, info, 'legal-profile-contact-mobile-light');
});

test('keeps the optional registered office and privacy contact usable on a dark phone', async ({
  page,
  context,
  baseURL,
}, info) => {
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  const api = new ApiMock(page);
  const organization = {
    ...organizationOutput({ legalName: 'Organisation européenne des établissements industriels' }),
    registeredAddress: {
      line1: '128 avenue des Organisations européennes et des établissements industriels',
      line2: 'Bâtiment administratif et bureaux de direction, troisième étage',
      city: 'Strasbourg',
      postalCode: '67000',
      region: 'Grand Est',
      countryCode: 'FR',
    },
    privacyContactEmail: 'protection-des-donnees-et-demandes@example.org',
  };
  await api.mockAuthenticatedSession({ organizations: [organization] });
  await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
  await api.mockOrganizationLegalTypes();
  await new OrganizationSettingsPage(page).goto(E2E_ORGANIZATION_ID);
  await expect(page.getByTestId('org-legal-address-line1')).toHaveValue(
    organization.registeredAddress.line1,
  );
  await page.getByTestId('org-legal-address-line1').scrollIntoViewIfNeeded();
  await expectNoHorizontalOverflow(page);
  await captureInteractionMode(page, info, 'legal-profile-office-mobile-dark');
  await page.getByTestId('org-legal-privacy-email').fill('updated@example.org');
  await expect(page.getByTestId('org-legal-submit')).toBeEnabled();
  await page.getByTestId('org-legal-submit').scrollIntoViewIfNeeded();
  await captureInteractionMode(page, info, 'legal-profile-email-mobile-dark');
});
