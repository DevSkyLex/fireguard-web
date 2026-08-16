import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { WorstFacility } from '@features/organization/features/facilities/state';
import { FacilityComplianceWorstSites } from '../facility-compliance-worst-sites.component';

const facility = (overrides: Partial<FacilityOutput> = {}): FacilityOutput =>
  ({
    id: 'facility-1',
    organizationId: 'org-1',
    parentFacilityId: null,
    hasChildren: false,
    type: 'building',
    name: 'North Building',
    code: null,
    status: 'active',
    address: null,
    metadata: {},
    latitude: 48.85,
    longitude: 2.35,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as FacilityOutput;

describe('FacilityComplianceWorstSites', () => {
  let fixture: ComponentFixture<FacilityComplianceWorstSites>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const render = async (entries: readonly WorstFacility[]): Promise<void> => {
    fixture.componentRef.setInput('facilities', entries);
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(FacilityComplianceWorstSites);
  });

  it('shows the empty message when no facility has compliance data', async () => {
    await render([]);

    expect(root().querySelector('[data-testid="facility-map-worst-site"]')).toBeNull();
    expect(root().textContent).toContain('No facilities have compliance data yet.');
  });

  it('renders one row per ranked entry with its rate', async () => {
    await render([
      { facility: facility({ id: 'facility-1', name: 'North Building' }), complianceRate: 42 },
      { facility: facility({ id: 'facility-2', name: 'South Depot' }), complianceRate: 15 },
    ]);

    const rows = root().querySelectorAll('[data-testid="facility-map-worst-site"]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('North Building');
    expect(rows[0].textContent).toContain('42');
    expect(rows[1].textContent).toContain('15');
  });

  it('emits the selected facility when a row is activated', async () => {
    const target = facility({ id: 'facility-2', name: 'South Depot' });
    await render([{ facility: target, complianceRate: 15 }]);

    const emitted: FacilityOutput[] = [];
    fixture.componentInstance.selected.subscribe((selected) => emitted.push(selected));

    root().querySelector<HTMLButtonElement>('[data-testid="facility-map-worst-site"]')?.click();

    expect(emitted).toEqual([target]);
  });
});
