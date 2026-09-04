import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  interventionOutput,
  interventionStatisticsOutput,
} from '../support/fixtures/intervention-fixtures';
import { organizationMemberOutput } from '../support/fixtures/member-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

for (const theme of ['light', 'dark'] as const) {
  test(`keeps board cards readable and column navigation reachable on a touch screen in ${theme} mode`, async ({
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
    await api.mockInterventionList(
      E2E_ORGANIZATION_ID,
      Array.from({ length: 7 }, (_, i) =>
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
      ),
    );
    await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [organizationMemberOutput()]);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions?view=board`);
    const board = page.getByTestId('board');
    await expect(board).toBeVisible();
    await expect(page.getByTestId('board-column')).toHaveCount(7);
    await board.scrollIntoViewIfNeeded();
    await expectNoHorizontalOverflow(page);
    const right = page.getByTestId('board-scroll-right');
    const button = await right.boundingBox();
    if (!button) throw new Error('Missing column navigation button');
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.height).toBeGreaterThanOrEqual(44);
    const card = page.getByTestId('intervention-board-card').first();
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
    await expect(right).toBeEnabled();
    await right.tap();
    await expect.poll(() => board.evaluate((element) => element.scrollLeft)).toBeGreaterThan(280);
    await expect(page.getByTestId('board-column').nth(1).getByRole('heading')).toBeInViewport();
    await page.getByTestId('board-scroll-left').tap();
    await expect.poll(() => board.evaluate((element) => element.scrollLeft)).toBeLessThan(2);
    const list = page.getByTestId('board-column-list').first();
    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(card).not.toBeInViewport();
    await expect(page.getByTestId('board-column').first().getByRole('heading')).toBeInViewport();
    await expect(page.getByTestId('intervention-board-card').last()).toBeInViewport();
    await list.evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBe(0);
    await expect(card).toBeInViewport();
    const source = await card.boundingBox();
    if (!source) throw new Error('Missing touch drag source');
    const touch = await context.newCDPSession(page);
    const origin = {
      x: Math.round(source.x + source.width / 2),
      y: Math.round(source.y + source.height - 12),
    };
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [origin] });
    await new Promise((resolve) => setTimeout(resolve, 300));
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: origin.x + 40, y: origin.y }],
    });
    const blocked = page
      .getByTestId('board-column')
      .filter({ has: page.getByRole('heading', { name: 'In progress', exact: true }) });
    await expect(blocked.getByTestId('board-drop-hint')).toHaveText(
      'Only the responsible member or a participant can perform this transition.',
    );
    await board.evaluate((element) => {
      element.scrollLeft = 664;
    });
    await expect(blocked.getByTestId('board-drop-hint')).toBeInViewport();
    await page.screenshot({
      scale: 'css',
      path: `e2e/artifacts/shared-board/touch-drag-${theme}.png`,
      animations: 'disabled',
    });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(page.getByTestId('board-drop-hint')).toHaveCount(0);
    await expect(
      page.getByTestId('board-column').first().getByTestId('intervention-board-card'),
    ).toHaveCount(7);
    await touch.detach();
    expect(errors).toEqual([]);
  });
}
