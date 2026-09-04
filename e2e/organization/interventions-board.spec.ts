import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import { setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsBoardPage } from '../support/pages/interventions-board.page';

/** Verifies domain grouping, legal pointer/menu moves and focus restoration through shared Board. */
const plannedIntervention = interventionOutput({
  id: 'e2e-board-planned',
  '@id': '/api/interventions/e2e-board-planned',
  number: 401,
  name: 'Board planned intervention',
  responsible: `/api/organizations/${E2E_ORGANIZATION_ID}/members/e2e-member-1`,
  status: 'planned',
  allowedTransitions: ['in_progress', 'abandoned'],
});
const draftIntervention = interventionOutput({
  id: 'e2e-board-draft',
  '@id': '/api/interventions/e2e-board-draft',
  number: 402,
  name: 'Board draft intervention',
  status: 'draft',
  allowedTransitions: ['planned', 'abandoned'],
});
const publishedIntervention = interventionOutput({
  id: 'e2e-board-published',
  '@id': '/api/interventions/e2e-board-published',
  number: 403,
  name: 'Board published intervention',
  status: 'published',
  allowedTransitions: [],
});

test.describe('Interventions board — Kanban view over the shared dataset', () => {
  test('renders each seeded intervention in the column matching its own status', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInterventionList(E2E_ORGANIZATION_ID, [
      plannedIntervention,
      draftIntervention,
      publishedIntervention,
    ]);
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);

    const board = new InterventionsBoardPage(page);
    await board.goto(E2E_ORGANIZATION_ID);

    await expect(board.root).toBeVisible();
    await expect(board.cardsIn('draft')).toHaveCount(1);
    await expect(board.cardsIn('planned')).toHaveCount(1);
    await expect(board.cardsIn('published')).toHaveCount(1);
    await expect(board.cardsIn('in_progress')).toHaveCount(0);
    await expect(board.card('Board planned intervention')).toBeVisible();
  });

  test('moves a card to a legal target via the "Move to…" menu, firing the PATCH', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInterventionList(E2E_ORGANIZATION_ID, [plannedIntervention]);
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
    await api.mockInterventionTransition(plannedIntervention.id, {
      ...plannedIntervention,
      status: 'in_progress',
      revision: plannedIntervention.revision + 1,
      allowedTransitions: ['submitted', 'changes_requested', 'abandoned'],
    });

    const board = new InterventionsBoardPage(page);
    await board.goto(E2E_ORGANIZATION_ID);

    await expect(board.cardsIn('planned')).toHaveCount(1);

    await board.openCardMenu('Board planned intervention');
    await board.chooseMove('In progress');

    await expect(board.cardsIn('in_progress')).toHaveCount(1);
    await expect(board.cardsIn('planned')).toHaveCount(0);
    await expect(board.liveRegion).toContainText('Board planned intervention');
    await expect(board.liveRegion).toContainText('In progress');
    await expect(
      page.locator(
        `[data-intervention-id="${plannedIntervention.id}"] [data-testid="intervention-board-card-title"]`,
      ),
    ).toBeFocused();
  });

  test('never offers published as a "Move to…" target, and the column never accepts one', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInterventionList(E2E_ORGANIZATION_ID, [plannedIntervention]);
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);

    const board = new InterventionsBoardPage(page);
    await board.goto(E2E_ORGANIZATION_ID);

    await board.openCardMenu('Board planned intervention');

    await expect(
      page.getByTestId('intervention-board-card-move').filter({ hasText: 'Published' }),
    ).toHaveCount(0);
  });

  test('switches to the list view through the toggle, preserving no status narrowing', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInterventionList(E2E_ORGANIZATION_ID, [plannedIntervention]);
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);

    const board = new InterventionsBoardPage(page);
    await board.goto(E2E_ORGANIZATION_ID);

    await page.getByTestId('intervention-view-toggle-list').click();

    await expect(page).toHaveURL(
      new RegExp(`/organizations/${E2E_ORGANIZATION_ID}/interventions(\\?.*)?$`),
    );
    await expect(page.locator('#interventions')).toBeVisible();
  });
});

for (const theme of ['light', 'dark'] as const) {
  test(`indicates forbidden destinations before release and accepts legal drops in ${theme} mode`, async ({
    page,
    context,
    baseURL,
  }) => {
    if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    await page.setViewportSize({ width: 1440, height: 1000 });
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
    await api.mockInterventionList(E2E_ORGANIZATION_ID, [draftIntervention]);
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
    await api.mockInterventionTransition(draftIntervention.id, {
      ...draftIntervention,
      status: 'planned',
      revision: 2,
    });
    const board = new InterventionsBoardPage(page);
    await board.goto(E2E_ORGANIZATION_ID);
    const card = board.cardsIn('draft').first();
    await expect(card).toBeVisible();
    const source = await card.boundingBox();
    const target = await board.column('planned').getByTestId('board-column-list').boundingBox();
    const blocked = await board
      .column('in_progress')
      .getByTestId('board-column-list')
      .boundingBox();
    if (!source || !target || !blocked) throw new Error('Missing board drag bounds');
    const transitions: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'PATCH' && request.url().includes(draftIntervention.id))
        transitions.push(request.url());
    });
    /**
     * Function dropCard
     *
     * @description
     * Visits an accepted column before releasing over the requested destination to exercise CDK's retained container.
     *
     * @param {'blocked' | 'allowed'} destination - The pointer's final destination.
     * @returns {Promise<void>}
     */
    const dropCard = async (destination: 'blocked' | 'allowed'): Promise<void> => {
      await page.mouse.move(source.x + source.width / 2, source.y + source.height - 12);
      await page.mouse.down();
      await page.mouse.move(source.x + source.width / 2 + 10, source.y + source.height - 12, {
        steps: 4,
      });
      await page.mouse.move(target.x + target.width / 2, target.y + 70, { steps: 25 });
      await expect(page.locator('.cdk-drag-preview')).toBeVisible();
      await expect(board.column('planned').locator('.cdk-drag-placeholder')).toHaveCount(1);
      await expect(board.column('planned').getByTestId('board-drop-hint')).toHaveText('Drop here');
      await expect(board.column('in_progress').getByTestId('board-drop-hint')).toHaveText(
        'This transition is not available from the current status.',
      );
      await expect(board.column('draft').getByTestId('board-drop-hint')).toHaveCount(0);
      if (destination === 'blocked') {
        await page.mouse.move(blocked.x + blocked.width / 2, blocked.y + 70, { steps: 20 });
      }
      await page.screenshot({
        path: `e2e/artifacts/shared-board/drag-${destination}-${theme}.png`,
        animations: 'disabled',
      });
      await page.mouse.up();
      await expect(page.getByTestId('board-drop-hint')).toHaveCount(0);
      if (destination === 'blocked') {
        await expect(board.cardsIn('draft')).toHaveCount(1);
        await expect(board.cardsIn('planned')).toHaveCount(0);
        expect(transitions).toEqual([]);
      }
    };
    await dropCard('blocked');
    await dropCard('allowed');
    await expect(board.cardsIn('planned')).toHaveCount(1);
    await expect(board.cardsIn('draft')).toHaveCount(0);
    expect(transitions).toHaveLength(1);
  });
}

test('explains the execution membership restriction before a drop or menu action', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionList(E2E_ORGANIZATION_ID, [
    { ...plannedIntervention, responsible: null, participants: [] },
    interventionOutput({
      id: 'corrections-outside-team',
      name: 'Corrections outside my team',
      status: 'changes_requested',
      allowedTransitions: ['in_progress', 'abandoned'],
    }),
  ]);
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'PATCH') requests.push(request.url());
  });
  const board = new InterventionsBoardPage(page);
  await board.goto(E2E_ORGANIZATION_ID);
  await board.openCardMenu('Board planned intervention');
  const action = page
    .getByTestId('intervention-board-card-move')
    .filter({ hasText: 'In progress' });
  await expect(action).toBeDisabled();
  await expect(action).toHaveCSS('opacity', '1');
  await expect(
    page
      .getByText('Only the responsible member or a participant can perform this transition.', {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  await page.screenshot({
    path: 'e2e/artifacts/shared-board/membership-menu.png',
    animations: 'disabled',
  });
  await page.keyboard.press('Escape');
  const source = await board.cardsIn('changes_requested').first().boundingBox();
  const target = await board.column('in_progress').getByTestId('board-column-list').boundingBox();
  if (!source || !target) throw new Error('Missing membership drag bounds');
  await page.mouse.move(source.x + source.width / 2, source.y + source.height - 12);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2 + 10, source.y + source.height - 12, {
    steps: 4,
  });
  await page.mouse.move(target.x + target.width / 2, target.y + 90, { steps: 20 });
  await expect(board.column('in_progress').getByTestId('board-drop-hint')).toHaveText(
    'Only the responsible member or a participant can perform this transition.',
  );
  await page.screenshot({
    path: 'e2e/artifacts/shared-board/membership-blocked.png',
    animations: 'disabled',
  });
  await page.mouse.up();
  await expect(board.cardsIn('changes_requested')).toHaveCount(1);
  expect(requests).toEqual([]);
});
