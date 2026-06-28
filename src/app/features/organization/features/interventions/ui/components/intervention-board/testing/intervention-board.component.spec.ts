import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
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
  { id: 'draft', items: [draft], total: 3 },
  { id: 'review', items: [submitted, changes], total: 5 },
  { id: 'published', items: [], total: 12 },
];

type InterventionBoardHarness = {
  kanbanColumns(): readonly KanbanColumn[];
  canDrop(card: KanbanCard, toColumnId: string): boolean;
  onDropped(event: KanbanDropEvent): void;
};

describe('InterventionBoard', () => {
  function build(): { board: InterventionBoard; harness: InterventionBoardHarness } {
    TestBed.configureTestingModule({ imports: [InterventionBoard] }).overrideComponent(
      InterventionBoard,
      { set: { imports: [], schemas: [CUSTOM_ELEMENTS_SCHEMA], template: '' } },
    );

    const fixture = TestBed.createComponent(InterventionBoard);
    fixture.componentRef.setInput('columns', BUCKETS);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('empty', false);
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
});
