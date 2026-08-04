import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionStore } from '@features/organization/features/interventions/state';
import { InterventionCalendarStore } from '@features/organization/features/interventions/state/intervention-calendar';
import { InterventionPlanningOptionsStore } from '@features/organization/features/interventions/state/intervention-planning-options';
import type { InterventionCreateFormValues } from '@features/organization/features/interventions/ui/forms';
import type { OrganizationOutput } from '@features/organization/models';
import {
  ActiveOrganizationStore,
  OrganizationMemberAccessStore,
} from '@features/organization/state';
import { InterventionsPage } from '../interventions.component';

const MOCK_ORG = { id: 'org-1', name: 'Acme', slug: 'acme' } as OrganizationOutput;
const created = { id: 'i-9' } as InterventionOutput;

type ItemViewModel = { intervention: InterventionOutput };

type InterventionsPageHarness = {
  view(): 'list' | 'board' | 'calendar';
  q(): string;
  selectView(view: 'list' | 'board' | 'calendar'): void;
  onView(intervention: InterventionOutput): void;
  onItemDropped(event: { item: ItemViewModel; fromColumnId: string; toColumnId: string }): void;
  openCreate(): void;
  openCreateOnDay(day: Date): void;
  submitCreate(values: InterventionCreateFormValues): void;
  items(): readonly ItemViewModel[];
  listGroups(): readonly { id: string; items: readonly ItemViewModel[] }[];
  boardColumns(): readonly { id: string; items: readonly ItemViewModel[] }[];
  showAbandoned: WritableSignal<boolean>;
  canDropCard(item: ItemViewModel, fromColumnId: string, toColumnId: string): boolean;
  createDrawerVisible: WritableSignal<boolean>;
  initialPlannedStartAt: WritableSignal<Date | null>;
};

function intervention(overrides: Partial<InterventionOutput>): InterventionOutput {
  return {
    id: 'i-1',
    organization: '/api/organizations/org-1',
    number: 1,
    type: 'inspection_campaign',
    name: 'Roof check',
    description: null,
    status: 'draft',
    allowedTransitions: ['planned', 'abandoned'],
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
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    '@id': '/api/interventions/i-1',
    '@type': 'Intervention',
    ...overrides,
  } as InterventionOutput;
}

describe('InterventionsPage', () => {
  let store: {
    interventionList: WritableSignal<readonly InterventionOutput[]>;
    totalInterventions: WritableSignal<number>;
    isLoadingInterventions: WritableSignal<boolean>;
    isEmpty: WritableSignal<boolean>;
    listError: WritableSignal<unknown>;
    isListCapped: WritableSignal<boolean>;
    isCreating: WritableSignal<boolean>;
    createError: WritableSignal<unknown>;
    createdIntervention: WritableSignal<InterventionOutput | null>;
    load: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    transition: ReturnType<typeof vi.fn>;
    clearCreatedIntervention: ReturnType<typeof vi.fn>;
  };
  let calendarStore: {
    interventions: WritableSignal<readonly InterventionOutput[]>;
    loading: WritableSignal<boolean>;
    loadError: WritableSignal<unknown>;
    load: ReturnType<typeof vi.fn>;
  };
  let planningOptions: {
    loadCreationOptions: ReturnType<typeof vi.fn>;
    loading: WritableSignal<boolean>;
    sites: WritableSignal<readonly unknown[]>;
    members: WritableSignal<readonly unknown[]>;
  };
  let activeOrg: { selectedOrganization: WritableSignal<OrganizationOutput | null> };
  let memberAccess: { profile: WritableSignal<{ id: string } | null> };
  let permissionService: {
    hasPermission: ReturnType<typeof vi.fn>;
    hasAnyPermission: ReturnType<typeof vi.fn>;
  };

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
      isListCapped: signal(false),
      isCreating: signal(false),
      createError: signal<unknown>(null),
      createdIntervention: signal<InterventionOutput | null>(null),
      load: vi.fn(),
      create: vi.fn(),
      transition: vi.fn(),
      clearCreatedIntervention: vi.fn(),
    };
    calendarStore = {
      interventions: signal<readonly InterventionOutput[]>([]),
      loading: signal(false),
      loadError: signal<unknown>(null),
      load: vi.fn(),
    };
    planningOptions = {
      loadCreationOptions: vi.fn(),
      loading: signal(false),
      sites: signal<readonly unknown[]>([]),
      members: signal<readonly unknown[]>([]),
    };
    activeOrg = { selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG) };
    memberAccess = { profile: signal<{ id: string } | null>({ id: 'm1' }) };
    permissionService = {
      hasPermission: vi.fn().mockReturnValue(true),
      hasAnyPermission: vi.fn().mockReturnValue(true),
    };

    TestBed.configureTestingModule({
      imports: [InterventionsPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {} },
        { provide: ActiveOrganizationStore, useValue: activeOrg },
        { provide: OrganizationMemberAccessStore, useValue: memberAccess },
        { provide: OrganizationPermissionService, useValue: permissionService },
      ],
    }).overrideComponent(InterventionsPage, {
      set: {
        providers: [
          { provide: InterventionStore, useValue: store },
          { provide: InterventionCalendarStore, useValue: calendarStore },
          { provide: InterventionPlanningOptionsStore, useValue: planningOptions },
        ],
      },
    });
  });

  function build(): InterventionsPageHarness {
    const fixture = TestBed.createComponent(InterventionsPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();
    return fixture.componentInstance as unknown as InterventionsPageHarness;
  }

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  it('should default to the list view', () => {
    expect(build().view()).toBe('list');
  });

  it('should load interventions ordered by the default sort and nothing else', () => {
    build();

    expect(store.load).toHaveBeenCalledWith({
      organizationId: 'org-1',
      options: { order: { dueAt: 'asc' } },
    });
  });

  it('should reload with a name filter when the ?q= input changes', () => {
    const fixture = TestBed.createComponent(InterventionsPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    fixture.componentRef.setInput('q', 'roof');
    fixture.detectChanges();

    expect(store.load).toHaveBeenLastCalledWith({
      organizationId: 'org-1',
      options: { order: { dueAt: 'asc' }, name: 'roof' },
    });
  });

  it('should navigate merging ?view= when switching to board', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    build().selectView('board');

    expect(navigate).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { view: 'board' },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('should omit ?view= when switching back to list (the default)', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    build().selectView('list');

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { view: null } }),
    );
  });

  it('should navigate to the intervention detail relative to the current route', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    build().onView({ id: 'i-1' } as InterventionOutput);

    expect(navigate).toHaveBeenCalledWith(['i-1'], { relativeTo: expect.anything() });
  });

  it('should navigate into the workspace when the store publishes the created intervention', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(InterventionsPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.detectChanges();

    store.createdIntervention.set(created);
    fixture.detectChanges();

    expect(store.clearCreatedIntervention).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions', 'i-9']);
  });

  it('should open the drawer without a pre-filled day for the generic action', () => {
    const harness = build();

    harness.openCreate();

    expect(harness.createDrawerVisible()).toBe(true);
    expect(harness.initialPlannedStartAt()).toBeNull();
  });

  it('should pre-fill the planned start when creating from a calendar day', () => {
    const harness = build();

    harness.openCreateOnDay(new Date(2026, 5, 15));

    const prefilled = harness.initialPlannedStartAt();
    expect(prefilled?.getFullYear()).toBe(2026);
    expect(prefilled?.getMonth()).toBe(5);
    expect(prefilled?.getDate()).toBe(15);
    expect(prefilled?.getHours()).toBe(9);
    expect(harness.createDrawerVisible()).toBe(true);
  });

  it('should route creation through the store with the trimmed name', () => {
    build().submitCreate({
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

  describe('grouping', () => {
    it('should group interventions into lifecycle-ordered list sections, omitting empty ones', () => {
      store.interventionList.set([
        intervention({ id: 'a', status: 'draft' }),
        intervention({ id: 'b', status: 'in_progress' }),
        intervention({ id: 'c', status: 'in_progress' }),
      ]);

      const groups = build().listGroups();

      expect(groups.map((group) => group.id)).toEqual(['in_progress', 'draft']);
      expect(groups[0].items).toHaveLength(2);
    });

    it('should merge submitted and changes_requested into a single review board column', () => {
      store.interventionList.set([
        intervention({ id: 'a', status: 'submitted' }),
        intervention({ id: 'b', status: 'changes_requested' }),
        intervention({ id: 'c', status: 'draft' }),
      ]);

      const columns = build().boardColumns();
      const review = columns.find((column) => column.id === 'review');

      expect(columns.map((column) => column.id)).toEqual([
        'draft',
        'planned',
        'in_progress',
        'review',
        'published',
      ]);
      expect(review?.items).toHaveLength(2);
    });

    it('should append a read-only abandoned column only when toggled on', () => {
      store.interventionList.set([intervention({ id: 'a', status: 'abandoned' })]);
      const harness = build();

      expect(harness.boardColumns().some((column) => column.id === 'abandoned')).toBe(false);

      harness.showAbandoned.set(true);

      expect(harness.boardColumns().some((column) => column.id === 'abandoned')).toBe(true);
    });
  });

  describe('canDropCard', () => {
    it('should reject any drop into the published column', () => {
      const harness = build();
      const item = { intervention: intervention({ status: 'in_progress' }) };

      expect(harness.canDropCard(item, 'in_progress', 'published')).toBe(false);
    });

    it('should reject a transition the workflow policy does not allow', () => {
      const harness = build();
      const item = {
        intervention: intervention({
          status: 'draft',
          allowedTransitions: ['planned', 'abandoned'],
        }),
      };

      expect(harness.canDropCard(item, 'draft', 'in_progress')).toBe(false);
    });

    it('should map a drop into review to a submitted transition and require the execute capability', () => {
      const harness = build();
      const item = {
        intervention: intervention({
          status: 'in_progress',
          allowedTransitions: ['submitted', 'abandoned'],
          responsible: '/api/organizations/org-1/members/m1',
        }),
      };

      expect(harness.canDropCard(item, 'in_progress', 'review')).toBe(true);
      expect(permissionService.hasPermission).toHaveBeenCalledWith(
        'organization.interventions.execute',
      );
    });

    it('should reject the transition when the member lacks the required capability', () => {
      permissionService.hasPermission.mockReturnValue(false);
      const harness = build();
      const item = {
        intervention: intervention({
          status: 'in_progress',
          allowedTransitions: ['submitted', 'abandoned'],
        }),
      };

      expect(harness.canDropCard(item, 'in_progress', 'review')).toBe(false);
    });

    it('should reject submitting when the current member is not the responsible agent', () => {
      const harness = build();
      const item = {
        intervention: intervention({
          status: 'in_progress',
          allowedTransitions: ['submitted', 'abandoned'],
          responsible: '/api/organizations/org-1/members/someone-else',
        }),
      };

      expect(harness.canDropCard(item, 'in_progress', 'review')).toBe(false);
    });

    it('should allow submitting when the current member identity is unresolved (server backstop)', () => {
      memberAccess.profile.set(null);
      const harness = build();
      const item = {
        intervention: intervention({
          status: 'in_progress',
          allowedTransitions: ['submitted', 'abandoned'],
          responsible: '/api/organizations/org-1/members/someone-else',
        }),
      };

      expect(harness.canDropCard(item, 'in_progress', 'review')).toBe(true);
    });
  });

  describe('onItemDropped', () => {
    it('should apply a valid drop as a status transition', () => {
      const harness = build();
      const droppedIntervention = intervention({ id: 'i-42', status: 'draft', revision: 3 });

      harness.onItemDropped({
        item: { intervention: droppedIntervention },
        fromColumnId: 'draft',
        toColumnId: 'planned',
      });

      expect(store.transition).toHaveBeenCalledWith({ id: 'i-42', status: 'planned', revision: 3 });
    });

    it('should map a review drop to the submitted status', () => {
      const harness = build();
      const droppedIntervention = intervention({ id: 'i-7', status: 'in_progress', revision: 1 });

      harness.onItemDropped({
        item: { intervention: droppedIntervention },
        fromColumnId: 'in_progress',
        toColumnId: 'review',
      });

      expect(store.transition).toHaveBeenCalledWith({
        id: 'i-7',
        status: 'submitted',
        revision: 1,
      });
    });

    it('should never transition on a drop into the published column', () => {
      const harness = build();

      harness.onItemDropped({
        item: { intervention: intervention({ id: 'i-8' }) },
        fromColumnId: 'draft',
        toColumnId: 'published',
      });

      expect(store.transition).not.toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('should expose no items and empty groups when the store reports an empty list', () => {
      store.isEmpty.set(true);
      store.interventionList.set([]);

      const harness = build();

      expect(harness.items()).toHaveLength(0);
      expect(harness.listGroups()).toHaveLength(0);
      expect(harness.boardColumns().every((column) => column.items.length === 0)).toBe(true);
    });
  });

  describe('rendering', () => {
    it('should render the list view grouped by status', () => {
      store.interventionList.set([
        intervention({ id: 'a', status: 'in_progress', name: 'Roof check' }),
      ]);
      const fixture = TestBed.createComponent(InterventionsPage);
      fixture.componentRef.setInput('organizationId', 'org-1');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Roof check');
    });

    it('should render the loading skeleton for the list view', () => {
      store.isLoadingInterventions.set(true);
      store.isEmpty.set(true);
      const fixture = TestBed.createComponent(InterventionsPage);
      fixture.componentRef.setInput('organizationId', 'org-1');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
    });

    it('should render the loading skeleton for the board view', () => {
      store.isLoadingInterventions.set(true);
      store.isEmpty.set(true);
      const fixture = TestBed.createComponent(InterventionsPage);
      fixture.componentRef.setInput('organizationId', 'org-1');
      fixture.componentRef.setInput('view', 'board');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
    });

    it('should render the search-empty state with a clear-search action', () => {
      store.isEmpty.set(true);
      const fixture = TestBed.createComponent(InterventionsPage);
      fixture.componentRef.setInput('organizationId', 'org-1');
      fixture.componentRef.setInput('q', 'roof');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('No results for');
    });

    it('should render the first-run empty state with a New action', () => {
      store.isEmpty.set(true);
      const fixture = TestBed.createComponent(InterventionsPage);
      fixture.componentRef.setInput('organizationId', 'org-1');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('No interventions yet');
    });

    it('should render the list error banner', () => {
      store.listError.set('Network error');
      const fixture = TestBed.createComponent(InterventionsPage);
      fixture.componentRef.setInput('organizationId', 'org-1');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('could not be loaded');
    });

    it('should render the capped-results notice', () => {
      store.isListCapped.set(true);
      const fixture = TestBed.createComponent(InterventionsPage);
      fixture.componentRef.setInput('organizationId', 'org-1');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('500 most recent interventions');
    });

    it('should render the board view with columns and an abandoned toggle', () => {
      store.interventionList.set([
        intervention({ id: 'a', status: 'draft', name: 'Draft item' }),
        intervention({ id: 'b', status: 'abandoned', name: 'Abandoned item' }),
      ]);
      const fixture = TestBed.createComponent(InterventionsPage);
      fixture.componentRef.setInput('organizationId', 'org-1');
      fixture.componentRef.setInput('view', 'board');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Draft item');
      expect(fixture.nativeElement.textContent).toContain('Show abandoned');
    });

    it('should render the calendar view and its error banner', () => {
      calendarStore.loadError.set('Calendar failed');
      const fixture = TestBed.createComponent(InterventionsPage);
      fixture.componentRef.setInput('organizationId', 'org-1');
      fixture.componentRef.setInput('view', 'calendar');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('calendar could not be loaded');
      expect(fixture.nativeElement.querySelector('app-intervention-calendar')).toBeTruthy();
    });

    it('should render the creation drawer', () => {
      const fixture = TestBed.createComponent(InterventionsPage);
      fixture.componentRef.setInput('organizationId', 'org-1');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('app-intervention-create-drawer')).toBeTruthy();
    });
  });
});
