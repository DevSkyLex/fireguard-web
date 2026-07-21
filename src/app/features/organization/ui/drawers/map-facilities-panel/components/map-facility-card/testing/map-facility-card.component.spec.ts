import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { MapFacilityCard } from '../map-facility-card.component';

const FACILITY: FacilityOutput = {
  id: 'fac-1',
  organizationId: 'org-1',
  name: 'Acme HQ',
  type: 'site',
  status: 'active',
  code: null,
  parentFacilityId: null,
  hasChildren: true,
  address: '10 rue de Rivoli',
  equipmentCount: 128,
  metadata: { city: 'Paris' },
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
} as unknown as FacilityOutput;

const at = (fixture: ComponentFixture<MapFacilityCard>, testId: string): HTMLElement | null =>
  (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);

describe('MapFacilityCard', () => {
  const render = (
    inputs: Partial<{
      facility: FacilityOutput;
      buildingsCount: number;
      complianceRate: number | null;
      selected: boolean;
    }> = {},
  ): ComponentFixture<MapFacilityCard> => {
    TestBed.configureTestingModule({ imports: [MapFacilityCard] });
    const fixture = TestBed.createComponent(MapFacilityCard);
    fixture.componentRef.setInput('facility', inputs.facility ?? FACILITY);
    if (inputs.buildingsCount !== undefined) {
      fixture.componentRef.setInput('buildingsCount', inputs.buildingsCount);
    }
    if (inputs.complianceRate !== undefined) {
      fixture.componentRef.setInput('complianceRate', inputs.complianceRate);
    }
    if (inputs.selected !== undefined) {
      fixture.componentRef.setInput('selected', inputs.selected);
    }
    fixture.detectChanges();
    return fixture;
  };

  it('renders the facility name and city', () => {
    const fixture = render();

    expect(fixture.nativeElement.textContent).toContain('Acme HQ');
    expect(fixture.nativeElement.textContent).toContain('Paris');
  });

  it('collapses the stat tiles, compliance bar and open button until selected', () => {
    const fixture = render();

    expect(at(fixture, 'map-facility-card-buildings')).toBeNull();
    expect(at(fixture, 'map-facility-card-compliance')).toBeNull();
    expect(at(fixture, 'map-facility-card-open')).toBeNull();
  });

  it('renders the compliance percentage next to the name even collapsed, never color alone', () => {
    const fixture = render({ complianceRate: 92 });

    expect(at(fixture, 'map-facility-card-select')?.textContent).toContain('92%');
  });

  it('renders the buildings and equipment stat tiles once selected', () => {
    const fixture = render({ buildingsCount: 3, selected: true });

    expect(at(fixture, 'map-facility-card-buildings')?.textContent).toContain('3');
    expect(at(fixture, 'map-facility-card-equipment')?.textContent).toContain('128');
  });

  it('pairs the compliance color with a text label, never color alone', () => {
    const fixture = render({ complianceRate: 92, selected: true });

    const compliance = at(fixture, 'map-facility-card-compliance');
    expect(compliance?.textContent).toContain('92%');
    expect(compliance?.textContent).toContain('Good');
  });

  it('renders an unmeasured dash rather than a false 0% when compliance is null', () => {
    const fixture = render({ complianceRate: null, selected: true });

    const compliance = at(fixture, 'map-facility-card-compliance');
    expect(compliance?.textContent).toContain('—');
    expect(compliance?.textContent).toContain('Not yet measured');
  });

  it('emits select when the card body is activated', () => {
    const fixture = render();
    const emitted = vi.fn();
    fixture.componentInstance.select.subscribe(emitted);

    at(fixture, 'map-facility-card-select')?.click();

    expect(emitted).toHaveBeenCalled();
  });

  it('emits open when "Open in Facilities" is activated', () => {
    const fixture = render({ selected: true });
    const emitted = vi.fn();
    fixture.componentInstance.open.subscribe(emitted);

    at(fixture, 'map-facility-card-open')?.querySelector('button')?.click();

    expect(emitted).toHaveBeenCalled();
  });

  it('marks the card pressed when selected', () => {
    const fixture = render({ selected: true });

    expect(at(fixture, 'map-facility-card-select')?.getAttribute('aria-pressed')).toBe('true');
  });
});
