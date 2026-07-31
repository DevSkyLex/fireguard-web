import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { interventionOutput } from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';

/**
 * The interventions list is the only surface that renders `@shared/board` and
 * `@shared/calendar`, the two largest shared concepts. Both are driven entirely
 * through projected templates and a view toggle — wiring that a unit spec
 * mounts in isolation but never exercises against the real page.
 */
test.describe('Interventions board and calendar (@shared/board, @shared/calendar)', () => {
  const organization = organizationOutput();

  /**
   * Local noon today. The calendar opens on the current month, so an event has
   * to be dated relative to the run rather than pinned — and noon keeps the
   * event on today's date in every timezone the suite might run in.
   */
  const now = new Date();
  const plannedStartAt = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
  ).toISOString();

  const interventions = [
    interventionOutput({
      id: 'i-draft',
      name: 'Draft walkthrough',
      status: 'draft',
      plannedStartAt,
    }),
    interventionOutput({
      id: 'i-planned',
      name: 'Planned audit',
      status: 'planned',
      plannedStartAt,
    }),
    interventionOutput({
      id: 'i-progress',
      name: 'Ongoing check',
      status: 'in_progress',
      plannedStartAt,
    }),
    interventionOutput({
      id: 'i-submitted',
      name: 'Awaiting review',
      status: 'submitted',
      plannedStartAt,
    }),
    interventionOutput({
      id: 'i-changes',
      name: 'Changes requested',
      status: 'changes_requested',
      plannedStartAt,
    }),
  ];

  test.beforeEach(async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });
    await api.mockOrganizationDetail(organization);
    await api.mockOrganizationAccess(organization.id);
    await api.mockInterventionPlanningOptions(organization.id);
    await api.mockInterventionList(interventions);

    await new InterventionsPage(page).goto(organization.id);
  });

  test('lays every intervention out in the lane its status names', async ({ page }) => {
    const interventionsPage = new InterventionsPage(page);
    await interventionsPage.selectView('Board');

    await expect(interventionsPage.board).toBeVisible();

    // The lanes are the board's contract with the page: the page supplies the
    // columns, the shared component only draws them.
    await expect(interventionsPage.column('draft')).toBeVisible();
    await expect(interventionsPage.column('planned')).toBeVisible();
    await expect(interventionsPage.column('in_progress')).toBeVisible();
    await expect(interventionsPage.column('review')).toBeVisible();
    await expect(interventionsPage.column('published')).toBeVisible();

    await expect(interventionsPage.cardsIn('draft')).toHaveCount(1);
    await expect(interventionsPage.cardsIn('draft')).toContainText('Draft walkthrough');
    await expect(interventionsPage.cardsIn('in_progress')).toContainText('Ongoing check');
  });

  test('merges the two review statuses into one lane', async ({ page }) => {
    const interventionsPage = new InterventionsPage(page);
    await interventionsPage.selectView('Board');

    // `submitted` and `changes_requested` are distinct statuses but a single
    // lane, so the count is the assertion that matters.
    await expect(interventionsPage.cardsIn('review')).toHaveCount(2);
    await expect(interventionsPage.column('review')).toContainText('Awaiting review');
    await expect(interventionsPage.column('review')).toContainText('Changes requested');
  });

  test('draws an empty lane as empty rather than as missing', async ({ page }) => {
    const interventionsPage = new InterventionsPage(page);
    await interventionsPage.selectView('Board');

    await expect(interventionsPage.cardsIn('published')).toHaveCount(0);
    await expect(interventionsPage.column('published')).toContainText('No items');
  });

  test('renders the card template the page projects into the board', async ({ page }) => {
    const interventionsPage = new InterventionsPage(page);
    await interventionsPage.selectView('Board');

    // Cards are `appBoardCard` templates owned by the feature — the board only
    // hosts them. Their content appearing proves the projection round-trip.
    const card = interventionsPage.cardsIn('planned').first();
    await expect(card).toContainText('Planned audit');
    await expect(card.getByRole('button')).toBeVisible();
  });

  test('swaps the calendar between its month, week and agenda views', async ({ page }) => {
    const interventionsPage = new InterventionsPage(page);
    await interventionsPage.selectView('Calendar');

    await expect(interventionsPage.calendar).toBeVisible();
    // Month is the calendar's default view.
    await expect(interventionsPage.calendarMonth).toBeVisible();

    await interventionsPage.selectCalendarView('Week');
    await expect(interventionsPage.calendarWeek).toBeVisible();
    await expect(interventionsPage.calendarMonth).toHaveCount(0);

    await interventionsPage.selectCalendarView('Agenda');
    await expect(interventionsPage.calendarAgenda).toBeVisible();
    await expect(interventionsPage.calendarWeek).toHaveCount(0);
    // The agenda is the one view that lists events as text, so it is where the
    // interventions-to-events mapping is cheapest to prove.
    await expect(interventionsPage.calendarAgenda).toContainText('Planned audit');

    await interventionsPage.selectCalendarView('Month');
    await expect(interventionsPage.calendarMonth).toBeVisible();
  });

  test('leaves the board behind when the calendar takes over', async ({ page }) => {
    const interventionsPage = new InterventionsPage(page);
    await interventionsPage.selectView('Board');
    await expect(interventionsPage.board).toBeVisible();

    await interventionsPage.selectView('Calendar');

    // The two views are exclusive; a board left mounted underneath would keep
    // its drop lists live and steal drags.
    await expect(interventionsPage.board).toHaveCount(0);
    await expect(interventionsPage.calendar).toBeVisible();
  });
});
