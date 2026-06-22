import { CUSTOM_ELEMENTS_SCHEMA, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionListOptions,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { InterventionStore } from '@features/organization/features/interventions/state';
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
  setView(view: 'list' | 'calendar'): void;
  createDrawerVisible: WritableSignal<boolean>;
  initialPlannedStartAt: WritableSignal<Date | null>;
};

describe('InterventionsPage', () => {
  let store: {
    interventionList: WritableSignal<readonly InterventionOutput[]>;
    totalInterventions: WritableSignal<number>;
    isLoadingInterventions: WritableSignal<boolean>;
    isEmpty: WritableSignal<boolean>;
    load: ReturnType<typeof vi.fn>;
  };
  let calendarStore: {
    interventions: WritableSignal<readonly InterventionOutput[]>;
    currentMemberIri: WritableSignal<string | null>;
    loading: WritableSignal<boolean>;
    load: ReturnType<typeof vi.fn>;
  };
  let planningOptions: {
    loadCreationOptions: ReturnType<typeof vi.fn>;
    loading: WritableSignal<boolean>;
    sites: WritableSignal<readonly unknown[]>;
    members: WritableSignal<readonly unknown[]>;
  };
  let interventions: { create: ReturnType<typeof vi.fn> };
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
      load: vi.fn(),
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
    interventions = { create: vi.fn().mockReturnValue(of(created)) };
    activeOrg = { selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG) };

    TestBed.configureTestingModule({
      imports: [InterventionsPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {} },
        { provide: ActiveOrganizationStore, useValue: activeOrg },
        { provide: InterventionService, useValue: interventions },
      ],
    }).overrideComponent(InterventionsPage, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
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

  it('should lazily load the calendar dataset when the calendar view becomes active', () => {
    const fixture = TestBed.createComponent(InterventionsPage);
    fixture.componentRef.setInput('view', 'calendar');
    fixture.detectChanges();

    expect(calendarStore.load).toHaveBeenCalledWith({ organizationId: 'org-1' });
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

  it('should toggle the view when the V shortcut is pressed', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    build();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));

    expect(navigate).toHaveBeenCalledWith(
      ['/organizations', 'org-1', 'interventions'],
      expect.objectContaining({ queryParams: { view: 'calendar', page: null } }),
    );
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

  it('should create an intervention and navigate into its workspace on success', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    build().create({
      name: '  Roof check  ',
      type: 'inspection',
      priority: 'normal',
      participants: [],
      site: null,
      responsible: null,
      plannedStartAt: null,
      dueAt: null,
    } as unknown as InterventionCreateFormValues);

    expect(interventions.create).toHaveBeenCalledWith('org-1', 'Roof check', expect.any(Object));
    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions', 'i-9']);
  });
});
