import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
import { InterventionSummaryStore } from '../intervention-summary.store';

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

const HOUR_MS = 60 * 60 * 1000;
const past: string = new Date(Date.now() - 24 * HOUR_MS).toISOString();
const future: string = new Date(Date.now() + 24 * HOUR_MS).toISOString();

/**
 * Builds an intervention fixture with only the fields the summary metrics read.
 *
 * @param {Partial<InterventionOutput>} overrides - Field overrides.
 * @returns {InterventionOutput} Intervention fixture.
 */
function intervention(overrides: {
  id: string;
  status: InterventionStatus;
  dueAt?: string | null;
  blockersCount?: number;
}): InterventionOutput {
  return {
    id: overrides.id,
    status: overrides.status,
    dueAt: overrides.dueAt ?? null,
    blockersCount: overrides.blockersCount ?? 0,
  } as unknown as InterventionOutput;
}

const DATASET: readonly InterventionOutput[] = [
  intervention({ id: 'a', status: 'in_progress' }),
  intervention({ id: 'b', status: 'planned' }),
  intervention({ id: 'c', status: 'planned' }),
  intervention({ id: 'd', status: 'submitted', dueAt: past }), // overdue
  intervention({ id: 'e', status: 'draft', dueAt: past, blockersCount: 2 }), // overdue + blocked
  intervention({ id: 'f', status: 'in_progress', dueAt: future }), // not overdue
  intervention({ id: 'g', status: 'published', dueAt: past, blockersCount: 5 }), // terminal → excluded
  intervention({ id: 'h', status: 'abandoned', dueAt: past }), // terminal → excluded
];

describe('InterventionSummaryStore', () => {
  let store: InstanceType<typeof InterventionSummaryStore>;
  let service: { listAll: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    service = { listAll: vi.fn().mockReturnValue(of(DATASET)) };

    TestBed.configureTestingModule({
      providers: [InterventionSummaryStore, { provide: InterventionService, useValue: service }],
    });

    store = TestBed.inject(InterventionSummaryStore);
  });

  it('should derive the workflow-health KPIs from the full organization set', async () => {
    store.load('org-1');
    await flush();

    expect(service.listAll).toHaveBeenCalledWith('org-1');
    expect(store.total()).toBe(8);
    expect(store.inProgressCount()).toBe(2);
    expect(store.plannedCount()).toBe(2);
    expect(store.overdueCount()).toBe(2);
    expect(store.blockedCount()).toBe(1);
    expect(store.loading()).toBe(false);
  });

  it('should short-circuit to empty metrics without an organization', async () => {
    store.load(null);
    await flush();

    expect(service.listAll).not.toHaveBeenCalled();
    expect(store.total()).toBe(0);
    expect(store.overdueCount()).toBe(0);
    expect(store.blockedCount()).toBe(0);
  });

  it('should surface a load failure as an error query state', async () => {
    service.listAll.mockReturnValueOnce(throwError(() => new Error('boom')));

    store.load('org-1');
    await flush();

    expect(store.queryHasError()).toBe(true);
    expect(store.total()).toBe(0);
  });
});
