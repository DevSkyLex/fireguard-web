import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { equipmentOutput } from '../support/fixtures/equipment-fixtures';
import {
  E2E_FACILITY_ID,
  facilityAttachmentOutput,
  facilityChildOutput,
  facilityOutput,
  facilityPlanOverlayOutput,
  facilityZoneCandidateOutput,
} from '../support/fixtures/facility-fixtures';
import { collectConsoleErrors } from '../support/helpers/appearance';
import { expectCriticalActionVisible } from '../support/helpers/critical-visibility';
import { captureInteractionMode, emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';
import { FacilitiesPage } from '../support/pages/facilities.page';

test.use({ viewport: { width: 390, height: 844 } });

for (const choice of [
  { picker: 'draw-zone', candidate: 'Break Room', destination: 'enter-coordinates' },
  { picker: 'place-pin', candidate: 'Corridor A, 2nd floor', destination: 'enter-position' },
]) {
  test(`moves focus to the enabled ${choice.destination} action after the mobile picker closes`, async ({
    page,
    context,
    browserName,
  }, info) => {
    await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
    const errors = collectConsoleErrors(page);
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityDetail(E2E_ORGANIZATION_ID, facilityOutput({ hasChildren: true }));
    await api.mockFacilityOverview(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, {
      equipment: [equipmentOutput()],
    });
    await api.mockFacilityPlans(E2E_FACILITY_ID, [facilityAttachmentOutput()]);
    await api.mockFacilityPlanOverlay(
      E2E_ORGANIZATION_ID,
      E2E_FACILITY_ID,
      facilityPlanOverlayOutput(),
    );
    await api.mockFacilityChildren(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [
      facilityChildOutput(),
      facilityZoneCandidateOutput(),
    ]);
    await api.mockFacilityDescendants(E2E_ORGANIZATION_ID, E2E_FACILITY_ID, [
      facilityChildOutput(),
    ]);
    const facilities = new FacilitiesPage(page);
    await facilities.gotoDetail(E2E_ORGANIZATION_ID, E2E_FACILITY_ID);
    await facilities.plansTab.click();
    await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    const picker = page.getByTestId(`facility-plan-editor-${choice.picker}-picker`);
    await picker.focus();
    await picker.press('Enter');
    const drawer = page.getByTestId(`facility-plan-editor-${choice.picker}-drawer`);
    const candidate = drawer.getByRole('button', { name: new RegExp(choice.candidate) });
    await expectCriticalActionVisible(candidate);
    await candidate.focus();
    await candidate.press('Enter');
    await expect(drawer).toHaveCount(0);
    await expect(picker).toBeDisabled();
    const destination = page.getByTestId(`facility-plan-editor-${choice.destination}`);
    await expect(destination).toBeEnabled();
    await expect(destination).toBeFocused();
    await expectCriticalActionVisible(destination);
    await captureInteractionMode(page, info, `plan-focus-${choice.destination}`);
    await page.getByTestId('facility-plan-editor-cancel').click();
    await expect(picker).toBeEnabled();
    await expect(page.getByTestId('facility-plan-editor-status')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
