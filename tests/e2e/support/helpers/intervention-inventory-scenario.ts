import { expect, type Locator, type Page } from '@playwright/test';
import { ALL_ORGANIZATION_PERMISSIONS, E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import {
  E2E_INTERVENTION_ID,
  E2E_MEMBER_IRI,
  interventionOutput,
} from '../fixtures/intervention-fixtures';
import { InterventionInventoryApiMock } from '../mocks/intervention-inventory-api-mock';
import { arrangeInterventionTables } from './intervention-detail-tables';
import { readStore } from './offline';

/** Authenticated account identity owns IndexedDB; the organization-member identity is distinct. */
export const ACCOUNT_ID = 'e2e-user-1';

/**
 * Registers canonical workspace reads and quantitative references through published transports.
 * Internal financial permissions are deliberately absent from this ordinary intervention dossier.
 */
export async function arrangeInventory(
  page: Page,
  options: { readonly status?: 'in_progress' | 'published'; readonly canConsume?: boolean } = {},
): Promise<{
  readonly path: string;
  readonly mock: InterventionInventoryApiMock;
}> {
  const mock = new InterventionInventoryApiMock(page);
  const path = await arrangeInterventionTables(page, true, async (api) => {
    await api.mockAuthenticatedSession({ profile: { id: ACCOUNT_ID } });
    await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
      permissions: ALL_ORGANIZATION_PERMISSIONS.filter(
        (permission) =>
          !permission.startsWith('organization.maintenance_cost.') &&
          (options.canConsume !== false ||
            (permission !== 'organization.inventory.consume' &&
              permission !== 'organization.interventions.execute')),
      ),
    });
    await api.mockInterventionDetail(
      interventionOutput({
        name: 'Extinguisher maintenance — parts used',
        type: 'corrective_maintenance',
        status: options.status ?? 'in_progress',
        responsible: E2E_MEMBER_IRI,
        description:
          'Record each physical consumption and retain the declaration until synchronization.',
        workItemsCount: 0,
        completedWorkItemsCount: 0,
        proposedChangesCount: 0,
        facilitiesCount: 0,
        equipmentCount: 0,
        inspectionsCount: 0,
      }),
    );
    await api.mockInterventionWorkItems(E2E_INTERVENTION_ID, []);
    await api.mockInterventionChanges(E2E_INTERVENTION_ID, []);
    await mock.install();
  });
  return { path, mock };
}

/** Opens the lazy secondary dossier and waits for the real complete IndexedDB catalog. */
export async function openPreparedInventory(page: Page): Promise<Locator> {
  const toggle = page.getByTestId('intervention-inventory-toggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  const section = page.getByTestId('intervention-inventory-section');
  await expect(section.getByLabel('Quantity used', { exact: true })).toBeVisible();
  await expect
    .poll(
      async () =>
        (await readStore(page, 'metadata')).some((entry) => {
          const snapshot = entry as Record<string, unknown>;
          return (
            snapshot['version'] === 1 &&
            snapshot['accountId'] === ACCOUNT_ID &&
            snapshot['organizationId'] === E2E_ORGANIZATION_ID &&
            snapshot['interventionId'] === E2E_INTERVENTION_ID &&
            snapshot['catalogComplete'] === true
          );
        }),
      { timeout: 10_000 },
    )
    .toBe(true);
  return section;
}

/** Uses the public searchable reference pickers and exact decimal input. */
export async function fillConsumption(page: Page, section: Locator): Promise<void> {
  await section.getByRole('combobox', { name: 'Part', exact: true }).fill('SEAL');
  await page.getByRole('option', { name: 'Valve seal · SEAL · piece', exact: true }).click();
  await section.getByRole('combobox', { name: 'Warehouse', exact: true }).fill('VAN');
  await page.getByRole('option', { name: 'Service van · VAN', exact: true }).click();
  await section.getByLabel('Quantity used', { exact: true }).fill('0.25');
}

/** Captures stock forms outside disposable runner output so visual evidence survives reruns. */
export async function captureInventory(page: Page, section: Locator, name: string): Promise<void> {
  await section.scrollIntoViewIfNeeded();
  const theme = await page.locator('html').getAttribute('data-theme');
  await page.screenshot({
    path: `tests/e2e/artifacts/intervention-inventory/${page.viewportSize()?.width ?? 0}-${theme}-${name}.png`,
    animations: 'disabled',
  });
}
