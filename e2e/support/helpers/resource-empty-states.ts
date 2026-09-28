import { expect, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { organizationQuotaOutput } from '../fixtures/billing-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { expectNoHorizontalOverflow, expectNoInternalOverflow } from './appearance';

/**
 * Function mockEmptyResources
 * @description Composes existing hermetic collection endpoints; no resource writes are mocked.
 * @access public
 * @since 1.0.0
 * @param {Page} page - Isolated browser page before navigation.
 * @returns {Promise<ApiMock>} Mock facade for permission overrides.
 */
export async function mockEmptyResources(page: Page): Promise<ApiMock> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockEquipmentKpis(E2E_ORGANIZATION_ID, { totalAssets: 0, compliant: 0 });
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockInspectionList(E2E_ORGANIZATION_ID, []);
  await api.mockChecklistList(E2E_ORGANIZATION_ID, []);
  await api.mockMaintenanceScheduleList([]);
  await api.mockInterventionList(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationInvitations(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationRoles(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationTeams(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationQuota(E2E_ORGANIZATION_ID, organizationQuotaOutput());
  return api;
}

/**
 * Function expectResourceIllustration
 * @description Verifies the actual decoded image, decorative semantics, theme and layout bounds.
 * @access public
 * @since 1.0.0
 * @param {Page} page - Settled resource page.
 * @param {string} resource - Expected artwork identifier.
 * @param {'light' | 'dark'} theme - Applied app appearance.
 * @returns {Promise<void>} Assertions over the rendered native Empty region.
 */
export async function expectResourceIllustration(
  page: Page,
  resource: string,
  theme: 'light' | 'dark',
): Promise<void> {
  const media = page
    .getByTestId('resource-illustration')
    .filter({ visible: true })
    .filter({ has: page.locator(`img[src$="/${resource}.svg"]`) });
  const image = media.locator('img');
  await expect(media).toHaveCount(1);
  await expect(media).toHaveAttribute('aria-hidden', 'true');
  await expect(image).toHaveAttribute(
    'src',
    `/assets/illustrations/resources/${theme}/${resource}.svg`,
  );
  await expect(image).toHaveAttribute('alt', '');
  await expect
    .poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0))
    .toBe(true);
  const bounds = await image.boundingBox();
  if (!bounds) throw new Error('The resource illustration has no rendered bounds.');
  expect(bounds.width).toBeGreaterThanOrEqual(150);
  expect(bounds.width).toBeLessThanOrEqual(192);
  expect(bounds.width / bounds.height).toBeCloseTo(1.25, 2);
  await expectNoInternalOverflow(media);
  await expectNoHorizontalOverflow(page);
}

/**
 * Function expectIllustration
 * @description Verifies one named artwork among possibly several illustrated regions on the page:
 * decorative semantics, decoded image, applied theme and the rendered size of its variant.
 * @access public
 * @since 1.1.0
 * @param {Page} page - Settled page.
 * @param {{ catalog: 'resource' | 'state'; name: string; theme: 'light' | 'dark'; size?: 'sm' | 'md' }} artwork - Expected artwork.
 * @returns {Promise<void>} Assertions over the rendered Empty media.
 */
export async function expectIllustration(
  page: Page,
  artwork: {
    catalog: 'resource' | 'state';
    name: string;
    theme: 'light' | 'dark';
    size?: 'sm' | 'md';
  },
): Promise<void> {
  const folder = artwork.catalog === 'resource' ? 'resources' : 'empty-states';
  const media = page
    .getByTestId(`${artwork.catalog}-illustration`)
    .filter({ visible: true })
    .filter({
      has: page.locator(
        `img[src="/assets/illustrations/${folder}/${artwork.theme}/${artwork.name}.svg"]`,
      ),
    });
  const image = media.locator('img');
  await expect(media).toHaveCount(1);
  await expect(media).toHaveAttribute('aria-hidden', 'true');
  await expect(image).toHaveAttribute('alt', '');
  await expect
    .poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0))
    .toBe(true);
  const bounds = await image.boundingBox();
  if (!bounds) throw new Error(`The ${artwork.name} illustration has no rendered bounds.`);
  const [min, max] = artwork.size === 'sm' ? [104, 128] : [150, 192];
  expect(bounds.width).toBeGreaterThanOrEqual(min);
  expect(bounds.width).toBeLessThanOrEqual(max);
  expect(bounds.width / bounds.height).toBeCloseTo(1.25, 2);
  await expectNoHorizontalOverflow(page);
}
