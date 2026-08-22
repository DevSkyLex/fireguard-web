import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  InterventionAllowedActionsOutput,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import type { InterventionTransitionRequest } from '../../../tables/intervention-table';
import { InterventionBoard } from '../intervention-board.component';
import type { InterventionBoardCardViewModel } from '../models';

const allowedActions = (
  overrides: Partial<InterventionAllowedActionsOutput> = {},
): InterventionAllowedActionsOutput => ({
  canEditDetails: false,
  canEditSite: false,
  canEditResponsible: false,
  canEditPlanning: false,
  canMutateWorkItems: false,
  canMutateChanges: false,
  canAssignTeam: false,
  canManageAttachments: false,
  canSubmit: false,
  canWithdraw: false,
  canDelete: false,
  canPublish: false,
  ...overrides,
});

const intervention = (overrides: Partial<InterventionOutput> = {}): InterventionOutput =>
  ({
    id: 'a1b2',
    organization: '/api/organizations/1',
    number: 42,
    type: 'inventory',
    name: 'Quarterly extinguisher sweep',
    description: null,
    status: 'in_progress',
    allowedTransitions: ['submitted', 'abandoned'],
    allowedActions: allowedActions(),
    site: null,
    responsible: null,
    participants: [],
    labels: [],
    priority: 'high',
    plannedStartAt: null,
    dueAt: null,
    reviewNote: null,
    revision: 3,
    facilitiesCount: 0,
    equipmentCount: 0,
    inspectionsCount: 0,
    blockersCount: 0,
    workItemsCount: 0,
    completedWorkItemsCount: 0,
    proposedChangesCount: 0,
    commentsCount: 0,
    hasSignature: false,
    createdAt: '2026-08-01T09:00:00+00:00',
    updatedAt: '2026-08-02T09:00:00+00:00',
    ...overrides,
  }) as InterventionOutput;

const cardItem = (overrides: Partial<InterventionOutput> = {}): InterventionBoardCardViewModel => ({
  intervention: intervention(overrides),
  isOverdue: false,
  responsible: null,
});

const createBoard = async (): Promise<ComponentFixture<InterventionBoard>> => {
  const created: ComponentFixture<InterventionBoard> = TestBed.createComponent(InterventionBoard);
  created.componentRef.setInput('items', []);
  created.componentRef.setInput('detailRouteBase', ['/organizations', 'org-1', 'interventions']);
  await created.whenStable();

  return created;
};

describe('InterventionBoard', () => {
  let fixture: ComponentFixture<InterventionBoard>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  it('should render one column per InterventionStatus, in workflow order', async () => {
    fixture = await createBoard();
    const element = fixture.nativeElement as HTMLElement;

    const statuses = [...element.querySelectorAll('[data-testid="intervention-board-column"]')].map(
      (column: Element): string | null => column.getAttribute('data-status'),
    );

    expect(statuses).toEqual([
      'draft',
      'planned',
      'in_progress',
      'changes_requested',
      'submitted',
      'published',
      'abandoned',
    ]);
  });

  it('should place a loaded card in the column matching its own status', async () => {
    fixture = await createBoard();
    fixture.componentRef.setInput('items', [cardItem({ id: 'a1', status: 'planned' })]);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const plannedColumn = element.querySelector(
      '[data-testid="intervention-board-column"][data-status="planned"]',
    );

    expect(plannedColumn?.querySelectorAll('[data-testid="intervention-board-card"]').length).toBe(
      1,
    );
  });

  it('should show the column count matching the number of cards it holds', async () => {
    fixture = await createBoard();
    fixture.componentRef.setInput('items', [
      cardItem({ id: 'a1', status: 'planned' }),
      cardItem({ id: 'a2', status: 'planned' }),
    ]);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const plannedColumn = element.querySelector(
      '[data-testid="intervention-board-column"][data-status="planned"]',
    );

    expect(
      plannedColumn
        ?.querySelector('[data-testid="intervention-board-column-count"]')
        ?.textContent?.trim(),
    ).toBe('2');
  });

  it('should emit moveRequested on a legal move and announce it', async () => {
    fixture = await createBoard();
    const requests: InterventionTransitionRequest[] = [];
    fixture.componentInstance.moveRequested.subscribe((request) => requests.push(request));

    fixture.componentInstance['requestMove'](intervention({ status: 'in_progress' }), 'submitted');

    expect(requests).toEqual([
      { intervention: intervention({ status: 'in_progress' }), status: 'submitted' },
    ]);
    expect(fixture.componentInstance['liveMessage']()).toContain('Quarterly extinguisher sweep');
  });

  it('should restore keyboard focus onto the moved card, whose DOM node a cross-column move recreates', async () => {
    fixture = await createBoard();
    fixture.componentRef.setInput('items', [cardItem({ id: 'a1b2', status: 'in_progress' })]);
    await fixture.whenStable();
    const title = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '[data-intervention-id="a1b2"] a[data-testid="intervention-board-card-title"]',
    );
    expect(title).not.toBeNull();
    // The harness renders no href, so jsdom refuses real focus — assert the call.
    const focusSpy = vi.spyOn(title as HTMLAnchorElement, 'focus');

    fixture.componentInstance['requestMove'](
      intervention({ id: 'a1b2', status: 'in_progress' }),
      'submitted',
    );
    await fixture.whenStable();

    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('should not emit moveRequested for a server-illegal move', async () => {
    fixture = await createBoard();
    const requests: InterventionTransitionRequest[] = [];
    fixture.componentInstance.moveRequested.subscribe((request) => requests.push(request));

    fixture.componentInstance['requestMove'](
      intervention({ status: 'draft', allowedTransitions: ['planned'] }),
      'abandoned',
    );

    expect(requests).toEqual([]);
  });

  it('should not emit moveRequested for withdraw (submitted → in_progress) when canWithdraw is false', async () => {
    fixture = await createBoard();
    const requests: InterventionTransitionRequest[] = [];
    fixture.componentInstance.moveRequested.subscribe((request) => requests.push(request));

    fixture.componentInstance['requestMove'](
      intervention({
        status: 'submitted',
        allowedTransitions: ['in_progress', 'changes_requested'],
        allowedActions: allowedActions({ canWithdraw: false }),
      }),
      'in_progress',
    );

    expect(requests).toEqual([]);
  });
});
