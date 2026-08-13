import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { InterventionStatisticsOutput } from '@features/organization/features/interventions/models';
import { InterventionKpiStrip } from '../intervention-kpi-strip.component';

describe('InterventionKpiStrip', () => {
  let fixture: ComponentFixture<InterventionKpiStrip>;

  const STATISTICS = {
    total: 42,
    byStatus: {
      draft: 3,
      planned: 5,
      in_progress: 7,
      submitted: 2,
      changes_requested: 1,
      published: 20,
      abandoned: 4,
    },
    byPriority: { low: 10, normal: 20, high: 10, urgent: 2 },
    overdue: 3,
    dueSoon: 6,
    bySite: [],
    byResponsible: [],
    averagePublicationDays: 4.6,
  } as unknown as InterventionStatisticsOutput;

  const render = async (
    statistics: InterventionStatisticsOutput | null,
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
    fixture = TestBed.createComponent(InterventionKpiStrip);
  });

  it('should render each metric as a stat tile, hiding its value behind a skeleton while loading', async () => {
    const element: HTMLElement = await render(null, true);

    expect(element.querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(element.querySelectorAll('p[hlmCardTitle]').length).toBe(0);
    expect(element.textContent).toContain('Total');
  });

  it('should announce the loading state to assistive tech rather than staying silent', async () => {
    const element: HTMLElement = await render(null, true);

    const status = element.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.textContent?.trim()).toBeTruthy();
  });

  it('should render every KPI once loaded, summing the open statuses', async () => {
    const element: HTMLElement = await render(STATISTICS, false);
    const text: string = element.textContent ?? '';

    expect(text).toContain('42');
    expect(text).toContain('13');
    expect(text).toContain('3');
    expect(text).toContain('6');
    expect(text).toContain('4.6');
  });

  it('should mark only the overdue icon with the destructive tone when overdue is above zero, never the surface or the value', async () => {
    const element: HTMLElement = await render(STATISTICS, false);
    const destructiveElements: NodeListOf<Element> = element.querySelectorAll('.text-destructive');

    expect(destructiveElements.length).toBe(1);
    expect(destructiveElements[0]?.tagName.toLowerCase()).toBe('ng-icon');
  });

  it('should stay neutral when nothing is overdue', async () => {
    const element: HTMLElement = await render(
      { ...STATISTICS, overdue: 0 } as InterventionStatisticsOutput,
      false,
    );

    expect(element.querySelectorAll('.text-destructive').length).toBe(0);
  });

  it('should hide the average-publication tile when the backend reports null', async () => {
    const element: HTMLElement = await render(
      { ...STATISTICS, averagePublicationDays: null } as InterventionStatisticsOutput,
      false,
    );

    expect(element.textContent).not.toContain('Avg. publication');
  });

  it('should render zero-filled tiles when statistics is null and not loading', async () => {
    const element: HTMLElement = await render(null, false);
    const text: string = element.textContent ?? '';

    expect(text).toContain('Total');
    expect(text).toContain('0');
  });
});
