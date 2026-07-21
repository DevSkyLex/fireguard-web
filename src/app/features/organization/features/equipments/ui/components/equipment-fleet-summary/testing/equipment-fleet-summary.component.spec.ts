import { TestBed } from '@angular/core/testing';
import type { EquipmentKpiOutput } from '@features/organization/features/equipments/models';
import { EquipmentFleetSummary } from '../equipment-fleet-summary.component';

const KPIS = {
  totalAssets: 85,
  compliant: 78,
  dueSoon: 5,
  openNonConformities: 2,
} as EquipmentKpiOutput;

describe('EquipmentFleetSummary', () => {
  const createComponent = (kpis: EquipmentKpiOutput | null, loading = false) => {
    TestBed.configureTestingModule({ imports: [EquipmentFleetSummary] });

    const fixture = TestBed.createComponent(EquipmentFleetSummary);
    fixture.componentRef.setInput('kpis', kpis);
    fixture.componentRef.setInput('loading', loading);
    fixture.detectChanges();
    return fixture;
  };

  it('should render the four KPI cards with their values', () => {
    const text: string = createComponent(KPIS).nativeElement.textContent ?? '';

    expect(text).toContain('85');
    expect(text).toContain('78');
    expect(text).toContain('5');
    expect(text).toContain('2');
  });

  it('should render the organization-wide non-conformity count as its own card', () => {
    const fixture = createComponent(KPIS);
    const strip: Element | null = fixture.nativeElement.querySelector(
      '[data-testid="equipment-kpi-strip"]',
    );

    expect(strip).not.toBeNull();
    expect(strip?.textContent).toContain('2');
  });

  it('should render the computed compliant percentage as the compliant card subtitle', () => {
    const text: string = createComponent(KPIS).nativeElement.textContent ?? '';

    // 78 / 85 rounds to 92%.
    expect(text).toContain('92%');
  });

  it('should render four loading cards while the counters are in flight', () => {
    const fixture = createComponent(null, true);
    const cards: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('app-metric-card');

    expect(cards.length).toBe(4);
  });

  it('should render nothing when there is no data and no load in flight', () => {
    const fixture = createComponent(null, false);

    expect(fixture.nativeElement.querySelector('[data-testid="equipment-kpi-strip"]')).toBeNull();
  });

  it('should render a zero counter rather than hiding it', () => {
    const fixture = createComponent({ ...KPIS, dueSoon: 0 } as EquipmentKpiOutput);

    expect(fixture.nativeElement.textContent).toContain('0');
  });
});
