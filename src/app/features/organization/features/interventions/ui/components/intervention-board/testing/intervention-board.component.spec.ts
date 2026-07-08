import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { MenuItem } from 'primeng/api';
import type {
  InterventionBoardBucket,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import type { KanbanCard, KanbanColumn, KanbanDropEvent } from '@shared/components';
import { InterventionBoard } from '../intervention-board.component';
import type { InterventionBoardAdvanceEvent } from '../models';

const draft = { id: 'd', status: 'draft' } as unknown as InterventionOutput;
const submitted = { id: 's', status: 'submitted' } as unknown as InterventionOutput;
const changes = { id: 'c', status: 'changes_requested' } as unknown as InterventionOutput;

const BUCKETS: readonly InterventionBoardBucket[] = [
  { id: 'draft', items: [draft], total: 3, loadingMore: false },
  { id: 'review', items: [submitted, changes], total: 5, loadingMore: false },
  { id: 'published', items: [], total: 12, loadingMore: false },
];

const labels = (items: MenuItem[]): (string | undefined)[] =>
  items.filter((item) => !item.separator).map((item) => item.label);

type BoardCapabilities = {
  canPlan?: boolean;
  canExecute?: boolean;
  canReview?: boolean;
  canPublish?: boolean;
};

type InterventionBoardHarness = {
  kanbanColumns(): readonly KanbanColumn[];
  canDrop(card: KanbanCard, toColumnId: string): boolean;
  onDropped(event: KanbanDropEvent): void;
  buildMenu(intervention: InterventionOutput): MenuItem[];
};

describe('InterventionBoard', () => {
  function build(
    capabilities: BoardCapabilities = {
      canPlan: true,
      canExecute: true,
      canReview: true,
      canPublish: true,
    },
  ): { board: InterventionBoard; harness: InterventionBoardHarness } {
    TestBed.configureTestingModule({ imports: [InterventionBoard] }).overrideComponent(
      InterventionBoard,
      { set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA], template: '' } },
    );

    const fixture = TestBed.createComponent(InterventionBoard);
    fixture.componentRef.setInput('columns', BUCKETS);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('empty', false);
    fixture.componentRef.setInput('canPlan', capabilities.canPlan ?? false);
    fixture.componentRef.setInput('canExecute', capabilities.canExecute ?? false);
    fixture.componentRef.setInput('canReview', capabilities.canReview ?? false);
    fixture.componentRef.setInput('canPublish', capabilities.canPublish ?? false);
    fixture.detectChanges();

    return {
      board: fixture.componentInstance,
      harness: fixture.componentInstance as unknown as InterventionBoardHarness,
    };
  }

  it('maps intervention buckets onto kanban columns carrying the intervention', () => {
    const { harness } = build();
    const review = harness.kanbanColumns().find((column) => column.id === 'review');

    expect(harness.kanbanColumns().map((column) => column.id)).toEqual([
      'draft',
      'review',
      'published',
    ]);
    expect(review?.label).toBe('In review');
    expect(review?.count).toBe(5);
    expect(review?.cards.map((card) => card.id)).toEqual(['s', 'c']);
    expect(review?.cards[0].data).toBe(submitted);
  });

  it('allows only policy-legal drops, never into the terminal published lane', () => {
    const { harness } = build();

    expect(harness.canDrop({ id: 'd', data: draft }, 'planned')).toBe(true);
    expect(harness.canDrop({ id: 's', data: submitted }, 'in_progress')).toBe(false);
    expect(harness.canDrop({ id: 'd', data: draft }, 'published')).toBe(false);
  });

  it('emits an advance for a legal drop', () => {
    const { board, harness } = build();
    const emitted: InterventionBoardAdvanceEvent[] = [];
    board.advance.subscribe((event) => emitted.push(event));

    harness.onDropped({
      card: { id: 'd', data: draft },
      fromColumnId: 'draft',
      toColumnId: 'planned',
    });

    expect(emitted).toEqual([{ intervention: draft, toStatus: 'planned' }]);
  });

  it('ignores an illegal drop', () => {
    const { board, harness } = build();
    const emitted: InterventionBoardAdvanceEvent[] = [];
    board.advance.subscribe((event) => emitted.push(event));

    harness.onDropped({
      card: { id: 's', data: submitted },
      fromColumnId: 'review',
      toColumnId: 'in_progress',
    });

    expect(emitted).toEqual([]);
  });

  it('refuses a workflow-legal drop the user lacks permission for', () => {
    const { harness } = build({ canPlan: false });

    // draft -> planned is workflow-legal but requires the plan capability.
    expect(harness.canDrop({ id: 'd', data: draft }, 'planned')).toBe(false);
  });

  it('prefers the API allowedTransitions over the static fallback table', () => {
    const { harness } = build();
    // API marks this draft terminal (no legal moves), overriding the static table.
    const lockedDraft = {
      id: 'd2',
      status: 'draft',
      allowedTransitions: [],
    } as unknown as InterventionOutput;

    expect(harness.canDrop({ id: 'd2', data: lockedDraft }, 'planned')).toBe(false);
    expect(labels(harness.buildMenu(lockedDraft))).toEqual(['Open']);
  });

  it('derives the card menu from the RBAC-filtered allowed transitions', () => {
    const { harness } = build();

    const menu = harness.buildMenu(draft);

    // draft allows [planned, abandoned]: advance to planned, then Open, then Abandon.
    expect(labels(menu)).toEqual(['Move to planned', 'Open', 'Abandon…']);
  });

  it('hides gated actions from a read-only user, keeping only Open', () => {
    const { harness } = build({
      canPlan: false,
      canExecute: false,
      canReview: false,
      canPublish: false,
    });

    expect(labels(harness.buildMenu(draft))).toEqual(['Open']);
  });

  it('emits abandon from the card menu action', () => {
    const { board, harness } = build();
    const abandoned: InterventionOutput[] = [];
    board.abandon.subscribe((intervention) => abandoned.push(intervention));

    const abandonItem = harness.buildMenu(draft).find((item) => item.label === 'Abandon…');
    abandonItem?.command?.({});

    expect(abandoned).toEqual([draft]);
  });
});
