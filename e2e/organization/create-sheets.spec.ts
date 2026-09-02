import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { equipmentOutput } from '../support/fixtures/equipment-fixtures';
import { E2E_FACILITY_ID, facilityOutput } from '../support/fixtures/facility-fixtures';
import { expectSheetGuardHolds } from '../support/helpers/sheet-guard';
import { ApiMock } from '../support/mocks/api-mock';
import { EquipmentsPage } from '../support/pages/equipments.page';
import { FacilitiesPage } from '../support/pages/facilities.page';
import { InspectionsPage } from '../support/pages/inspections.page';

/*
 * Facilities, equipment and inspections are created in a sheet on their list,
 * like interventions: the "New …" button opens it, `?create=1` opens it on
 * arrival (with `?parent=` / `?facility=` scoping it), the retired `/create`
 * segment redirects there, and a dirty draft confirms before it is lost.
 */
test.describe('Creation sheets', () => {
  test('the facility list opens its sheet from the header button and guards a dirty draft', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    const facilities = new FacilitiesPage(page);

    await facilities.gotoList(E2E_ORGANIZATION_ID);
    await expect(facilities.createRoot).toBeHidden();

    await facilities.newLink.click();
    await expect(facilities.createRoot).toBeVisible();

    await facilities.createName.click();
    await facilities.createName.pressSequentially('South Wing');

    await expectSheetGuardHolds(page, facilities.createRoot, () => page.keyboard.press('Escape'));
  });

  test('the retired /facilities/create route redirects to the list with the sheet open and the parent kept', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);

    await page.goto(
      `/organizations/${E2E_ORGANIZATION_ID}/facilities/create?parent=${E2E_FACILITY_ID}`,
    );

    await expect(page).toHaveURL(new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/facilities`));
    await expect(page).not.toHaveURL(/create=1/);
    await expect(page.getByTestId('facility-create-sheet')).toBeVisible();
    await expect(page.locator('#facility-create-parent')).toHaveValue(facilityOutput().name);
  });

  test('the equipment list opens its sheet on ?create=1', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockEquipmentList(E2E_ORGANIZATION_ID, [equipmentOutput()]);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, [facilityOutput()]);
    const equipments = new EquipmentsPage(page);

    await equipments.gotoCreate(E2E_ORGANIZATION_ID);

    await expect(equipments.createRoot).toBeVisible();
    await expect(equipments.createTypeSelect).toBeVisible();
  });

  test('the inspection list opens its sheet on ?create=1 with the equipment combobox loaded', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInspectionList(E2E_ORGANIZATION_ID, []);
    await api.mockEquipmentList(E2E_ORGANIZATION_ID, [equipmentOutput()]);
    const inspections = new InspectionsPage(page);

    await inspections.gotoCreate(E2E_ORGANIZATION_ID);

    await expect(inspections.createRoot).toBeVisible();
    await expect(inspections.createEquipmentCombobox).toBeVisible();
  });
});
