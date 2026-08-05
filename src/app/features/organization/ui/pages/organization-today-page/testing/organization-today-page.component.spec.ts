import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InterventionOutput,
  InterventionQueue,
} from '@features/organization/features/interventions/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { OrganizationTodayStore } from '@features/organization/state/organization-today';
import { OrganizationTodayPage } from '../organization-today-page.component';

/**
 * Builds the minimum of an intervention the page reads.
 */
function intervention(id: string, dueAt: string | null): InterventionOutput {
  return { id, number: 101, name: 'Check the riser', dueAt } as InterventionOutput;
}

/**
 * Builds an empty queue for a key the test does not care about.
 */
function emptyQueue(): InterventionQueue {
  return { key: 'overdue', total: 0, items: [] } as InterventionQueue;
}

describe('OrganizationTodayPage', () => {
  let fixture: ComponentFixture<OrganizationTodayPage>;
  let overdue: WritableSignal<InterventionQueue>;
  let permissions: WritableSignal<ReadonlyArray<string>>;
  let load: ReturnType<typeof vi.fn>;
  let loadUnsynced: ReturnType<typeof vi.fn>;
  let navigate: MockInstance;

  beforeEach(async () => {
    overdue = signal<InterventionQueue>(emptyQueue());
    permissions = signal<ReadonlyArray<string>>([
      ORGANIZATION_PERMISSION.INTERVENTIONS_READ,
      ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
    ]);
    load = vi.fn();
    loadUnsynced = vi.fn();

    const mockStore = {
      overdue,
      changesRequested: signal<InterventionQueue>(emptyQueue()),
      awaitingReview: signal<InterventionQueue>(emptyQueue()),
      upcoming: signal<InterventionQueue>(emptyQueue()),
      unsynced: signal([]),
      isLoading: signal(false),
      hasError: signal(false),
      isAllClear: signal(false),
      loadParams: signal<string | undefined>('org-1'),
      load,
      loadUnsynced,
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: {
            selectedOrganizationId: signal<string | null>('org-1'),
            selectedOrganization: signal({ name: 'Acme Corp' }),
            isLoadingOrganization: signal(false),
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: {
            permissions,
            hasPermission: (permission: string): boolean => permissions().includes(permission),
          },
        },
      ],
    });

    TestBed.overrideComponent(OrganizationTodayPage, {
      set: { providers: [{ provide: OrganizationTodayStore, useValue: mockStore }] },
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(OrganizationTodayPage);
    await fixture.whenStable();
  });

  it('should name the organization it reports on', () => {
    expect(fixture.nativeElement.textContent).toContain('Acme Corp');
  });

  it('should compute how late an overdue intervention is', async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    overdue.set({ key: 'overdue', total: 1, items: [intervention('i-1', threeDaysAgo)] });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('3 days late');
  });

  it('should leave an intervention without a due date unannotated', async () => {
    overdue.set({ key: 'overdue', total: 1, items: [intervention('i-1', null)] });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('days late');
  });

  it('should open one intervention under the routed organization', () => {
    fixture.componentInstance['openIntervention'](intervention('i-1', null));

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions', 'i-1']);
  });

  it('should open the full intervention list', () => {
    fixture.componentInstance['openInterventions']();

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions']);
  });

  it('should re-run both queue loads on retry', () => {
    // The local queue loads separately so it survives a network failure; a
    // retry that skipped it would leave the page half-refreshed.
    fixture.componentInstance['retryQueues']();

    expect(load).toHaveBeenCalledWith('org-1');
    expect(loadUnsynced).toHaveBeenCalledWith('org-1');
  });

  it('should hide the queues from a member who cannot read interventions', async () => {
    permissions.set([ORGANIZATION_PERMISSION.DASHBOARD_READ]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-organization-today-queue')).toBeNull();
  });
});
