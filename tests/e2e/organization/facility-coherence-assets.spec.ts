import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { equipmentOutput } from '../support/fixtures/equipment-fixtures';
import { coherenceBuilding, coherenceSite } from '../support/fixtures/facility-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { AssetsExplorerPage } from '../support/pages/assets-explorer.page';
import { FacilitiesPage } from '../support/pages/facilities.page';

const ARTIFACTS = 'tests/e2e/artifacts/facility-coherence-20261003';

test('loads later root and branch pages after recoverable failures and deduplicates previously rendered nodes', async ({
  page,
}, testInfo) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const roots = Array.from({ length: 101 }, (_, index) => coherenceSite(index + 1));
  const children = Array.from({ length: 101 }, (_, index) => coherenceBuilding(index + 1));
  let rootAppendAttempts = 0;
  let childAppendAttempts = 0;
  const rootQueries: URLSearchParams[] = [];
  const childQueries: URLSearchParams[] = [];
  await api.mockFacilityListResponses(E2E_ORGANIZATION_ID, (query) => {
    rootQueries.push(query);
    if (query.get('page') === '2') {
      rootAppendAttempts++;
      return rootAppendAttempts === 1
        ? {
            facilities: [],
            totalItems: 101,
            status: 500,
            errorDetail: 'The next root page is temporarily unavailable.',
          }
        : { facilities: [roots[99], roots[100]], totalItems: 101 };
    }
    return { facilities: roots.slice(0, 100), totalItems: 101 };
  });
  await api.mockFacilityChildrenResponses(E2E_ORGANIZATION_ID, roots[0].id, (query) => {
    childQueries.push(query);
    if (query.get('page') === '2') {
      childAppendAttempts++;
      return childAppendAttempts === 1
        ? {
            facilities: [],
            totalItems: 101,
            status: 500,
            errorDetail: 'The next branch page is temporarily unavailable.',
          }
        : { facilities: [children[99], children[100]], totalItems: 101 };
    }
    return { facilities: children.slice(0, 100), totalItems: 101 };
  });
  const assets = new AssetsExplorerPage(page);
  await assets.goto(E2E_ORGANIZATION_ID);
  await expect(assets.treeItems).toHaveCount(100);
  const moreRoots = page.getByTestId('assets-load-more-roots');
  await moreRoots.click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Could not load more places' }),
  ).toBeVisible();
  await expect(assets.treeItems).toHaveCount(100);
  await moreRoots.click();
  await expect(assets.treeItems).toHaveCount(101);
  await expect(assets.treeItems.filter({ hasText: roots[100].name })).toHaveCount(1);
  await expect(moreRoots).toBeHidden();
  const firstRoot = page.locator(`[data-tree-id="${roots[0].id}"]`);
  await firstRoot.getByTestId('tree-toggle').click();
  await expect(assets.treeItems).toHaveCount(201);
  const moreChildren = page.getByTestId(`assets-load-more-children-${roots[0].id}`);
  await moreChildren.click();
  await expect(firstRoot.getByTestId('tree-retry')).toBeVisible();
  await expect(assets.treeItems).toHaveCount(201);
  await firstRoot.getByTestId('tree-retry').click();
  await expect(assets.treeItems).toHaveCount(202);
  await expect(assets.treeItems.filter({ hasText: children[100].name })).toHaveCount(1);
  await expect(moreChildren).toBeHidden();
  expect(rootQueries.filter((query) => query.get('page') === '2')).toHaveLength(2);
  expect(childQueries.filter((query) => query.get('page') === '2')).toHaveLength(2);
  expect(
    rootQueries.every(
      (query) =>
        query.get('itemsPerPage') === '100' &&
        query.get('rootsOnly') === 'true' &&
        query.get('includePath') === 'true',
    ),
  ).toBe(true);
  expect(
    childQueries.every(
      (query) => query.get('itemsPerPage') === '100' && query.get('includePath') === 'true',
    ),
  ).toBe(true);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACTS}/${testInfo.project.name}/tree-pagination-retry.png`,
    animations: 'disabled',
    fullPage: true,
  });
});

test('uses the exact 251-item subtree summary and preserves direct or subtree scope in Assets links and reloads', async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
  const errors = collectConsoleErrors(page);
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const site = coherenceSite(1, { hasChildren: false });
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, site);
  await api.mockFacilityOverview(E2E_ORGANIZATION_ID, site.id);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, [site]);
  await api.mockInspectionList(E2E_ORGANIZATION_ID, []);
  const direct = equipmentOutput({
    id: 'coherence-direct-equipment',
    serialNumber: 'SN-DIRECT',
    facilityId: site.id,
    facilityName: site.name,
  });
  const descendant = equipmentOutput({
    id: 'coherence-descendant-equipment',
    serialNumber: 'SN-DESCENDANT',
    facilityId: 'coherence-building-251',
    facilityName: 'Building 251',
  });
  const requests: { kind: string; query: URLSearchParams }[] = [];
  await api.mockFacilityEquipmentScopes(
    E2E_ORGANIZATION_ID,
    site.id,
    {
      direct: {
        equipment: [direct],
        totalItems: 1,
        byStatus: { operational: 1, in_stock: 0, under_maintenance: 0, decommissioned: 0 },
        needingAttentionCount: 0,
      },
      subtree: {
        equipment: [direct, descendant],
        totalItems: 251,
        byStatus: { operational: 249, in_stock: 0, under_maintenance: 1, decommissioned: 1 },
        needingAttentionCount: 2,
      },
    },
    (kind, query) => requests.push({ kind, query }),
  );
  const facilities = new FacilitiesPage(page);
  await facilities.gotoDetail(E2E_ORGANIZATION_ID, site.id);
  await expect(page.getByTestId('facility-detail-metrics')).toContainText('251');
  await expect(page.getByTestId('facility-detail-equipment-status')).toContainText('249');
  expect(requests.filter((request) => request.kind === 'equipment')).toHaveLength(0);
  const seeAll = page.getByTestId('facility-detail-equipment-status-link');
  await expect(seeAll).toHaveAttribute(
    'href',
    `/organizations/${E2E_ORGANIZATION_ID}/assets?facility=${site.id}&equipmentScope=subtree`,
  );
  await page.getByRole('button', { name: 'Assigned directly', exact: true }).click();
  await expect(page.getByTestId('facility-detail-metrics')).not.toContainText('251');
  await expect(seeAll).toHaveAttribute(
    'href',
    `/organizations/${E2E_ORGANIZATION_ID}/assets?facility=${site.id}&equipmentScope=direct`,
  );
  await seeAll.click();
  const assets = new AssetsExplorerPage(page);
  await expect(assets.root).toBeVisible();
  await expect(page.getByTestId('assets-equipment-scope-direct')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(assets.equipmentRows).toHaveCount(1);
  await expect(assets.equipmentRows).toContainText('SN-DIRECT');
  await page.getByTestId('assets-equipment-scope-subtree').click();
  await expect(page).toHaveURL(/equipmentScope=subtree/);
  await expect(assets.equipmentRows).toHaveCount(2);
  await expect(assets.equipmentRows.filter({ hasText: 'SN-DESCENDANT' })).toHaveCount(1);
  await expect(page.locator('#assets-equipment-title')).toContainText('251');
  await page.reload();
  await expect(page.getByTestId('assets-equipment-scope-subtree')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(assets.equipmentRows).toHaveCount(2);
  expect(
    requests.some(
      (request) =>
        request.kind === 'equipment' && request.query.get('includeDescendants') === 'false',
    ),
  ).toBe(true);
  expect(
    requests.filter(
      (request) =>
        request.kind === 'equipment' && request.query.get('includeDescendants') === 'true',
    ).length,
  ).toBeGreaterThanOrEqual(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACTS}/${testInfo.project.name}/equipment-scope-dark-narrow.png`,
    animations: 'disabled',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
