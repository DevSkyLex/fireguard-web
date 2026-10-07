import { expect, test, type Route } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { pagePolishScreenshotDir } from '../support/helpers/screenshot-dir';
import { ApiMock } from '../support/mocks/api-mock';
import { EquipmentCatalogPage } from '../support/pages/equipment-catalog.page';

interface CatalogueEntry {
  readonly '@id': string;
  readonly '@type': string;
  readonly value: string;
  readonly label: string;
  readonly family: 'fire' | 'safety' | 'other';
  readonly archived: boolean;
  readonly revision: number;
}

const cataloguePath = `/api/organizations/${E2E_ORGANIZATION_ID}/equipment-types`;

function seed(): CatalogueEntry {
  return {
    '@id': `${cataloguePath}/fire_extinguisher`,
    '@type': 'EquipmentType',
    value: 'fire_extinguisher',
    label: 'Fire extinguisher',
    family: 'fire',
    archived: false,
    revision: 1,
  };
}

async function json(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({ status, contentType: 'application/ld+json', body: JSON.stringify(body) });
}

test.describe('Equipment catalogue', () => {
  test('creates a safety type and archives then restores it using the reviewed revision', async ({
    page,
  }, testInfo) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    const entries: CatalogueEntry[] = [seed()];
    await api.mockEquipmentTypeCatalog(E2E_ORGANIZATION_ID, entries);
    const commands: unknown[] = [];
    await page.route(new RegExp(`${cataloguePath}(\\?.*)?$`), async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      const input = route.request().postDataJSON() as {
        value: string;
        label: string;
        family: CatalogueEntry['family'];
      };
      commands.push(input);
      const created: CatalogueEntry = {
        ...input,
        '@id': `${cataloguePath}/${input.value}`,
        '@type': 'EquipmentType',
        archived: false,
        revision: 1,
      };
      entries.push(created);
      await json(route, 201, created);
    });
    await page.route(new RegExp(`${cataloguePath}/gas_sensor(\\?.*)?$`), async (route) => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      const input = route.request().postDataJSON() as { revision: number; archived: boolean };
      commands.push(input);
      const index = entries.findIndex((entry) => entry.value === 'gas_sensor');
      const current = entries[index];
      if (!current) throw new Error('Missing created catalogue descriptor');
      expect(input.revision).toBe(current.revision);
      const updated = { ...current, archived: input.archived, revision: current.revision + 1 };
      entries[index] = updated;
      await json(route, 200, updated);
    });
    const catalogue = new EquipmentCatalogPage(page);
    await catalogue.goto(E2E_ORGANIZATION_ID);
    await expect(catalogue.title).toBeVisible();
    await catalogue.create('gas_sensor', 'Gas sensor', 'Safety');
    await expect(catalogue.editor).toBeHidden();
    await expect(catalogue.row('gas_sensor')).toContainText('Safety');
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/equipment-catalog-desktop-light.png`,
      animations: 'disabled',
    });
    await catalogue.row('gas_sensor').getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(catalogue.row('gas_sensor')).toHaveCount(0);
    await catalogue.archived.click();
    await expect(catalogue.row('gas_sensor')).toBeVisible();
    await catalogue.row('gas_sensor').getByRole('button', { name: 'Restore', exact: true }).click();
    await expect(catalogue.row('gas_sensor')).toHaveCount(0);
    await catalogue.active.click();
    await expect(catalogue.row('gas_sensor')).toBeVisible();
    expect(commands).toEqual([
      { value: 'gas_sensor', label: 'Gas sensor', family: 'safety' },
      { revision: 1, archived: true },
      { revision: 2, archived: false },
    ]);
  });

  test('preserves a rejected draft while reviewing a concurrent catalogue revision', async ({
    page,
  }, testInfo) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    const entries: CatalogueEntry[] = [
      { ...seed(), value: 'fire_blanket', label: 'Fire blanket', revision: 3 },
    ];
    await api.mockEquipmentTypeCatalog(E2E_ORGANIZATION_ID, entries);
    const commands: unknown[] = [];
    await page.route(new RegExp(`${cataloguePath}/fire_blanket(\\?.*)?$`), async (route) => {
      if (route.request().method() !== 'PATCH') return route.fallback();
      const input = route.request().postDataJSON() as {
        revision: number;
        label: string;
        family: CatalogueEntry['family'];
      };
      commands.push(input);
      if (commands.length === 1) {
        entries[0] = { ...entries[0], label: 'Fire blanket revised elsewhere', revision: 4 };
        await json(route, 409, {
          status: 409,
          title: 'Conflict',
          detail: 'Equipment type revision changed.',
        });
        return;
      }
      expect(input.revision).toBe(4);
      entries[0] = { ...entries[0], label: input.label, family: input.family, revision: 5 };
      await json(route, 200, entries[0]);
    });
    const catalogue = new EquipmentCatalogPage(page);
    await catalogue.goto(E2E_ORGANIZATION_ID);
    await catalogue.edit('fire_blanket');
    await expect(catalogue.code).toBeDisabled();
    await catalogue.name.fill('My retained blanket name');
    await catalogue.editor.getByRole('button', { name: 'Save type', exact: true }).click();
    await expect(
      catalogue.editor.getByText('Equipment type revision changed.', { exact: true }),
    ).toBeVisible();
    await expect(catalogue.name).toHaveValue('My retained blanket name');
    await catalogue.editor
      .getByRole('button', { name: 'Review latest revision', exact: true })
      .click();
    await expect(catalogue.editor.getByText(/Fire blanket revised elsewhere/)).toBeVisible();
    await expect(catalogue.name).toHaveValue('My retained blanket name');
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/equipment-catalog-conflict-editor-light.png`,
      animations: 'disabled',
    });
    await catalogue.editor.getByRole('button', { name: 'Save type', exact: true }).click();
    await expect(catalogue.editor).toBeHidden();
    await expect(catalogue.row('fire_blanket')).toContainText('My retained blanket name');
    expect(commands).toEqual([
      { revision: 3, label: 'My retained blanket name', family: 'fire' },
      { revision: 4, label: 'My retained blanket name', family: 'fire' },
    ]);
  });

  test('keeps the catalogue editor readable and keyboard operable on a narrow dark desktop viewport', async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    const errors = collectConsoleErrors(page);
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 812 });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockEquipmentTypeCatalog(E2E_ORGANIZATION_ID, [seed()]);
    const catalogue = new EquipmentCatalogPage(page);
    await catalogue.goto(E2E_ORGANIZATION_ID);
    await catalogue.newType.click();
    await catalogue.code.fill('smoke_sensor');
    await catalogue.name.fill('Smoke sensor for the north building and service corridor');
    await expect(catalogue.editor).toBeVisible();
    await catalogue.code.focus();
    await page.keyboard.press('Tab');
    await expect(catalogue.name).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(catalogue.editor);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/equipment-catalog-editor-narrow-dark.png`,
      animations: 'disabled',
    });
    await catalogue.editor.getByRole('button', { name: 'Cancel', exact: true }).click();
    const discard = page.getByRole('alertdialog');
    await expect(discard).toBeVisible();
    await discard.getByRole('button', { name: /cancel/i }).click();
    await expect(catalogue.name).toHaveValue(
      'Smoke sensor for the north building and service corridor',
    );
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
