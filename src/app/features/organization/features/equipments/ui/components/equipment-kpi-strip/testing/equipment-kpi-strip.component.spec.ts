import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { EquipmentKpiOutput } from '@features/organization/features/equipments/models';
import { EquipmentKpiStrip } from '../equipment-kpi-strip.component';

describe('EquipmentKpiStrip', () => {
  let fixture: ComponentFixture<EquipmentKpiStrip>;
  let mobile: WritableSignal<boolean>;

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
    mobile = signal(false);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { isMobileInteractionMode: mobile },
        },
      ],
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

  it('keeps desktop statistics expanded with the original four stat tiles', async () => {
    const element = await render(KPIS, false);
    expect(
      element
        .querySelector('[data-testid="equipment-kpi-statistics-content"]')
        ?.getAttribute('data-state'),
    ).toBe('open');
    expect(element.querySelectorAll('app-stat-tile').length).toBe(4);
    expect(element.querySelectorAll('dl').length).toBe(0);
  });

  it('starts mobile statistics closed and discloses every value with its exact scope caption', async () => {
    mobile.set(true);
    const element = await render(KPIS, false);
    const trigger = element.querySelector<HTMLButtonElement>(
      '[data-testid="equipment-kpi-statistics-toggle"]',
    );
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(
      element
        .querySelector('[data-testid="equipment-kpi-statistics-content"]')
        ?.getAttribute('data-state'),
    ).toBe('closed');
    trigger?.click();
    await fixture.whenStable();
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelectorAll('app-stat-tile').length).toBe(0);
    expect(element.querySelectorAll('dl').length).toBe(4);
    expect(element.textContent).toContain('Every recorded status');
    expect(element.textContent).toContain('Maintenance up to date');
    expect(element.textContent).toContain('Maintenance approaching');
    const scope = element.querySelector(
      '[data-testid="equipment-kpi-strip-open-non-conformities"]',
    );
    expect(scope?.textContent).toContain('Open non-conformities (organization)');
    expect(scope?.textContent).toContain('Across every inspection, not this list');
    expect(scope?.querySelector('dd')?.textContent?.trim()).toBe('2');
    expect(
      element
        .querySelector('[data-testid="equipment-kpi-strip-total-assets"] dd')
        ?.textContent?.trim(),
    ).toBe('40');
    expect(
      element
        .querySelector('[data-testid="equipment-kpi-strip-compliant"] dd')
        ?.textContent?.trim(),
    ).toBe('30');
    expect(
      element.querySelector('[data-testid="equipment-kpi-strip-due-soon"] dd')?.textContent?.trim(),
    ).toBe('5');
  });

  it('retains the mobile disclosure choice and input snapshot across interaction mode changes', async () => {
    mobile.set(true);
    const element = await render(KPIS, false);
    const trigger = element.querySelector<HTMLButtonElement>(
      '[data-testid="equipment-kpi-statistics-toggle"]',
    );
    trigger?.click();
    await fixture.whenStable();
    mobile.set(false);
    await fixture.whenStable();
    expect(element.querySelectorAll('app-stat-tile').length).toBe(4);
    mobile.set(true);
    await fixture.whenStable();
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
    trigger?.click();
    await fixture.whenStable();
    mobile.set(false);
    await fixture.whenStable();
    mobile.set(true);
    await fixture.whenStable();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.statistics()).toBe(KPIS);
  });

  it('keeps mobile loading values behind skeletons when statistics are disclosed', async () => {
    mobile.set(true);
    const element = await render(null, true);
    element
      .querySelector<HTMLButtonElement>('[data-testid="equipment-kpi-statistics-toggle"]')
      ?.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('dl hlm-skeleton').length).toBe(4);
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Loading key figures');
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
