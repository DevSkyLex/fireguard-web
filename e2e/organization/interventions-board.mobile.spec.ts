import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  interventionOutput,
  interventionStatisticsOutput,
} from '../support/fixtures/intervention-fixtures';
import { organizationMemberOutput } from '../support/fixtures/member-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';

test.beforeEach(async ({ context, browserName }) => {
  await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
});

for (const theme of ['light', 'dark'] as const) {
  test(`keeps mobile board cards readable and status actions reachable in ${theme} mode`, async ({
    page,
    context,
    baseURL,
  }) => {
    if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const api = new ApiMock(page);
    const today = new Date();
    const dueAt = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 2,
      12,
    ).toISOString();
    await api.mockAuthenticatedSession();
    await api.mockInterventionStatistics(interventionStatisticsOutput());
    const interventions = Array.from({ length: 7 }, (_, i) =>
      interventionOutput({
        id: `mobile-board-${i}`,
        number: i + 1,
        status: 'draft',
        priority: i === 1 ? 'high' : 'normal',
        responsible:
          i === 1 ? `/api/organizations/${E2E_ORGANIZATION_ID}/members/e2e-member-1` : null,
        dueAt: i === 1 ? dueAt : null,
        name:
          i === 0
            ? 'Vérification de sécurité des installations techniques et des équipements du bâtiment administratif'
            : `Contrôle de sécurité ${i}`,
        labels:
          i === 0
            ? [
                {
                  id: 'long-label',
                  name: 'Équipements-de-sécurité-du-bâtiment-administratif',
                  color: null,
                },
              ]
            : [],
      }),
    );
    await api.mockInterventionList(E2E_ORGANIZATION_ID, interventions);
    await api.mockInterventionTransition(interventions[1].id, {
      ...interventions[1],
      status: 'in_progress',
      revision: 2,
      allowedTransitions: ['submitted', 'abandoned'],
    });
    await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [organizationMemberOutput()]);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions?view=board`);
    await expect(page.locator('html')).toHaveAttribute('data-interaction-mode', 'mobile');
    const board = page.getByTestId('interventions-mobile-board');
    await expect(board).toBeVisible();
    await expect(board.getByRole('region')).toHaveCount(7);
    const draft = board.getByRole('region', { name: 'Draft', exact: true });
    await expect(draft.getByTestId('intervention-board-card')).toHaveCount(7);
    await board.scrollIntoViewIfNeeded();
    await expectNoHorizontalOverflow(page);
    const card = draft.getByTestId('intervention-board-card').first();
    const actions = card.getByTestId('intervention-board-card-mobile-actions');
    const button = await actions.boundingBox();
    if (!button) throw new Error('Missing mobile card actions');
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.height).toBeGreaterThanOrEqual(44);
    expect(
      (await card.getByTestId('intervention-board-card-title').boundingBox())?.height,
    ).toBeGreaterThanOrEqual(44);
    await expect(card).toBeInViewport();
    expect(
      await card.evaluate((element) => element.scrollWidth - element.clientWidth),
    ).toBeLessThanOrEqual(1);
    const label = card.getByTestId('intervention-board-card-label');
    expect(
      await label.evaluate((element) => element.scrollHeight - element.clientHeight),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      scale: 'css',
      path: `e2e/artifacts/shared-board/touch-${theme}.png`,
      animations: 'disabled',
    });
    const last = draft.getByTestId('intervention-board-card').last();
    await last.scrollIntoViewIfNeeded();
    await expect(card).not.toBeInViewport();
    await expect(last).toBeInViewport();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeInViewport();
    await actions.tap();
    const blockedDrawer = page.getByRole('dialog', { name: interventions[0].name, exact: true });
    await expect(
      blockedDrawer.getByRole('heading', { name: interventions[0].name, exact: true }),
    ).toBeVisible();
    await expect(
      blockedDrawer
        .getByTestId('intervention-board-card-mobile-move')
        .filter({ hasText: 'In progress' }),
    ).toBeDisabled();
    await expect(blockedDrawer).toContainText(
      'Only the responsible member or a participant can perform this transition.',
    );
    await page.screenshot({
      scale: 'css',
      path: `e2e/artifacts/shared-board/touch-blocked-status-${theme}.png`,
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await expect(blockedDrawer).toHaveCount(0);
    await expect(draft.getByTestId('intervention-board-card')).toHaveCount(7);
    const assigned = draft.getByTestId('intervention-board-card').nth(1);
    await assigned.scrollIntoViewIfNeeded();
    await assigned.getByTestId('intervention-board-card-mobile-actions').tap();
    const allowedDrawer = page.getByRole('dialog', { name: interventions[1].name, exact: true });
    const start = allowedDrawer.locator(
      '[data-testid="intervention-board-card-mobile-move"][data-status="in_progress"]',
    );
    await expect(start).toBeEnabled();
    expect((await start.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    const transitionRequest = page.waitForRequest(
      (request) =>
        request.url().endsWith(`/api/interventions/${interventions[1].id}`) &&
        request.method() === 'PATCH',
    );
    await start.tap();
    const request = await transitionRequest;
    expect(request.postDataJSON()).toEqual({ status: 'in_progress' });
    expect(request.headers()['if-match']).toBe('"revision-1"');
    await expect(allowedDrawer).toHaveCount(0);
    await expect(draft.getByTestId('intervention-board-card')).toHaveCount(6);
    await expect(
      board
        .getByRole('region', { name: 'In progress', exact: true })
        .getByTestId('intervention-board-card'),
    ).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}
