import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsBoardPage } from '../support/pages/interventions-board.page';

/**
 * Drop legality is exercised through the card's "Move to…" menu — the
 * keyboard/AT-equivalent path `intervention-board.utils.ts`'s
 * `isInterventionBoardMoveAllowed` and `InterventionsBoardPage.canDrop`
 * (the `cdkDropListEnterPredicate`) share — never by simulating a CDK
 * pointer drag: Playwright's synthetic pointer events do not reliably
 * satisfy `@angular/cdk/drag-drop`'s own listeners, and a flaky spec here
 * would be worse than no coverage. This is the documented, sanctioned
 * substitute (FEATURE.md's a11y invariant: drag is an enhancement, never
 * the only path).
 */
const plannedIntervention = interventionOutput({
  id: 'e2e-board-planned',
  '@id': '/api/interventions/e2e-board-planned',
  number: 401,
  name: 'Board planned intervention',
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
