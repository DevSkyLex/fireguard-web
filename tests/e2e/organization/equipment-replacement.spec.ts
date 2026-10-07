import { expect, test, type Page, type Route } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  E2E_EQUIPMENT_ID,
  equipmentOutput,
  inStockEquipmentOutput,
} from '../support/fixtures/equipment-fixtures';
import {
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { pagePolishScreenshotDir } from '../support/helpers/screenshot-dir';
import { ApiMock } from '../support/mocks/api-mock';
import { EquipmentsPage } from '../support/pages/equipments.page';

const replacementPath = `/api/organizations/${E2E_ORGANIZATION_ID}/equipment/${E2E_EQUIPMENT_ID}/replace`;

interface ReplacementCommand {
  readonly clientOperationId: string;
  readonly successorEquipmentId?: string;
  readonly successor?: {
    readonly type: string;
    readonly name?: string;
    readonly assetCode?: string;
  };
}

async function receipt(
  route: Route,
  command: ReplacementCommand,
  successorId: string,
  replayed: boolean,
): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      predecessorEquipmentId: E2E_EQUIPMENT_ID,
      successorEquipmentId: successorId,
      clientOperationId: command.clientOperationId,
      replayed,
    }),
  });
}

async function openReplacement(page: Page): Promise<void> {
  const equipment = new EquipmentsPage(page);
  await equipment.gotoDetail(E2E_ORGANIZATION_ID, E2E_EQUIPMENT_ID);
  await expect(equipment.detailRoot).toBeVisible();
  await equipment.moreMenu.click();
  await page.getByTestId('equipment-replace').click();
  await expect(page.getByTestId('equipment-replacement-sheet')).toBeVisible();
}

test.describe('Equipment replacement', () => {
  test('requires final confirmation before replacing equipment from reserve and preserves both dossiers', async ({
    page,
  }, testInfo) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    const old = { ...equipmentOutput(), name: 'Extinguisher EXT-01', assetCode: 'EXT-01' };
    const reserve = {
      ...inStockEquipmentOutput(),
      name: 'Reserve extinguisher',
      assetCode: 'EXT-R02',
    };
    const successor = {
      ...reserve,
      facilityId: old.facilityId,
      facilityName: old.facilityName,
      status: 'operational',
      predecessorEquipmentId: old.id,
    };
    await api.mockEquipmentDetail(E2E_ORGANIZATION_ID, old);
    await api.mockEquipmentDetail(E2E_ORGANIZATION_ID, successor);
    await api.mockEquipmentList(E2E_ORGANIZATION_ID, [reserve]);
    const commands: ReplacementCommand[] = [];
    await page.route(new RegExp(`${replacementPath}(\\?.*)?$`), async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const command = route.request().postDataJSON() as ReplacementCommand;
      commands.push(command);
      await receipt(route, command, reserve.id, false);
    });
    await openReplacement(page);
    const sheet = page.getByTestId('equipment-replacement-sheet');
    await sheet.getByLabel('Successor equipment', { exact: true }).fill('Reserve');
    await page.getByRole('option', { name: /Reserve extinguisher/ }).click();
    await sheet.getByTestId('equipment-replacement-confirm').click();
    const confirmation = page.getByTestId('equipment-replacement-confirm-dialog');
    await expect(confirmation).toBeVisible();
    expect(commands).toEqual([]);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/equipment-replacement-reserve-confirm-light.png`,
      animations: 'disabled',
    });
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(confirmation).toBeHidden();
    await expect(sheet).toBeVisible();
    expect(commands).toEqual([]);
    await sheet.getByTestId('equipment-replacement-confirm').click();
    await page.getByTestId('equipment-replacement-final-confirm').click();
    await expect(sheet).toBeHidden();
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({ successorEquipmentId: reserve.id });
    expect(commands[0]?.clientOperationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(commands[0]).not.toHaveProperty('successor');
    const history = page.getByTestId('equipment-replacement-history');
    await expect(
      history.getByRole('link', { name: 'Open the successor equipment', exact: true }),
    ).toHaveAttribute('href', `/organizations/${E2E_ORGANIZATION_ID}/equipments/${reserve.id}`);
    await history.getByRole('link', { name: 'Open the successor equipment', exact: true }).click();
    await expect(
      page
        .getByTestId('equipment-replacement-history')
        .getByRole('link', { name: 'Open the replaced equipment', exact: true }),
    ).toHaveAttribute('href', `/organizations/${E2E_ORGANIZATION_ID}/equipments/${old.id}`);
  });

  test('replays the exact new-equipment operation after its committed response is lost', async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 812 });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    const old = { ...equipmentOutput(), name: 'Extinguisher EXT-01', assetCode: 'EXT-01' };
    const successorId = 'e2e-equipment-successor';
    await api.mockEquipmentDetail(E2E_ORGANIZATION_ID, old);
    await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
    const commands: ReplacementCommand[] = [];
    let committedOperation: string | undefined;
    let commits = 0;
    await page.route(new RegExp(`${replacementPath}(\\?.*)?$`), async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const command = route.request().postDataJSON() as ReplacementCommand;
      commands.push(command);
      if (!committedOperation) {
        committedOperation = command.clientOperationId;
        commits += 1;
        await route.abort('failed');
        return;
      }
      expect(command.clientOperationId).toBe(committedOperation);
      await receipt(route, command, successorId, true);
    });
    await openReplacement(page);
    const sheet = page.getByTestId('equipment-replacement-sheet');
    await sheet.getByRole('button', { name: 'New equipment', exact: true }).click();
    await sheet.getByTestId('equipment-create-type').click();
    await page.getByRole('option', { name: 'Fire extinguisher', exact: true }).click();
    await sheet.getByTestId('equipment-create-name').fill('Replacement extinguisher');
    await sheet.getByTestId('equipment-create-asset-code').fill('EXT-NEW');
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(sheet);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/equipment-replacement-new-narrow-dark.png`,
      animations: 'disabled',
    });
    await sheet.getByTestId('equipment-create-submit').click();
    await expect(page.getByTestId('equipment-replacement-confirm-dialog')).toBeVisible();
    expect(commands).toEqual([]);
    await page.getByTestId('equipment-replacement-final-confirm').click();
    await expect(sheet.getByText(/The response was lost/)).toBeVisible();
    await expect(sheet.getByTestId('equipment-create-submit')).toBeHidden();
    await expect(sheet.getByTestId('equipment-create-name')).toBeHidden();
    await expect(sheet.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    expect(commands).toHaveLength(1);
    expect(commits).toBe(1);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/equipment-replacement-recovery-narrow-dark.png`,
      animations: 'disabled',
    });
    await sheet.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(sheet).toBeHidden();
    expect(commands).toHaveLength(2);
    expect(commands[1]).toEqual(commands[0]);
    expect(commands[0]?.successor).toMatchObject({
      type: 'fire_extinguisher',
      name: 'Replacement extinguisher',
      assetCode: 'EXT-NEW',
    });
    expect(commands[0]?.successor).not.toHaveProperty('facility');
    expect(commands[0]?.successor).not.toHaveProperty('intervention');
    expect(commits).toBe(1);
    await expect(
      page
        .getByTestId('equipment-replacement-history')
        .getByRole('link', { name: 'Open the successor equipment', exact: true }),
    ).toHaveAttribute('href', `/organizations/${E2E_ORGANIZATION_ID}/equipments/${successorId}`);
  });
});
