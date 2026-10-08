import { expect, test } from '@playwright/test';
import {
  captureMaintenanceCosts,
  installMaintenanceCosts,
  MAINTENANCE_COST_EXPENSE_ID,
  MAINTENANCE_COST_URL,
} from '../support/helpers/maintenance-costs';

test.describe('Private maintenance financial dossier', () => {
  test('saves revision-zero preparation with exact amounts and only the applicable resource tuple', async ({
    page,
  }, info) => {
    const state = await installMaintenanceCosts(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(MAINTENANCE_COST_URL);
    await expect(
      page.getByRole('heading', { name: 'Maintenance costs', exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('maintenance-current-total')).toHaveText('Unknown');
    expect(state.currencyReads).toEqual([]);
    expect(state.rateReads).toEqual([]);
    const preparation = page.getByTestId('maintenance-planning-form');
    await preparation.getByLabel('Planned budget', { exact: true }).fill('9007199254740993.123456');
    await preparation.getByRole('button', { name: 'Add estimated resource', exact: true }).click();
    await preparation.getByLabel('Description', { exact: true }).fill('Repair supplies');
    await preparation.getByLabel('Quantity', { exact: true }).fill('2');
    await preparation.getByLabel('Unit or hourly amount', { exact: true }).fill('50.000000');
    await preparation.getByLabel('Resource type', { exact: true }).click();
    await page.getByRole('option', { name: 'Work time', exact: true }).click();
    await expect(page.getByRole('option', { name: 'Work time', exact: true })).toBeHidden();
    await expect(preparation.getByLabel('Resource type', { exact: true })).toContainText(
      'Work time',
    );
    await preparation
      .getByRole('group', { name: 'Estimated resource', exact: true })
      .getByLabel('Estimated minutes', { exact: true })
      .fill('60');
    await captureMaintenanceCosts(page, info, 'preparation-exact-time');
    await preparation
      .getByRole('button', { name: 'Save financial preparation', exact: true })
      .click();
    await expect.poll(() => state.preparations.length).toBe(1);
    expect(state.preparations[0]).toEqual({
      ifMatch: '"revision-0"',
      body: {
        plannedBudget: '9007199254740993.123456',
        estimatedMinutes: null,
        resources: [
          {
            kind: 'time',
            description: 'Repair supplies',
            quantity: null,
            unitCost: '50.000000',
            estimatedMinutes: 60,
            amount: null,
            workItemId: null,
          },
        ],
      },
    });
    await preparation.getByLabel('Resource type', { exact: true }).click();
    await page.getByRole('option', { name: 'External service', exact: true }).click();
    await expect(preparation.getByLabel('Quantity', { exact: true })).toHaveCount(0);
    await expect(preparation.getByLabel('Unit or hourly amount', { exact: true })).toHaveCount(0);
    await preparation.getByLabel('Estimated amount', { exact: true }).fill('7.123456');
    await preparation
      .getByRole('button', { name: 'Save financial preparation', exact: true })
      .click();
    await expect.poll(() => state.preparations.length).toBe(2);
    expect(state.preparations[1]?.body.resources?.[0]).toMatchObject({
      kind: 'external',
      quantity: null,
      unitCost: null,
      estimatedMinutes: null,
      amount: '7.123456',
    });
    expect(state.preparations[1]?.ifMatch).toBe('"revision-1"');
    await captureMaintenanceCosts(page, info, 'preparation-exact-external');
    expect(errors).toEqual([]);
  });
  test('retries a committed expense unchanged then appends a signed adjustment without rewriting closure', async ({
    page,
  }, info) => {
    const state = await installMaintenanceCosts(page, { closed: true, loseExpenseReply: true });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const frozen = structuredClone(state.dossier.frozen);
    await page.goto(MAINTENANCE_COST_URL);
    const expense = page.getByTestId('maintenance-expense-form');
    await expect(page.getByTestId('maintenance-frozen-total')).toHaveText('10.000000 EUR');
    await expense.getByLabel('Exact amount', { exact: true }).fill('2.123456');
    await expense.getByLabel('Actual date and time', { exact: true }).fill('2025-01-15T14:30');
    await expense
      .getByLabel('Description or correction reason', { exact: true })
      .fill('Repair fee after closure');
    await expense.getByRole('button', { name: 'Record expense', exact: true }).click();
    const retry = page.getByRole('button', { name: 'Retry the original declaration', exact: true });
    await expect(retry).toBeVisible();
    await expect(expense.getByLabel('Exact amount', { exact: true })).toBeDisabled();
    await captureMaintenanceCosts(page, info, 'expense-response-lost');
    await retry.click();
    await expect(retry).toBeHidden();
    await expect(expense.getByLabel('Exact amount', { exact: true })).toHaveValue('');
    expect(state.expenses).toHaveLength(2);
    expect(state.expenses[1]).toEqual(state.expenses[0]);
    expect(state.committedExpenses).toBe(1);
    expect(state.dossier.frozen).toEqual(frozen);
    const current = page.getByTestId('maintenance-cost-facts').first();
    const original = current
      .getByRole('row')
      .filter({ hasText: 'External repair of the entrance' });
    await original.getByRole('button', { name: 'Adjust expense', exact: true }).click();
    await expect(
      expense.getByRole('button', { name: 'Record adjustment', exact: true }),
    ).toBeVisible();
    await expense.getByLabel('Exact amount', { exact: true }).fill('-0.000001');
    await expense.getByLabel('Actual date and time', { exact: true }).fill('2025-01-15T15:30');
    await expense
      .getByLabel('Description or correction reason', { exact: true })
      .fill('Documented refund');
    await expect(expense.getByLabel('Exact amount', { exact: true })).toHaveValue('-0.000001');
    await expect(expense.getByLabel('Actual date and time', { exact: true })).toHaveValue(
      '2025-01-15T15:30',
    );
    await expense.getByRole('button', { name: 'Record adjustment', exact: true }).click();
    await expect.poll(() => state.committedExpenses).toBe(2);
    expect(state.expenses[2]).toMatchObject({
      amount: '-0.000001',
      adjustmentOf: MAINTENANCE_COST_EXPENSE_ID,
      description: 'Documented refund',
    });
    expect(state.dossier.frozen).toEqual(frozen);
    await expect(page.getByTestId('maintenance-frozen-total')).toHaveText('10.000000 EUR');
    await captureMaintenanceCosts(page, info, 'append-only-correction');
    expect(errors).toEqual([]);
  });
  test('keeps finance-read-only settings visible without exposing management controls', async ({
    page,
  }, info) => {
    const state = await installMaintenanceCosts(page, { closed: true, readonly: true });
    await page.goto(MAINTENANCE_COST_URL);
    await expect(page.getByTestId('maintenance-planning-form')).toHaveCount(0);
    await expect(page.getByTestId('maintenance-expense-form')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Currency and hourly rates', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Hourly rate history', exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('maintenance-rate-history')).toContainText(
      '9,007,199,254,740,993.123456 EUR',
    );
    await expect(page.getByRole('button', { name: 'Add rate', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save currency', exact: true })).toHaveCount(0);
    expect(state.currencyReads).toEqual(['GET']);
    expect(state.rateReads).toHaveLength(1);
    await captureMaintenanceCosts(page, info, 'private-readonly-settings');
  });
});
