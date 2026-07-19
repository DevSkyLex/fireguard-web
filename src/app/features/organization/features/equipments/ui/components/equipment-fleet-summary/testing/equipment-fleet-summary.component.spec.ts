import { TestBed } from '@angular/core/testing';
import type { EquipmentKpiOutput } from '@features/organization/features/equipments/models';
import { EquipmentFleetSummary } from '../equipment-fleet-summary.component';

const KPIS = {
  totalAssets: 40,
  compliant: 28,
  dueSoon: 4,
  openNonConformities: 12,
} as EquipmentKpiOutput;

describe('EquipmentFleetSummary', () => {
  const createComponent = (kpis: EquipmentKpiOutput | null) => {
    TestBed.configureTestingModule({ imports: [EquipmentFleetSummary] });

    const fixture = TestBed.createComponent(EquipmentFleetSummary);
    fixture.componentRef.setInput('kpis', kpis);
    fixture.detectChanges();
    return fixture;
  };

  it('should render the three fleet counters', () => {
    const text: string = createComponent(KPIS).nativeElement.textContent ?? '';

    expect(text).toContain('40');
    expect(text).toContain('28');
    expect(text).toContain('4');
  });

  // The backend computes openNonConformities organization-wide because
  // non-conformities attach to inspections, not equipment. Beside equipment
  // counters it would read as a per-asset figure it is not.
  it('should not show the organization-wide non-conformity count', () => {
    expect(createComponent(KPIS).nativeElement.textContent ?? '').not.toContain('12');
  });

  // The summary is secondary to the table: while it loads it stays out of the
  // way rather than reserving space with a skeleton.
  it('should render nothing before the counters arrive', () => {
    const fixture = createComponent(null);

    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });

  it('should render a zero counter rather than hiding it', () => {
    const fixture = createComponent({ ...KPIS, dueSoon: 0 } as EquipmentKpiOutput);

    expect(fixture.nativeElement.textContent).toContain('0');
  });
});
