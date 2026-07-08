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

  it('exposes the load error and does not report empty on a failed load', () => {
    service.list.mockReturnValue(throwError(() => new Error('network')));

    store.load({ organizationId: 'org-1' });

    expect(store.loadError()).not.toBeNull();
    expect(store.isEmpty()).toBe(false);
    expect(dispatch).toHaveBeenCalled();
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

  it('loads the metric totals without fetching any board cards', () => {
    store.loadCounts({ organizationId: 'org-1' });

    expect(lane(store, 'draft').total).toBe(3);
    expect(lane(store, 'planned').total).toBe(5);
    expect(lane(store, 'review').total).toBe(3);
    expect(lane(store, 'published').total).toBe(12);
    expect(store.interventionIds()).toEqual([]);
    expect(store.countsLoading()).toBe(false);
    expect(service.list).toHaveBeenCalledWith('org-1', { status: 'draft', itemsPerPage: 1 });
  });

  it('resets the metric totals to zero without an organization', () => {
    store.loadCounts({ organizationId: null });

    expect(lane(store, 'published').total).toBe(0);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('appends the next lane page, preserving order and de-duping by id', () => {
    const firstPage: readonly InterventionOutput[] = Array.from(
      { length: 20 },
      (_, index) =>
        ({ id: `pub-${index}`, status: 'published', revision: 1 }) as InterventionOutput,
    );
    const secondPage: readonly InterventionOutput[] = [
      { id: 'pub-0', status: 'published', revision: 1 } as InterventionOutput,
      { id: 'pub-20', status: 'published', revision: 1 } as InterventionOutput,
    ];
    service.list.mockImplementation(
      (_org: string, options: { status: InterventionStatus; page?: number }) =>
        of(
          options.status === 'published'
            ? col(options.page === 2 ? secondPage : firstPage, 22)
            : COLLECTIONS[options.status],
        ),
    );

    store.load({ organizationId: 'org-1' });
    expect(lane(store, 'published').items).toHaveLength(20);
    expect(lane(store, 'published').total).toBe(22);

    store.loadMore({ organizationId: 'org-1', columnId: 'published' });

    expect(service.list).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ status: 'published', page: 2 }),
    );
    expect(lane(store, 'published').items.map((item) => item.id)).toEqual([
      ...firstPage.map((item) => item.id),
      'pub-20',
    ]);
    expect(lane(store, 'published').loadingMore).toBe(false);
  });

  it('does not fetch more when a lane is already fully loaded', () => {
    store.load({ organizationId: 'org-1' });
    service.list.mockClear();

    store.loadMore({ organizationId: 'org-1', columnId: 'draft' });

    expect(service.list).not.toHaveBeenCalled();
  });

  it('surfaces a load-more failure through a dispatched event', () => {
    const firstPage: readonly InterventionOutput[] = Array.from(
      { length: 20 },
      (_, index) =>
        ({ id: `pub-${index}`, status: 'published', revision: 1 }) as InterventionOutput,
    );
    service.list.mockImplementation(
      (_org: string, options: { status: InterventionStatus; page?: number }) => {
        if (options.status === 'published' && options.page === 2) {
          return throwError(() => new Error('boom'));
        }
        return of(
          options.status === 'published' ? col(firstPage, 22) : COLLECTIONS[options.status],
        );
      },
    );

    store.load({ organizationId: 'org-1' });
    dispatch.mockClear();

    store.loadMore({ organizationId: 'org-1', columnId: 'published' });

    expect(dispatch).toHaveBeenCalled();
    expect(lane(store, 'published').loadingMore).toBe(false);
    expect(lane(store, 'published').items).toHaveLength(20);
  });
});
