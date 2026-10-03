import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  coherenceBuilding,
  coherenceSite,
  facilityChildOutput,
  facilityOutput,
} from '../support/fixtures/facility-fixtures';
import { collectConsoleErrors, expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { FacilitiesPage } from '../support/pages/facilities.page';

const ARTIFACTS = 'tests/e2e/artifacts/facility-coherence-20261003';

test('finds a descendant through server search and shows its ancestor path after a reload', async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const descendant = facilityOutput({
    id: 'coherence-storage',
    '@id': '/api/facilities/coherence-storage',
    type: 'zone',
    parentFacilityId: 'coherence-floor-251',
    name: 'Storage beyond page 200',
    path: [
      { id: 'coherence-site-1', type: 'site', name: 'Site 001' },
      { id: 'coherence-building-251', type: 'building', name: 'Building 251' },
      { id: 'coherence-floor-251', type: 'floor', name: 'Basement' },
    ],
  });
  const requests: URLSearchParams[] = [];
  await api.mockFacilityListResponses(E2E_ORGANIZATION_ID, (query) => {
    requests.push(query);
    return query.get('search') === 'Storage'
      ? { facilities: [descendant] }
      : { facilities: [coherenceSite(1)] };
  });
  const facilities = new FacilitiesPage(page);
  await facilities.gotoList(E2E_ORGANIZATION_ID);
  await expect(facilities.tableRows).toHaveCount(1);
  await facilities.search.fill('Storage');
  await expect(facilities.tableRows).toContainText(descendant.name);
  const ancestorPath = facilities.tableRows.getByTestId('facility-result-path');
  await expect(ancestorPath).toContainText('Site 001');
  await expect(ancestorPath).toContainText('Building 251');
  await expect(ancestorPath).toContainText('Basement');
  const query = requests.find((request) => request.get('search') === 'Storage');
  expect(query?.get('rootsOnly')).not.toBe('true');
  expect(query?.get('includePath')).toBe('true');
  await page.reload();
  await expect(facilities.search).toHaveValue('Storage');
  await expect(facilities.tableRows).toContainText(descendant.name);
  expect(requests.filter((request) => request.get('search') === 'Storage')).toHaveLength(2);
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test('hydrates a preselected parent outside the first 200 results and keeps it selected across server pages and search', async ({
  page,
}, testInfo) => {
  const errors = collectConsoleErrors(page);
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const parents = Array.from({ length: 251 }, (_, index) => coherenceBuilding(index + 1));
  const farParent = parents[250];
  const requests: URLSearchParams[] = [];
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, farParent);
  await api.mockFacilityListResponses(E2E_ORGANIZATION_ID, (query) => {
    requests.push(query);
    if (query.get('rootsOnly') === 'true') return { facilities: [coherenceSite(1)] };
    if (query.get('search') === 'Building 251') return { facilities: [farParent] };
    const pageNumber = Number(query.get('page') ?? 1);
    return {
      facilities: parents.slice((pageNumber - 1) * 200, pageNumber * 200),
      totalItems: parents.length,
    };
  });
  const hydrated = page.waitForResponse((response) =>
    new URL(response.url()).pathname.endsWith(`/facilities/${farParent.id}`),
  );
  const facilities = new FacilitiesPage(page);
  await facilities.gotoCreate(E2E_ORGANIZATION_ID, `&parent=${farParent.id}`);
  await hydrated;
  await facilities.createTypeSelect.click();
  await page.getByRole('option', { name: 'Floor', exact: true }).click();
  const picker = page.locator('#facility-create-parent');
  await expect(picker).toHaveValue(farParent.name);
  await expect(facilities.createRoot.locator('app-facility-option-picker output')).toHaveText(
    '1 / 2',
  );
  await facilities.createRoot.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(facilities.createRoot.locator('app-facility-option-picker output')).toHaveText(
    '2 / 2',
  );
  await expect(picker).toHaveValue(farParent.name);
  const searchResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.endsWith('/facilities') && url.searchParams.get('search') === 'Building 251'
    );
  });
  await picker.fill('Building 251');
  await searchResponse;
  const option = page.getByRole('option', { name: /Building 251.*Building.*Site 001/ });
  await expect(option).toBeVisible();
  await option.click();
  await expect(picker).toHaveValue(farParent.name);
  const filtered = requests.find((query) => query.get('search') === 'Building 251');
  expect(filtered?.get('parentForType')).toBe('floor');
  expect(filtered?.get('includePath')).toBe('true');
  expect(filtered?.get('itemsPerPage')).toBe('200');
  expect(filtered?.get('pagination')).not.toBe('false');
  expect(
    requests.some((query) => query.get('page') === '2' && query.get('parentForType') === 'floor'),
  ).toBe(true);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${ARTIFACTS}/${testInfo.project.name}/parent-hydration.png`,
    animations: 'disabled',
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('retains a chosen move destination after a revision conflict and retries with the refreshed If-Match', async ({
  page,
}, testInfo) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const current = facilityChildOutput({
    id: 'coherence-moving-floor',
    '@id': '/api/facilities/coherence-moving-floor',
    parentFacilityId: 'coherence-building-1',
    name: 'Moving floor',
    revision: 3,
  });
  const destination = coherenceBuilding(251);
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, current);
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, coherenceBuilding(1));
  await api.mockFacilityOverview(E2E_ORGANIZATION_ID, current.id);
  const candidateQueries: URLSearchParams[] = [];
  await api.mockFacilityListResponses(E2E_ORGANIZATION_ID, (query) => {
    candidateQueries.push(query);
    return { facilities: [destination] };
  });
  const facilities = new FacilitiesPage(page);
  await facilities.gotoDetail(E2E_ORGANIZATION_ID, current.id);
  await facilities.moreMenu.click();
  await page.getByTestId('facility-detail-move').click();
  const dialog = page.getByTestId('facility-move-dialog');
  await expect(dialog).toBeVisible();
  const picker = dialog.locator('#facility-move-parent');
  await picker.fill(destination.name);
  await page.getByRole('option', { name: /Building 251.*Site 001/ }).click();
  await expect(picker).toHaveValue(destination.name);
  expect(
    candidateQueries.some(
      (query) =>
        query.get('parentForFacilityId') === current.id && query.get('includePath') === 'true',
    ),
  ).toBe(true);
  await api.mockFacilityDetail(E2E_ORGANIZATION_ID, { ...current, revision: 7 });
  await api.mockFacilityMoveError(E2E_ORGANIZATION_ID, current.id, {
    status: 412,
    detail: 'The facility changed. Review and retry your move.',
  });
  const first = page.waitForRequest(
    (request) =>
      request.method() === 'POST' && request.url().endsWith(`/facilities/${current.id}/move`),
  );
  const refreshed = page.waitForResponse((response) =>
    response.url().endsWith(`/facilities/${current.id}`),
  );
  await page.getByTestId('facility-move-submit').click();
  expect((await first).headers()['if-match']).toBe('"revision-3"');
  expect((await first).postDataJSON()).toEqual({ parentFacilityId: destination.id });
  await refreshed;
  await expect(dialog.getByRole('alert')).toContainText('selected parent is preserved');
  await expect(picker).toHaveValue(destination.name);
  await expect(dialog).toBeVisible();
  await page.screenshot({
    path: `${ARTIFACTS}/${testInfo.project.name}/move-conflict-retained.png`,
    animations: 'disabled',
    fullPage: true,
  });
  await api.mockFacilityMove(E2E_ORGANIZATION_ID, current.id, {
    ...current,
    parentFacilityId: destination.id,
    revision: 8,
  });
  const second = page.waitForRequest(
    (request) =>
      request.method() === 'POST' && request.url().endsWith(`/facilities/${current.id}/move`),
  );
  await page.getByTestId('facility-move-submit').click();
  expect((await second).headers()['if-match']).toBe('"revision-7"');
  expect((await second).postDataJSON()).toEqual({ parentFacilityId: destination.id });
  await expect(dialog).toBeHidden();
});
