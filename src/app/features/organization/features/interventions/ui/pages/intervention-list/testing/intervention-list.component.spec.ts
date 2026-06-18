import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import type {
  InterventionOutput,
  InterventionListOptions,
} from '@features/organization/features/interventions/models';
import { InterventionStore } from '@features/organization/features/interventions/state';
import { InterventionPlanningOptionsStore } from '@features/organization/features/interventions/state/intervention-planning-options';
import type { InterventionCreateFormValues } from '@features/organization/features/interventions/ui/forms';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { InterventionListPage } from '../intervention-list.component';

const MOCK_ORG = { id: 'org-1', name: 'Acme', slug: 'acme' } as OrganizationOutput;
const created = { id: 'i-9' } as InterventionOutput;

type InterventionListPageHarness = {
  onView(intervention: InterventionOutput): void;
  onLoad(options: InterventionListOptions): void;
  openCreateDrawer(): void;
  create(values: InterventionCreateFormValues): void;
};

describe('InterventionListPage', () => {
  let store: { load: ReturnType<typeof vi.fn> };
  let planningOptions: { loadCreationOptions: ReturnType<typeof vi.fn> };
  let interventions: { create: ReturnType<typeof vi.fn> };
  let activeOrg: { selectedOrganization: ReturnType<typeof signal<OrganizationOutput | null>> };

  function build(): InterventionListPageHarness {
    const fixture = TestBed.createComponent(InterventionListPage);
    return fixture.componentInstance as unknown as InterventionListPageHarness;
  }

  beforeEach(() => {
    store = { load: vi.fn() };
    planningOptions = { loadCreationOptions: vi.fn() };
    interventions = { create: vi.fn().mockReturnValue(of(created)) };
    activeOrg = { selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG) };

    TestBed.configureTestingModule({
      imports: [InterventionListPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {} },
        { provide: ActiveOrganizationStore, useValue: activeOrg },
        { provide: InterventionService, useValue: interventions },
      ],
    }).overrideComponent(InterventionListPage, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
        providers: [
          { provide: InterventionStore, useValue: store },
          { provide: InterventionPlanningOptionsStore, useValue: planningOptions },
        ],
      },
    });
  });

  it('should create', () => {
    expect(build()).toBeTruthy();
  });

  it('should forward a lazy-load request to the store for the active organization', () => {
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

  it('should navigate to the intervention detail when a row is viewed', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    build().onView({ id: 'i-1' } as InterventionOutput);

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions', 'i-1']);
  });

  it('should lazily load creation options when the drawer opens', () => {
    build().openCreateDrawer();

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
