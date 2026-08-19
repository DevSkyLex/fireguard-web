import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { InterventionStatisticsOutput } from '@features/organization/features/interventions/models';
import { InterventionStatisticsAnalysis } from '../intervention-statistics-analysis.component';

describe('InterventionStatisticsAnalysis', () => {
  let fixture: ComponentFixture<InterventionStatisticsAnalysis>;

  const STATISTICS = {
    total: 8,
    byStatus: {
      draft: 1,
      planned: 1,
      in_progress: 1,
      submitted: 1,
      changes_requested: 1,
      published: 2,
      abandoned: 1,
    },
    byPriority: { low: 2, normal: 3, high: 2, urgent: 1 },
    overdue: 1,
    dueSoon: 1,
    bySite: [
      { siteId: 'site-1', siteName: 'Main warehouse', count: 5 },
      { siteId: 'site-2', siteName: null, count: 2 },
    ],
    byResponsible: [
      { memberId: 'member-1', displayName: 'Ada Lovelace', count: 4 },
      { memberId: 'member-2', displayName: null, count: 1 },
    ],
    averagePublicationDays: 3.25,
  } as unknown as InterventionStatisticsOutput;

  const render = async (
    statistics: InterventionStatisticsOutput | null,
    organizationId: string = 'org-1',
  ): Promise<HTMLElement> => {
    fixture.componentRef.setInput('statistics', statistics);
    fixture.componentRef.setInput('organizationId', organizationId);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    fixture = TestBed.createComponent(InterventionStatisticsAnalysis);
  });

  it('should render every priority with a zero-filled count, even one absent from the snapshot', async () => {
    const element: HTMLElement = await render({
      ...STATISTICS,
      byPriority: { low: 0, normal: 0, high: 0, urgent: 0 },
    } as InterventionStatisticsOutput);

    const rows: NodeListOf<Element> = element.querySelectorAll('app-intervention-tag');
    expect(rows.length).toBe(4);
  });

  it('should render the top-10 site list with its count, and link each row into the facility record', async () => {
    const element: HTMLElement = await render(STATISTICS);

    const links: NodeListOf<HTMLAnchorElement> = element.querySelectorAll(
      '[aria-labelledby="intervention-statistics-site-title"] a',
    );

    expect(links.length).toBe(2);
    expect(links[0]?.getAttribute('href')).toBe('/organizations/org-1/facilities/site-1');
    expect(links[0]?.textContent).toContain('Main warehouse');
  });

  it('should fall back to "Unknown" for a site whose facility no longer resolves', async () => {
    const element: HTMLElement = await render(STATISTICS);

    const links: NodeListOf<HTMLAnchorElement> = element.querySelectorAll(
      '[aria-labelledby="intervention-statistics-site-title"] a',
    );

    expect(links[1]?.textContent).toContain('Unknown');
  });

  it('should render the top-10 responsible list with its count, and link each row into the members list', async () => {
    const element: HTMLElement = await render(STATISTICS);

    const links: NodeListOf<HTMLAnchorElement> = element.querySelectorAll(
      '[aria-labelledby="intervention-statistics-responsible-title"] a',
    );

    expect(links.length).toBe(2);
    expect(links[0]?.getAttribute('href')).toBe('/organizations/org-1/members');
    expect(links[0]?.textContent).toContain('Ada Lovelace');
  });

  it('should fall back to "Unknown" for a responsible whose member no longer resolves', async () => {
    const element: HTMLElement = await render(STATISTICS);

    const links: NodeListOf<HTMLAnchorElement> = element.querySelectorAll(
      '[aria-labelledby="intervention-statistics-responsible-title"] a',
    );

    expect(links[1]?.textContent).toContain('Unknown');
  });

  it('should render an empty-state message for the site and responsible lists when both are empty', async () => {
    const element: HTMLElement = await render({
      ...STATISTICS,
      bySite: [],
      byResponsible: [],
    } as unknown as InterventionStatisticsOutput);

    expect(
      element.querySelectorAll('[data-testid="intervention-statistics-analysis"] p').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('should format the average publication time to one decimal, with the unit', async () => {
    const element: HTMLElement = await render(STATISTICS);
    const caption: Element | null = element.querySelector(
      '[data-testid="intervention-statistics-average-publication"]',
    );

    expect(caption?.textContent).toContain('3.3');
    expect(caption?.textContent).toContain('days');
  });

  it('should render "—" without a unit when the organization has no publications yet', async () => {
    const element: HTMLElement = await render({
      ...STATISTICS,
      averagePublicationDays: null,
    } as InterventionStatisticsOutput);
    const caption: Element | null = element.querySelector(
      '[data-testid="intervention-statistics-average-publication"]',
    );

    expect(caption?.textContent).toContain('—');
    expect(caption?.textContent).not.toContain('days');
  });

  it('should collapse the analysis by default and expand it on trigger click', async () => {
    const element: HTMLElement = await render(STATISTICS);
    const trigger: HTMLButtonElement | null = element.querySelector(
      '[data-testid="intervention-statistics-analysis-trigger"]',
    );

    expect(trigger?.getAttribute('aria-expanded')).toBe('false');

    trigger?.click();
    await fixture.whenStable();

    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
  });
});
