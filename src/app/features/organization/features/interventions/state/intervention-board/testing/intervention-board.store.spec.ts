import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionListOptions,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { InterventionBoardStore } from '../intervention-board.store';

const item = (id: string): InterventionOutput =>
  ({ id, status: 'draft', revision: 1 }) as InterventionOutput;
describe('InterventionBoardStore pagination', () => {
  let store: InstanceType<typeof InterventionBoardStore>;
  let list: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    list = vi.fn().mockImplementation((_org: string, options: InterventionListOptions) =>
      of({
        member:
          options.status === 'draft'
            ? Array.from(
                { length: Math.min(30, 245 - ((options.page ?? 1) - 1) * 30) },
                (_, index) => item(String(((options.page ?? 1) - 1) * 30 + index)),
              )
            : [],
        totalItems: options.status === 'draft' ? 245 : 0,
      }),
    );
    TestBed.configureTestingModule({
      providers: [
        InterventionBoardStore,
        { provide: InterventionService, useValue: { list, update: vi.fn() } },
      ],
    });
    store = TestBed.inject(InterventionBoardStore);
  });
  it('exposes the exact total and makes every item beyond 200 reachable', () => {
    store.load({ organizationId: 'o1', options: {} });
    expect(list).toHaveBeenCalledTimes(7);
    expect(store.columns().draft?.total).toBe(245);
    expect(store.columns().draft?.ids).toHaveLength(30);
    for (let page = 2; page <= 9; page++) store.loadMore('draft');
    expect(store.columns().draft?.ids).toHaveLength(245);
    expect(store.boardInterventionEntityMap()['244']).toBeDefined();
    const calls = list.mock.calls.length;
    store.loadMore('draft');
    expect(list).toHaveBeenCalledTimes(calls);
  });
  it('keeps loaded rows and retries the failed page without duplicating them', () => {
    store.load({ organizationId: 'o1', options: {} });
    list.mockReturnValueOnce(throwError(() => new Error('unavailable')));
    store.loadMore('draft');
    expect(store.columns().draft?.callState.status).toBe('error');
    expect(store.columns().draft?.page).toBe(1);
    expect(store.columns().draft?.ids).toHaveLength(30);
    store.loadMore('draft');
    expect(list).toHaveBeenLastCalledWith(
      'o1',
      expect.objectContaining({ page: 2, status: 'draft' }),
    );
    expect(store.columns().draft?.ids).toHaveLength(60);
    expect(store.columns().published?.callState.status).toBe('success');
  });
  it('ignores an earlier organization response', () => {
    const late = new Subject<{ member: InterventionOutput[]; totalItems: number }>();
    list.mockReturnValueOnce(late);
    store.load({ organizationId: 'o1', options: {} });
    store.load({ organizationId: 'o2', options: {} });
    late.next({ member: [item('foreign')], totalItems: 999 });
    expect(store.boardInterventionEntityMap()['foreign']).toBeUndefined();
    expect(store.columns().draft?.total).toBe(245);
  });
});
