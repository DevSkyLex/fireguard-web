import { CUSTOM_ELEMENTS_SCHEMA, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InterventionListOptions,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { InterventionStore } from '@features/organization/features/interventions/state';
import { InterventionBoardStore } from '@features/organization/features/interventions/state/intervention-board';
import { InterventionCalendarStore } from '@features/organization/features/interventions/state/intervention-calendar';
import { InterventionPlanningOptionsStore } from '@features/organization/features/interventions/state/intervention-planning-options';
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
  setView(view: 'board' | 'list' | 'calendar'): void;
  onAdvance(event: {
    intervention: InterventionOutput;
    toStatus: InterventionOutput['status'];
  }): void;
  onAbandon(intervention: InterventionOutput): void;
  onLoadMore(columnId: 'draft' | 'planned' | 'in_progress' | 'review' | 'published'): void;
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
  let boardStore: {
    columns: WritableSignal<readonly unknown[]>;
    loading: WritableSignal<boolean>;
    countsLoading: WritableSignal<boolean>;
    isEmpty: WritableSignal<boolean>;
    loadError: WritableSignal<unknown>;
    loadCounts: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    loadMore: ReturnType<typeof vi.fn>;
    move: ReturnType<typeof vi.fn>;
  };
  let planningOptions: {
    loadCreationOptions: ReturnType<typeof vi.fn>;
    loading: WritableSignal<boolean>;
    sites: WritableSignal<readonly unknown[]>;
    members: WritableSignal<readonly unknown[]>;
  };
  let permissionService: { hasPermission: ReturnType<typeof vi.fn> };
  let confirmationService: { confirm: ReturnType<typeof vi.fn> };
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
    planningOptions = {
      loadCreationOptions: vi.fn(),
      loading: signal(false),
      sites: signal<readonly unknown[]>([]),
      members: signal<readonly unknown[]>([]),
    };
    boardStore = {
      columns: signal<readonly unknown[]>([]),
      loading: signal(false),
      countsLoading: signal(false),
      isEmpty: signal(false),
      loadError: signal<unknown>(null),
      loadCounts: vi.fn(),
      load: vi.fn(),
      loadMore: vi.fn(),
      move: vi.fn(),
    };
    permissionService = { hasPermission: vi.fn().mockReturnValue(true) };
    confirmationService = { confirm: vi.fn() };
    activeOrg = { selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG) };

    TestBed.configureTestingModule({
      imports: [InterventionsPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {} },
        { provide: ActiveOrganizationStore, useValue: activeOrg },
        { provide: OrganizationPermissionService, useValue: permissionService },
        { provide: ConfirmationService, useValue: confirmationService },
      ],
    }).overrideComponent(InterventionsPage, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          { provide: InterventionStore, useValue: store },
          { provide: InterventionBoardStore, useValue: boardStore },
          { provide: InterventionCalendarStore, useValue: calendarStore },
          { provide: InterventionPlanningOptionsStore, useValue: planningOptions },
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

  it('should not load the calendar dataset while the list view is active', () => {
    build();

    expect(calendarStore.load).not.toHaveBeenCalled();
  });

  it('should lazily load the calendar dataset for a bounded window when the calendar view becomes active', () => {
    const fixture = TestBed.createComponent(InterventionsPage);
    fixture.componentRef.setInput('view', 'calendar');
    fixture.detectChanges();

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

  it('should switch to the calendar view through the view query param', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    build().setView('calendar');

    expect(navigate).toHaveBeenCalledWith(
      ['/organizations', 'org-1', 'interventions'],
      expect.objectContaining({ queryParams: { view: 'calendar', page: null } }),
    );
  });

  it('should cycle to the next view when the V shortcut is pressed', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    build();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));

    expect(navigate).toHaveBeenCalledWith(
      ['/organizations', 'org-1', 'interventions'],
      expect.objectContaining({ queryParams: { view: 'list', page: null } }),
    );
  });

  it('should lazily load the board dataset by default', () => {
    build();

    expect(boardStore.load).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('should refresh the metric counts regardless of the active view', () => {
    const fixture = TestBed.createComponent(InterventionsPage);
    fixture.componentRef.setInput('view', 'list');
    fixture.detectChanges();

    expect(boardStore.loadCounts).toHaveBeenCalledWith({ organizationId: 'org-1' });
    expect(boardStore.load).not.toHaveBeenCalled();
  });

  it('should reveal the next lane page through the board store', () => {
    build().onLoadMore('published');

    expect(boardStore.loadMore).toHaveBeenCalledWith({
      organizationId: 'org-1',
      columnId: 'published',
    });
  });

  it('should apply an optimistic advance through the board store', () => {
    const intervention = { id: 'i-3', status: 'draft' } as InterventionOutput;

    build().onAdvance({ intervention, toStatus: 'planned' });

    expect(boardStore.move).toHaveBeenCalledWith({ intervention, toStatus: 'planned' });
  });

  it('should ignore the V shortcut while typing in a field', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    build();

    const input: HTMLInputElement = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
    input.remove();

    expect(navigate).not.toHaveBeenCalled();
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

  it('should confirm before abandoning a board card and move it on accept', () => {
    const intervention = { id: 'i-4', status: 'draft' } as InterventionOutput;

    build().onAbandon(intervention);

    expect(confirmationService.confirm).toHaveBeenCalledTimes(1);
    const config = confirmationService.confirm.mock.calls[0][0] as { accept?: () => void };
    expect(boardStore.move).not.toHaveBeenCalled();

    config.accept?.();
    expect(boardStore.move).toHaveBeenCalledWith({ intervention, toStatus: 'abandoned' });
  });
});
