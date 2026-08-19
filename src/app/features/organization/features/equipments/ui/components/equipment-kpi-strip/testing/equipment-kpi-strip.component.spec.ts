import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { EquipmentKpiOutput } from '@features/organization/features/equipments/models';
import { EquipmentKpiStrip } from '../equipment-kpi-strip.component';

describe('EquipmentKpiStrip', () => {
  let fixture: ComponentFixture<EquipmentKpiStrip>;

  const KPIS = {
    totalAssets: 40,
    compliant: 30,
    dueSoon: 5,
    openNonConformities: 2,
  } as unknown as EquipmentKpiOutput;

  const render = async (
    statistics: EquipmentKpiOutput | null,
    loading: boolean,
  ): Promise<HTMLElement> => {
    fixture.componentRef.setInput('statistics', statistics);
    fixture.componentRef.setInput('loading', loading);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    fixture = TestBed.createComponent(EquipmentKpiStrip);
  });

  it('should render each metric as a stat tile, hiding its value behind a skeleton while loading', async () => {
    const element: HTMLElement = await render(null, true);

    expect(element.querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(element.textContent).toContain('Total assets');
  });

  it('should render every KPI once loaded', async () => {
    const element: HTMLElement = await render(KPIS, false);
    const text: string = element.textContent ?? '';

    expect(text).toContain('40');
    expect(text).toContain('30');
    expect(text).toContain('5');
    expect(text).toContain('2');
  });

  it('should label the open-non-conformities tile as organization-wide', async () => {
    const element: HTMLElement = await render(KPIS, false);

    expect(element.textContent).toContain('Open non-conformities (organization)');
  });

  it('should announce the loading state to assistive tech rather than staying silent', async () => {
    const element: HTMLElement = await render(null, true);

    const status = element.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent?.trim()).toBeTruthy();
  });

  it('should render no anchors, since no tile has a matching filtered view to link to', async () => {
    const element: HTMLElement = await render(KPIS, false);

    expect(element.querySelectorAll('a').length).toBe(0);
  });

  it('should render zero-filled tiles when statistics is null and not loading', async () => {
    const element: HTMLElement = await render(null, false);
    const text: string = element.textContent ?? '';

    expect(text).toContain('Total assets');
    expect(text).toContain('0');
  });
});
