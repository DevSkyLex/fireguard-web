import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { StoreError } from '@core/request-state';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionCalendarStore } from '../../../../state/intervention-calendar';
import { InterventionsCalendarPage } from '../interventions-calendar-page.component';

const intervention = (overrides: Partial<InterventionOutput> = {}): InterventionOutput =>
  ({
    id: 'itv-1',
    organization: '/api/organizations/1',
    number: 101,
    type: 'site_setup',
    name: 'Check the riser',
    description: null,
    status: 'planned',
    allowedTransitions: [],
    site: null,
    responsible: null,
    participants: [],
    labels: [],
    priority: 'normal',
    plannedStartAt: null,
    dueAt: null,
    reviewNote: null,
    revision: 1,
    facilitiesCount: 0,
    equipmentCount: 0,
    inspectionsCount: 0,
    blockersCount: 0,
    workItemsCount: 0,
    completedWorkItemsCount: 0,
    proposedChangesCount: 0,
    commentsCount: 0,
    hasSignature: false,
    createdAt: '2026-08-01T00:00:00+00:00',
    updatedAt: '2026-08-01T00:00:00+00:00',
    ...overrides,
  }) as InterventionOutput;

describe('InterventionsCalendarPage', () => {
  let fixture: ComponentFixture<InterventionsCalendarPage>;
  let interventions: WritableSignal<readonly InterventionOutput[]>;
  let currentMemberIri: WritableSignal<string | null>;
  let loading: WritableSignal<boolean>;
  let loadError: WritableSignal<StoreError | null>;
  let load: ReturnType<typeof vi.fn>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  async function render(
    options: {
      status?: string;
      priority?: string;
      mine?: string;
      interventions?: readonly InterventionOutput[];
      loadError?: StoreError | null;
    } = {},
  ): Promise<void> {
    interventions = signal<readonly InterventionOutput[]>(options.interventions ?? []);
    currentMemberIri = signal<string | null>(null);
    loading = signal<boolean>(false);
    loadError = signal<StoreError | null>(options.loadError ?? null);
    load = vi.fn();

    const storeMock = { interventions, currentMemberIri, loading, loadError, load };

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    TestBed.overrideComponent(InterventionsCalendarPage, {
      remove: { providers: [InterventionCalendarStore] },
      add: { providers: [{ provide: InterventionCalendarStore, useValue: storeMock }] },
    });

    fixture = TestBed.createComponent(InterventionsCalendarPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    if (options.status) fixture.componentRef.setInput('status', options.status);
    if (options.priority) fixture.componentRef.setInput('priority', options.priority);
    if (options.mine) fixture.componentRef.setInput('mine', options.mine);
    await fixture.whenStable();
  }

  it('loads a window spanning the displayed month, one month either side, on arrival', async () => {
    await render();

    expect(load).toHaveBeenCalledTimes(1);
    const command = load.mock.calls[0]?.[0] as {
      organizationId: string;
      window: { after: Date; before: Date };
    };
    expect(command.organizationId).toBe('org-1');

    const now: Date = new Date();
    const expectedAfter: Date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    expect(command.window.after.toDateString()).toBe(expectedAfter.toDateString());
  });

  it('forwards status to the store but drops priority, out of the narrow InterventionCalendarFilters shape', async () => {
    await render({ status: 'planned', priority: 'high' });

    const command = load.mock.calls[0]?.[0] as {
      filters: { status?: unknown; priority?: unknown };
    };
    expect(command.filters.status).toBe('planned');
    expect(command.filters).not.toHaveProperty('priority');
  });

  it('reloads the same month when the operator steps to the next month', async () => {
    await render();
    load.mockClear();

    fixture.componentInstance['stepMonth'](1);
    await fixture.whenStable();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("lists the selected day's interventions in the day panel, placed by plannedStartAt falling back to dueAt", async () => {
    const today: string = new Date().toISOString().slice(0, 10);
    await render({
      interventions: [
        intervention({ id: 'a', name: 'Riser check', plannedStartAt: `${today}T09:00:00+00:00` }),
        intervention({ id: 'b', name: 'Extinguisher swap', dueAt: `${today}T14:00:00+00:00` }),
      ],
    });
    fixture.componentInstance['selectedDay'].set(today);
    await fixture.whenStable();

    const panel = root().querySelector('[data-testid="intervention-calendar-day-panel"]');
    const rows = panel?.querySelectorAll('[data-testid="intervention-calendar-entry"]');
    expect(rows).toHaveLength(2);
    expect(panel?.textContent).toContain('Riser check');
    expect(panel?.textContent).toContain('Extinguisher swap');
  });

  it('scopes the visible interventions to the signed-in member when ?mine=1 and the member IRI resolved', async () => {
    const memberIri = '/api/organizations/org-1/members/m1';
    await render({
      mine: '1',
      interventions: [
        intervention({ id: 'mine', responsible: memberIri }),
        intervention({ id: 'not-mine', responsible: '/api/organizations/org-1/members/m2' }),
      ],
    });
    currentMemberIri.set(memberIri);
    await fixture.whenStable();

    expect(
      fixture.componentInstance['visibleInterventions']().map(
        (item: InterventionOutput) => item.id,
      ),
    ).toEqual(['mine']);
  });

  it('renders the error state and retries the current window on demand', async () => {
    await render({ loadError: { message: 'boom' } as StoreError });

    expect(root().querySelector('[data-testid="intervention-calendar-retry"]')).not.toBeNull();

    load.mockClear();
    root().querySelector<HTMLButtonElement>('[data-testid="intervention-calendar-retry"]')?.click();

    expect(load).toHaveBeenCalledTimes(1);
  });
});
