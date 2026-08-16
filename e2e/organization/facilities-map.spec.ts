import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { complianceTreeNodeOutput, facilityOutput } from '../support/fixtures/facility-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { FacilitiesPage } from '../support/pages/facilities.page';

/** A 1×1 transparent PNG, standing in for the OpenFreeMap sprite image. */
const BLANK_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

/**
 * Facilities map e2e coverage.
 *
 * Every OpenFreeMap request is route-blocked so the suite stays hermetic and
 * offline-safe (`e2e.md`): the self-hosted style JSON under `public/map/` is
 * same-origin and loads normally. The sprite atlas is fulfilled with an
 * empty-but-valid stand-in rather than aborted, since MapLibre treats a
 * failed sprite fetch as fatal to `map.on('load')`; vector tiles and glyph
 * fonts are genuinely aborted, and MapLibre logs a network error for each —
 * expected here, not a defect — so the dark-mode console-error assertion
 * filters those specific messages rather than asserting a bare empty array.
 *
 * Marker rendering itself is asserted only in the unit spec
 * (`FacilityMapPage`, with `@shared/map`'s `Map` stubbed): the e2e dev
 * server's Vite pre-bundling does not resolve `maplibre-gl`'s clustering
 * worker (`maplibre-gl-worker.mjs` — a warning MapLibre itself logs), so the
 * GeoJSON source used for markers never finishes clustering in this
 * environment even though the map canvas itself mounts and renders
 * correctly. That is a `@shared/map`/build-tooling gap, not a facilities
 * defect — this suite covers what it can prove here: the map surface mounts
 * and paints without throwing.
 */
test.describe('Facility map', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**tiles.openfreemap.org**', (route) => route.abort());
    await page.route('**tiles.openfreemap.org/sprites/**.json', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.route('**tiles.openfreemap.org/sprites/**.png', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from(BLANK_PNG_BASE64, 'base64'),
      });
    });
  });

  test('navigates from the list toggle to the map route', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    await api.mockFacilityMap(E2E_ORGANIZATION_ID, [facilityOutput()]);
    const facilities = new FacilitiesPage(page);

    await facilities.gotoList(E2E_ORGANIZATION_ID);
    await facilities.listMapToggle.click();

    await expect(page).toHaveURL(new RegExp(`/facilities/map$`));
    await expect(facilities.mapRoot).toBeVisible();
  });

  test('mounts the map for a located facility', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityMap(E2E_ORGANIZATION_ID, [facilityOutput()]);
    const facilities = new FacilitiesPage(page);

    await facilities.gotoMap(E2E_ORGANIZATION_ID);

    await expect(facilities.mapRoot).toBeVisible();
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    await expect(facilities.mapUnplacedBanner).toBeHidden();
  });

  test('shows the unplaced-facilities banner linking back to the list', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityMap(E2E_ORGANIZATION_ID, [facilityOutput()], 3);
    const facilities = new FacilitiesPage(page);

    await facilities.gotoMap(E2E_ORGANIZATION_ID);

    await expect(facilities.mapUnplacedBanner).toBeVisible();
    await expect(facilities.mapUnplacedBanner).toContainText('3');
  });

  test('shows the empty state instead of the map when no facility has coordinates', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityMap(E2E_ORGANIZATION_ID, [], 0);
    const facilities = new FacilitiesPage(page);

    await facilities.gotoMap(E2E_ORGANIZATION_ID);

    await expect(page.locator('app-empty-state')).toBeVisible();
    await expect(facilities.mapMarkers).toHaveCount(0);
  });

  test('renders at 375px in dark mode with no console errors beyond the blocked tiles', async ({
    page,
    context,
    baseURL,
  }) => {
    const consoleErrors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 800 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityMap(E2E_ORGANIZATION_ID, [facilityOutput()]);
    const facilities = new FacilitiesPage(page);

    await facilities.gotoMap(E2E_ORGANIZATION_ID);

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(facilities.mapRoot).toBeVisible();
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const unexpected = consoleErrors.filter((message) => !/tile|ajax|fetch|network/i.test(message));
    expect(unexpected, unexpected.join('\n')).toEqual([]);
  });

  test.describe('the compliance layer', () => {
    /**
     * Marker content (bucket colour, label text) is asserted only in the
     * `FacilityMapPage` unit spec, for the same reason noted at the top of
     * this file: the e2e dev/e2e build never finishes clustering the
     * GeoJSON marker source in this environment. This suite covers what it
     * can prove here — the toggle loads the compliance tree lazily and the
     * "worst sites" ranking, a plain DOM list, renders and is interactive.
     */
    test('lazily loads the compliance tree and reveals the worst sites ranking on toggle-on', async ({
      page,
    }) => {
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await api.mockFacilityMap(E2E_ORGANIZATION_ID, [facilityOutput()]);
      await api.mockComplianceTree(E2E_ORGANIZATION_ID, [
        complianceTreeNodeOutput({ complianceRate: 28 }),
      ]);
      const facilities = new FacilitiesPage(page);

      await facilities.gotoMap(E2E_ORGANIZATION_ID);
      await expect(facilities.mapWorstSites).toBeHidden();

      await facilities.mapComplianceToggle.click();

      await expect(facilities.mapWorstSites).toBeVisible();
      await expect(facilities.mapWorstSiteRows).toHaveCount(1);
      await expect(facilities.mapWorstSiteRows.first()).toContainText('28');
    });

    test('navigates to the facility record when a worst-site entry is selected', async ({
      page,
    }) => {
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await api.mockFacilityMap(E2E_ORGANIZATION_ID, [facilityOutput()]);
      await api.mockComplianceTree(E2E_ORGANIZATION_ID, [
        complianceTreeNodeOutput({ complianceRate: 28 }),
      ]);
      const facilities = new FacilitiesPage(page);

      await facilities.gotoMap(E2E_ORGANIZATION_ID);
      await facilities.mapComplianceToggle.click();
      await facilities.mapWorstSiteRows.first().click();

      await expect(page).toHaveURL(new RegExp(`/facilities/${facilityOutput().id}$`));
    });

    test('renders the compliance layer at 375px in dark mode with no console errors beyond the blocked tiles', async ({
      page,
      context,
      baseURL,
    }) => {
      const consoleErrors = collectConsoleErrors(page);
      await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      await page.setViewportSize({ width: 375, height: 800 });

      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await api.mockFacilityMap(E2E_ORGANIZATION_ID, [facilityOutput()]);
      await api.mockComplianceTree(E2E_ORGANIZATION_ID, [
        complianceTreeNodeOutput({ complianceRate: 28 }),
      ]);
      const facilities = new FacilitiesPage(page);

      await facilities.gotoMap(E2E_ORGANIZATION_ID);
      await facilities.mapComplianceToggle.click();

      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(facilities.mapWorstSites).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const unexpected = consoleErrors.filter(
        (message) => !/tile|ajax|fetch|network/i.test(message),
      );
      expect(unexpected, unexpected.join('\n')).toEqual([]);
    });
  });

  test.describe('the "Pick on map" picker', () => {
    test('opens from the create form and keeps the coordinate inputs editable', async ({
      page,
    }) => {
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
      const facilities = new FacilitiesPage(page);

      await facilities.gotoCreate(E2E_ORGANIZATION_ID);
      await facilities.createPickOnMap.click();

      await expect(facilities.pickerDialog).toBeVisible();
      await expect(facilities.pickerMap).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(facilities.pickerDialog).toBeHidden();

      await facilities.createLatitude.fill('48.85');
      await facilities.createLongitude.fill('2.35');
      await expect(facilities.createLatitude).toHaveValue('48.85');
      await expect(facilities.createLongitude).toHaveValue('2.35');
    });
  });
});
