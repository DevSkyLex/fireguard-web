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

  const BASE_ROUTE = ['/organizations', 'org-1', 'interventions'];

  const render = async (
    statistics: InterventionStatisticsOutput | null,
    loading: boolean,
  ): Promise<HTMLElement> => {
    fixture.componentRef.setInput('statistics', statistics);
    fixture.componentRef.setInput('loading', loading);
    fixture.componentRef.setInput('baseRoute', BASE_ROUTE);
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
    expect(element.textContent).toContain('Open');
  });

  it('should render a footer caption on every tile, stating a stable fact rather than a fabricated trend', async () => {
    const element: HTMLElement = await render(STATISTICS, false);

    expect(element.querySelectorAll('[hlmCardFooter]').length).toBe(4);
    expect(element.textContent).toContain('In progress work');
    expect(element.textContent).toContain('Past due date');
    expect(element.textContent).toContain('Due within 48h');
    expect(element.textContent).toContain('Submitted for review');
  });

  it('should render no icon beside any footer caption, since the caption text already states it', async () => {
    const element: HTMLElement = await render(STATISTICS, false);

    for (const footer of Array.from(element.querySelectorAll('[hlmCardFooter]'))) {
      expect(footer.querySelector('ng-icon')).toBeNull();
    }
  });

  it('should badge the open tile with its honest share of the total, and omit it when there is nothing to divide', async () => {
    const withTotal: HTMLElement = await render(STATISTICS, false);
    const openBadge: HTMLElement | null = withTotal.querySelector(
      '[data-testid="intervention-kpi-strip-open"] [hlmBadge]',
    );

    expect(openBadge?.textContent).toContain('31% of total');

    const withoutTotal: HTMLElement = await render(
      { ...STATISTICS, total: 0 } as InterventionStatisticsOutput,
      false,
    );
    expect(
      withoutTotal.querySelector('[data-testid="intervention-kpi-strip-open"] [hlmBadge]'),
    ).toBeNull();
  });

  it('should badge the overdue and awaiting-review tiles honestly in both states, never inventing a delta', async () => {
    const busy: HTMLElement = await render(STATISTICS, false);

    expect(
      busy.querySelector('[data-testid="intervention-kpi-strip-overdue"] [hlmBadge]')?.textContent,
    ).toContain('Needs attention');
    expect(
      busy.querySelector('[data-testid="intervention-kpi-strip-awaiting-review"] [hlmBadge]')
        ?.textContent,
    ).toContain('To review');

    const clear: HTMLElement = await render(
      {
        ...STATISTICS,
        overdue: 0,
        byStatus: { ...STATISTICS.byStatus, submitted: 0 },
      } as unknown as InterventionStatisticsOutput,
      false,
    );

    expect(
      clear.querySelector('[data-testid="intervention-kpi-strip-overdue"] [hlmBadge]')?.textContent,
    ).toContain('On track');
    expect(
      clear.querySelector('[data-testid="intervention-kpi-strip-awaiting-review"] [hlmBadge]')
        ?.textContent,
    ).toContain('Nothing pending');
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

    expect(text).toContain('13');
    expect(text).toContain('3');
    expect(text).toContain('6');
    expect(text).toContain('2');
  });

  it('should link the overdue and awaiting-review tiles into the matching segmented view, leaving the rest inert', async () => {
    const element: HTMLElement = await render(STATISTICS, false);

    const overdueLink: HTMLAnchorElement | null = element.querySelector(
      '[data-testid="intervention-kpi-strip-overdue"] a',
    );
    const awaitingReviewLink: HTMLAnchorElement | null = element.querySelector(
      '[data-testid="intervention-kpi-strip-awaiting-review"] a',
    );
    const openLink: HTMLAnchorElement | null = element.querySelector(
      '[data-testid="intervention-kpi-strip-open"] a',
    );

    expect(overdueLink?.getAttribute('href')).toBe(
      '/organizations/org-1/interventions?due=overdue',
    );
    expect(awaitingReviewLink?.getAttribute('href')).toBe(
      '/organizations/org-1/interventions?status=submitted',
    );
    expect(openLink).toBeNull();
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

  it('should render zero-filled tiles when statistics is null and not loading', async () => {
    const element: HTMLElement = await render(null, false);
    const text: string = element.textContent ?? '';

    expect(text).toContain('Open');
    expect(text).toContain('0');
  });
});
