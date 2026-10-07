import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { expectMinimumCssPixels, setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import {
  captureServiceRequest,
  installServiceRequests,
  SERVICE_REQUEST_EQUIPMENT_LABEL,
  SERVICE_REQUEST_ID,
  SERVICE_REQUEST_SITE_NAME,
} from '../support/helpers/service-requests';
import { ServiceRequestsPage } from '../support/pages/service-requests.page';

for (const dark of [false, true]) {
  test(`keeps site qualification and uncertain conversion recovery reachable by touch in ${dark ? 'dark' : 'light'} mode`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    await emulateMobilePlatform(context, info.project.name.includes('Safari') ? 'ios' : 'android');
    if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const state = await installServiceRequests(page, { loseConversionResponse: true });
    const requests = new ServiceRequestsPage(page);
    await requests.goto(E2E_ORGANIZATION_ID);
    await requests.prepareSiteRequest(
      SERVICE_REQUEST_SITE_NAME,
      'Damaged extinguisher gauge at the main fire-safety entrance',
      'Identify the equipment during qualification, retain this site report, then explicitly organize its repair.',
    );
    await captureServiceRequest(page, info, `mobile-site-description-${dark ? 'dark' : 'light'}`);
    await requests.submitRequest();
    await expect(requests.editor).toBeHidden();
    await requests.prepareSiteQualification(
      SERVICE_REQUEST_EQUIPMENT_LABEL,
      'Repair the damaged gauge.',
    );
    await captureServiceRequest(
      page,
      info,
      `mobile-equipment-qualification-${dark ? 'dark' : 'light'}`,
    );
    await requests.confirmQualification();
    await expect(requests.editor).toBeHidden();
    await requests.prepareConversion();
    await requests.confirmConversion();
    await expect(requests.retryConversion).toBeVisible();
    await requests.retryConversion.scrollIntoViewIfNeeded();
    const bounds = await requests.retryConversion.boundingBox();
    if (!bounds) throw new Error('The conversion recovery action must have visible touch bounds.');
    expectMinimumCssPixels(bounds.height, 44);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('A mobile project must supply its device viewport.');
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
    await captureServiceRequest(
      page,
      info,
      `mobile-conversion-recovery-${dark ? 'dark' : 'light'}`,
    );
    await requests.retryConversion.tap();
    await expect(requests.editor).toBeHidden();
    await expect(requests.correctiveLink).toBeVisible();
    expect(state.conversions).toHaveLength(2);
    expect(state.conversions[1]).toEqual(state.conversions[0]);
    expect(state.committedLinks).toBe(1);
    expect(state.newWorkCreated).toBe(1);
    expect(state.requests.get(SERVICE_REQUEST_ID)?.status).toBe('converted');
    await captureServiceRequest(page, info, `mobile-converted-dossier-${dark ? 'dark' : 'light'}`);
  });
}
