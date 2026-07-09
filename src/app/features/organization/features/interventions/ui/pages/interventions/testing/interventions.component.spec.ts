import { CUSTOM_ELEMENTS_SCHEMA, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import type {
  InterventionListOptions,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { InterventionStore } from '@features/organization/features/interventions/state';
import { InterventionCalendarStore } from '@features/organization/features/interventions/state/intervention-calendar';
import { InterventionPlanningOptionsStore } from '@features/organization/features/interventions/state/intervention-planning-options';
import { InterventionSummaryStore } from '@features/organization/features/interventions/state/intervention-summary';
import type { InterventionCreateFormValues } from '@features/organization/features/interventions/ui/forms';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { InterventionsPage } from '../interventions.component';

const MOCK_ORG = { id: 'org-1', name: 'Acme', slug: 'acme' } as OrganizationOutput;
const created = { id: 'i-9' } as InterventionOutput;

type InterventionsPageHarness = {
  onView(intervention: InterventionOutput): void;
  onLoad(options: InterventionListOptions): void;
  openCreate(): void;
  openCreateOnDay(day: Date): void;
  create(values: InterventionCreateFormValues): void;
  createDrawerVisible: WritableSignal<boolean>;
  initialPlannedStartAt: WritableSignal<Date | null>;
};

describe('InterventionsPage', () => {
  let store: {
    interventionList: WritableSignal<readonly InterventionOutput[]>;
    totalInterventions: WritableSignal<number>;
    isLoadingInterventions: WritableSignal<boolean>;
    isEmpty: WritableSignal<boolean>;
    listError: WritableSignal<unknown>;
    isCreating: WritableSignal<boolean>;
    createdIntervention: WritableSignal<InterventionOutput | null>;
    load: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    clearCreatedIntervention: ReturnType<typeof vi.fn>;
  };
  let calendarStore: {
    interventions: WritableSignal<readonly InterventionOutput[]>;
    currentMemberIri: WritableSignal<string | null>;
    loading: WritableSignal<boolean>;
    load: ReturnType<typeof vi.fn>;
  };
  let summaryStore: {
    inProgressCount: WritableSignal<number>;
    plannedCount: WritableSignal<number>;
    overdueCount: WritableSignal<number>;
    blockedCount: WritableSignal<number>;
    loading: WritableSignal<boolean>;
    load: ReturnType<typeof vi.fn>;
  };
  let planningOptions: {
    loadCreationOptions: ReturnType<typeof vi.fn>;
    loading: WritableSignal<boolean>;
    sites: WritableSignal<readonly unknown[]>;
    members: WritableSignal<readonly unknown[]>;
  };
  let activeOrg: { selectedOrganization: WritableSignal<OrganizationOutput | null> };

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    });
  });

  beforeEach(() => {
    store = {
      interventionList: signal<readonly InterventionOutput[]>([]),
      totalInterventions: signal(0),
      isLoadingInterventions: signal(false),
      isEmpty: signal(false),
      listError: signal<unknown>(null),
      isCreating: signal(false),
      createdIntervention: signal<InterventionOutput | null>(null),
      load: vi.fn(),
      create: vi.fn(),
      clearCreatedIntervention: vi.fn(),
    };
    calendarStore = {
      interventions: signal<readonly InterventionOutput[]>([]),
      currentMemberIri: signal<string | null>('/api/organizations/org-1/members/m1'),
      loading: signal(false),
      load: vi.fn(),
    };
    summaryStore = {
      inProgressCount: signal(0),
      plannedCount: signal(0),
      overdueCount: signal(0),
      blockedCount: signal(0),
      loading: signal(false),
      load: vi.fn(),
    };
    planningOptions = {
      loadCreationOptions: vi.fn(),
      loading: signal(false),
      sites: signal<readonly unknown[]>([]),
      members: signal<readonly unknown[]>([]),
    };
    activeOrg = { selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG) };

    TestBed.configureTestingModule({
      imports: [InterventionsPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {} },
        { provide: ActiveOrganizationStore, useValue: activeOrg },
      ],
    }).overrideComponent(InterventionsPage, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          { provide: InterventionStore, useValue: store },
          { provide: InterventionCalendarStore, useValue: calendarStore },
          { provide: InterventionPlanningOptionsStore, useValue: planningOptions },
          { provide: InterventionSummaryStore, useValue: summaryStore },
        ],
      },
    });
  });

  function build(): InterventionsPageHarness {
    const fixture = TestBed.createComponent(InterventionsPage);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as InterventionsPageHarness;
  }

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  it('should load the calendar dataset for a bounded window on the active organization', () => {
    build();

    expect(calendarStore.load).toHaveBeenCalledTimes(1);
    const request = calendarStore.load.mock.calls[0][0] as {
      organizationId: string | null;
      window: { after: Date; before: Date };
    };
    expect(request.organizationId).toBe('org-1');
    expect(request.window.after).toBeInstanceOf(Date);
    expect(request.window.before).toBeInstanceOf(Date);
    expect(request.window.after.getTime()).toBeLessThan(request.window.before.getTime());
  });

  it('should load the workflow-health metric strip for the active organization', () => {
    build();

    expect(summaryStore.load).toHaveBeenCalledWith('org-1');
  });

  it('should forward a lazy-load request to the table store for the active organization', () => {
    build().onLoad({ page: 2, itemsPerPage: 12 });

    expect(store.load).toHaveBeenCalledWith({
      organizationId: 'org-1',
      options: { page: 2, itemsPerPage: 12 },
    });
  });

  it('should not load without an active organization', () => {
    activeOrg.selectedOrganization.set(null);

    build().onLoad({ page: 1, itemsPerPage: 12 });

    expect(store.load).not.toHaveBeenCalled();
  });

  it('should navigate to the intervention detail when an intervention is viewed', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    build().onView({ id: 'i-1' } as InterventionOutput);

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions', 'i-1']);
  });

  it('should lazily load creation options when the drawer opens', () => {
    build().openCreate();

    expect(planningOptions.loadCreationOptions).toHaveBeenCalledWith('org-1');
  });

  it('should pre-fill the planned start and open the drawer when creating from a day', () => {
    const harness = build();

    harness.openCreateOnDay(new Date(2026, 5, 15));

    const prefilled = harness.initialPlannedStartAt();
    expect(prefilled?.getFullYear()).toBe(2026);
    expect(prefilled?.getMonth()).toBe(5);
    expect(prefilled?.getDate()).toBe(15);
    expect(prefilled?.getHours()).toBe(9);
    expect(harness.createDrawerVisible()).toBe(true);
    expect(planningOptions.loadCreationOptions).toHaveBeenCalledWith('org-1');
  });

  it('should route creation through the store with the trimmed name', () => {
    build().create({
      name: '  Roof check  ',
      type: 'inspection_campaign',
      priority: 'normal',
      participants: [],
      site: null,
      responsible: null,
      plannedStartAt: null,
      dueAt: null,
    } as unknown as InterventionCreateFormValues);

    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', name: 'Roof check' }),
    );
  });

  it('should navigate into the workspace when the store publishes the created intervention', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(InterventionsPage);
    fixture.detectChanges();

    store.createdIntervention.set(created);
    fixture.detectChanges();

    expect(store.clearCreatedIntervention).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions', 'i-9']);
  });
});
