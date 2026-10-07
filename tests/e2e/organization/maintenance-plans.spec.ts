import { expect, test, type Page, type Route } from '@playwright/test';
import type {
  CreateMaintenancePlanInput,
  MaintenancePlanOutput,
  UpdateMaintenancePlanInput,
} from '@features/organization/features/maintenance-schedules/models';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { E2E_EQUIPMENT_ID, equipmentOutput } from '../support/fixtures/equipment-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { pagePolishScreenshotDir } from '../support/helpers/screenshot-dir';
import { ApiMock } from '../support/mocks/api-mock';
import { MaintenancePlansPage } from '../support/pages/maintenance-plans.page';

const planPath: string = `/api/organizations/${E2E_ORGANIZATION_ID}/maintenance/plans`;
const equipmentName: string = 'EXT-N — North hall extinguisher';

interface PlanMockState {
  readonly plans: MaintenancePlanOutput[];
  readonly created: CreateMaintenancePlanInput[];
  readonly updates: (UpdateMaintenancePlanInput & { id: string })[];
  readonly kinds: string[];
}

function annualControl(): MaintenancePlanOutput {
  return {
    '@id': `${planPath}/annual-control`,
    '@type': 'MaintenancePlan',
    id: 'annual-control',
    organizationId: E2E_ORGANIZATION_ID,
    equipmentId: E2E_EQUIPMENT_ID,
    equipmentType: 'fire_extinguisher',
    name: 'Annual extinguisher control',
    operationKind: 'control',
    interval: 'P1Y',
    cadenceMode: 'fixed',
    calendarTimezone: 'Europe/Paris',
    anchorAt: '2027-01-31T00:00:00+01:00',
    nextDueAt: '2028-01-31T00:00:00+01:00',
    active: true,
    openOccurrence: null,
  };
}

async function json(route: Route, status: number, body: unknown): Promise<void> {
  await route.fulfill({ status, contentType: 'application/ld+json', body: JSON.stringify(body) });
}

async function installPlans(page: Page): Promise<PlanMockState> {
  const api: ApiMock = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const equipment = { ...equipmentOutput(), name: 'North hall extinguisher', assetCode: 'EXT-N' };
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, [equipment]);
  const state: PlanMockState = { plans: [annualControl()], created: [], updates: [], kinds: [] };
  await page.route(
    new RegExp(`/api/organizations/${E2E_ORGANIZATION_ID}/maintenance/engine(\\?.*)?$`),
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await json(route, 200, { mode: 'plans', preparedCount: 1, conflicts: [] });
    },
  );
  await page.route(new RegExp(`${planPath}(?:/[^?]*)?(?:\\?.*)?$`), async (route) => {
    const url: URL = new URL(route.request().url());
    const method: string = route.request().method();
    if (url.pathname === planPath && method === 'GET') {
      const kind: string = url.searchParams.get('operationKind') ?? '';
      expect(['control', 'maintenance']).toContain(kind);
      state.kinds.push(kind);
      const member: MaintenancePlanOutput[] = state.plans.filter(
        (plan) => plan.operationKind === kind,
      );
      await json(route, 200, {
        '@id': planPath,
        '@type': 'Collection',
        member,
        totalItems: member.length,
      });
      return;
    }
    if (url.pathname === planPath && method === 'POST') {
      const input: CreateMaintenancePlanInput = route
        .request()
        .postDataJSON() as CreateMaintenancePlanInput;
      state.created.push(input);
      const prepared: MaintenancePlanOutput = {
        ...annualControl(),
        id: 'monthly-maintenance',
        '@id': `${planPath}/monthly-maintenance`,
        name: input.name,
        operationKind: input.operationKind,
        interval: input.interval,
        anchorAt: `${input.anchorOn}T00:00:00+01:00`,
        nextDueAt: `${input.nextDueOn}T00:00:00+01:00`,
        active: false,
      };
      state.plans.push(prepared);
      await json(route, 201, prepared);
      return;
    }
    const preview: RegExpMatchArray | null = url.pathname.match(/\/plans\/([^/]+)\/preview$/);
    if (preview && method === 'GET') {
      const plan: MaintenancePlanOutput | undefined = state.plans.find(
        (candidate) => candidate.id === preview[1],
      );
      if (!plan) throw new Error('Preview requested an unknown plan.');
      await json(route, 200, {
        dates:
          plan.operationKind === 'control'
            ? [
                '2028-01-31T00:00:00+01:00',
                '2029-01-31T00:00:00+01:00',
                '2030-01-31T00:00:00+01:00',
              ]
            : [
                '2027-02-28T00:00:00+01:00',
                '2027-03-31T00:00:00+02:00',
                '2027-04-30T00:00:00+02:00',
              ],
      });
      return;
    }
    const item: RegExpMatchArray | null = url.pathname.match(/\/plans\/([^/]+)$/);
    if (item && method === 'PATCH') {
      const input = route.request().postDataJSON() as UpdateMaintenancePlanInput;
      const index: number = state.plans.findIndex((candidate) => candidate.id === item[1]);
      if (index < 0) throw new Error('Configuration requested an unknown plan.');
      if (input.active !== undefined) expect(Object.keys(input)).toEqual(['active']);
      else expect(Object.keys(input)).toEqual(['name']);
      state.updates.push({ id: item[1], ...input });
      state.plans[index] = { ...state.plans[index], ...input };
      await json(route, 200, state.plans[index]);
      return;
    }
    await route.fallback();
  });
  return state;
}

test.describe('Equipment operation plans', () => {
  test('renames an open operation while its original calendar stays disabled and the request contains only its name', async ({
    page,
  }, testInfo) => {
    const errors: readonly string[] = collectConsoleErrors(page);
    const state: PlanMockState = await installPlans(page);
    state.plans[0] = {
      ...state.plans[0],
      openOccurrence: {
        id: 'open-control',
        dueAt: '2028-01-31T00:00:00+01:00',
        attempt: 1,
        status: 'open',
        interventionId: 'control-campaign',
      },
    };
    await page.setViewportSize({ width: 375, height: 812 });
    const plans: MaintenancePlansPage = new MaintenancePlansPage(page);
    await plans.goto(E2E_ORGANIZATION_ID);
    await plans
      .row('annual-control')
      .getByRole('button', { name: 'Configure', exact: true })
      .click();
    await expect(page.getByTestId('maintenance-plan-calendar-locked')).toContainText(
      'You can still change the operation name.',
    );
    await expect(plans.every).toBeDisabled();
    await expect(plans.unit).toBeDisabled();
    await expect(plans.anchor).toBeDisabled();
    await expect(plans.firstDue).toBeDisabled();
    await expect(plans.name).toBeEnabled();
    await plans.name.fill('North hall annual control');
    await plans.name.focus();
    await page.keyboard.press('Tab');
    await expect(plans.form.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(plans.form);
    await page.screenshot({
      path: testInfo.outputPath('maintenance-plan-open-calendar.png'),
      animations: 'disabled',
    });
    await plans.save.click();
    await expect(plans.form).toBeHidden();
    await expect(plans.row('annual-control')).toContainText('North hall annual control');
    expect(state.updates).toEqual([{ id: 'annual-control', name: 'North hall annual control' }]);
    expect(state.plans[0].nextDueAt).toBe('2028-01-31T00:00:00+01:00');
    expect(state.plans[0].openOccurrence?.id).toBe('open-control');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('prepares a monthly calendar with a separate first deadline, reviews server dates and explicitly activates then pauses it without changing annual controls', async ({
    page,
  }, testInfo) => {
    const errors: readonly string[] = collectConsoleErrors(page);
    const state: PlanMockState = await installPlans(page);
    const plans: MaintenancePlansPage = new MaintenancePlansPage(page);
    await plans.goto(E2E_ORGANIZATION_ID);
    await expect(plans.row('annual-control')).toBeVisible();
    await plans.prepareMonthlyMaintenance('Monthly equipment service', equipmentName);
    await expect(plans.form).toBeHidden();
    await expect(plans.preview).toContainText('2027-02-28');
    await expect(plans.preview).toContainText('2027-03-31');
    await expect(plans.preview).toContainText('2027-04-30');
    expect(state.created).toEqual([
      {
        equipmentId: E2E_EQUIPMENT_ID,
        name: 'Monthly equipment service',
        operationKind: 'maintenance',
        interval: 'P1M',
        anchorOn: '2027-01-31',
        nextDueOn: '2027-02-28',
      },
    ]);
    expect(state.updates).toEqual([]);
    await plans.maintenance.click();
    await expect(plans.row('monthly-maintenance')).toContainText('Prepared');
    await expect(plans.row('annual-control')).toHaveCount(0);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/maintenance-plans-calendar-preview-light.png`,
      animations: 'disabled',
    });
    await plans.activate.click();
    await expect(plans.pause).toBeVisible();
    await expect(plans.row('monthly-maintenance')).not.toContainText('Prepared');
    await plans.pause.click();
    await expect(plans.activate).toBeVisible();
    expect(state.updates).toEqual([
      { id: 'monthly-maintenance', active: true },
      { id: 'monthly-maintenance', active: false },
    ]);
    await plans.controls.click();
    await plans
      .row('annual-control')
      .getByRole('button', { name: 'Preview dates', exact: true })
      .click();
    await expect(plans.preview).toContainText('2028-01-31');
    await expect(plans.preview).toContainText('2029-01-31');
    await expect(plans.preview).toContainText('2030-01-31');
    expect(state.plans.find((plan) => plan.id === 'annual-control')?.interval).toBe('P1Y');
    expect(state.plans.find((plan) => plan.id === 'annual-control')?.active).toBe(true);
    expect(state.kinds).toContain('control');
    expect(state.kinds).toContain('maintenance');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('keeps the native calendar preparation readable and keyboard reachable on a narrow dark desktop', async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 375, height: 812 });
    await installPlans(page);
    const plans: MaintenancePlansPage = new MaintenancePlansPage(page);
    await plans.goto(E2E_ORGANIZATION_ID);
    await plans.newPlan.click();
    await plans.name.fill('North hall monthly fire equipment maintenance');
    await plans.anchor.fill('2027-01-31');
    await plans.firstDue.fill('2027-02-28');
    await plans.unit.focus();
    await page.keyboard.press('Tab');
    await expect(plans.anchor).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await expectNoInternalOverflow(plans.form);
    await page.screenshot({
      path: `${pagePolishScreenshotDir(testInfo.project.name)}/maintenance-plans-preparation-narrow-dark.png`,
      animations: 'disabled',
    });
  });
});
