import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionBoardBucket,
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
import { InterventionBoardStore } from '../intervention-board.store';

const draft = { id: 'd', status: 'draft', revision: 1 } as unknown as InterventionOutput;
const inProgress = { id: 'p', status: 'in_progress', revision: 1 } as unknown as InterventionOutput;
const submitted = { id: 's', status: 'submitted', revision: 1 } as unknown as InterventionOutput;
const changes = {
  id: 'c',
  status: 'changes_requested',
  revision: 1,
} as unknown as InterventionOutput;
const published = { id: 'u', status: 'published', revision: 1 } as unknown as InterventionOutput;

const col = (
  member: readonly InterventionOutput[],
  totalItems: number,
): HydraCollection<InterventionOutput> =>
  ({
    '@id': '/api/interventions',
    '@type': 'Collection',
    totalItems,
    member: [...member],
  }) as HydraCollection<InterventionOutput>;

const COLLECTIONS: Readonly<Record<InterventionStatus, HydraCollection<InterventionOutput>>> = {
  draft: col([draft], 3),
  planned: col([], 5),
  in_progress: col([inProgress], 1),
  submitted: col([submitted], 2),
  changes_requested: col([changes], 1),
  published: col([published], 12),
  abandoned: col([], 0),
};

const lane = (
  store: InstanceType<typeof InterventionBoardStore>,
  id: string,
): InterventionBoardBucket =>
  store.columns().find((column) => column.id === id) as InterventionBoardBucket;

describe('InterventionBoardStore', () => {
  let store: InstanceType<typeof InterventionBoardStore>;
  let service: { list: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = {
      list: vi
        .fn()
        .mockImplementation((_org: string, options: { status: InterventionStatus }) =>
          of(COLLECTIONS[options.status]),
        ),
      update: vi.fn(),
    };
    dispatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        InterventionBoardStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: InterventionService, useValue: service },
      ],
    });

    store = TestBed.inject(InterventionBoardStore);
  });

  it('groups loaded cards into lanes with server totals', () => {
    store.load({ organizationId: 'org-1' });

    expect(lane(store, 'draft').items.map((item) => item.id)).toEqual(['d']);
    expect(lane(store, 'draft').total).toBe(3);
    expect(lane(store, 'planned').total).toBe(5);
    expect(lane(store, 'review').items.map((item) => item.id)).toEqual(['s', 'c']);
    expect(lane(store, 'review').total).toBe(3);
    expect(lane(store, 'published').total).toBe(12);
    expect(store.loading()).toBe(false);
  });

  it('short-circuits to an empty board without an organization', () => {
    store.load({ organizationId: null });

    expect(store.isEmpty()).toBe(true);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('optimistically moves a card to the target lane and confirms it', () => {
    store.load({ organizationId: 'org-1' });
    service.update.mockReturnValueOnce(of({ ...draft, status: 'planned', revision: 2 }));

    store.move({ intervention: draft, toStatus: 'planned' });

    expect(service.update).toHaveBeenCalledWith('d', { status: 'planned' }, 1);
    expect(lane(store, 'draft').items).toEqual([]);
    expect(lane(store, 'planned').items.map((item) => item.id)).toEqual(['d']);
    expect(lane(store, 'draft').total).toBe(2);
    expect(lane(store, 'planned').total).toBe(6);
  });

  it('rolls back the move when the update fails', () => {
    store.load({ organizationId: 'org-1' });
    service.update.mockReturnValueOnce(throwError(() => new Error('boom')));

    store.move({ intervention: draft, toStatus: 'planned' });

    expect(lane(store, 'draft').items.map((item) => item.id)).toEqual(['d']);
    expect(lane(store, 'planned').items).toEqual([]);
    expect(lane(store, 'draft').total).toBe(3);
    expect(dispatch).toHaveBeenCalled();
  });
});
