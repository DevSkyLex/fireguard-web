import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ConnectivityService } from '@core/connectivity';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { MyInterventionsStore } from '@features/organization/features/interventions/state/my-interventions';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { MyInterventionsPage } from '../my-interventions.component';

const MOCK_ORG = { id: 'org-1', name: 'Acme', slug: 'acme' } as OrganizationOutput;
const intervention = { id: 'i-1', name: 'Spring audit', status: 'planned' } as InterventionOutput;

type MyInterventionsPageHarness = {
  openIntervention(intervention: InterventionOutput): void;
  siteLabel(intervention: InterventionOutput): string | null;
};

describe('MyInterventionsPage', () => {
  let store: {
    loading: ReturnType<typeof signal<boolean>>;
    activeInterventions: ReturnType<typeof signal<readonly InterventionOutput[]>>;
    load: ReturnType<typeof vi.fn>;
  };
  let activeOrg: { selectedOrganization: ReturnType<typeof signal<OrganizationOutput | null>> };

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
      loading: signal(false),
      activeInterventions: signal<readonly InterventionOutput[]>([]),
      load: vi.fn(),
    };
    activeOrg = { selectedOrganization: signal<OrganizationOutput | null>(MOCK_ORG) };

    TestBed.configureTestingModule({
      imports: [MyInterventionsPage],
      providers: [
        provideRouter([]),
        { provide: ActiveOrganizationStore, useValue: activeOrg },
        { provide: ConnectivityService, useValue: { online: signal(true) } },
      ],
    }).overrideComponent(MyInterventionsPage, {
      set: { providers: [{ provide: MyInterventionsStore, useValue: store }] },
    });
  });

  it('should create and render the intro and empty state', () => {
    const fixture = TestBed.createComponent(MyInterventionsPage);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain(
      'Planned interventions are prepared for offline use',
    );
    expect(fixture.nativeElement.textContent).toContain('No interventions assigned');
  });

  it('should hide unresolved /api/ site IRIs from the card label', () => {
    const fixture = TestBed.createComponent(MyInterventionsPage);
    const harness = fixture.componentInstance as unknown as MyInterventionsPageHarness;

    expect(harness.siteLabel({ ...intervention, site: '/api/facilities/abc' })).toBeNull();
    expect(harness.siteLabel({ ...intervention, site: 'Warehouse A' })).toBe('Warehouse A');
    expect(harness.siteLabel({ ...intervention, site: null })).toBeNull();
  });

  it('should navigate to the intervention workspace when an organization is active', () => {
    const fixture = TestBed.createComponent(MyInterventionsPage);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as MyInterventionsPageHarness).openIntervention(
      intervention,
    );

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'interventions', 'i-1']);
  });

  it('should not navigate when no organization is active', () => {
    activeOrg.selectedOrganization.set(null);
    const fixture = TestBed.createComponent(MyInterventionsPage);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as MyInterventionsPageHarness).openIntervention(
      intervention,
    );

    expect(navigate).not.toHaveBeenCalled();
  });
});
