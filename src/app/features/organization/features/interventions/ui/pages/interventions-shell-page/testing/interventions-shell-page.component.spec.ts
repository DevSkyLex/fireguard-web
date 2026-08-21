import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import type { InterventionFilterFieldKey } from '@features/organization/features/interventions/models';
import { InterventionPlanningOptionsStore } from '../../../../state/intervention-planning-options';
import { InterventionStatisticsStore } from '../../../../state/intervention-statistics';
import { InterventionsShellPage } from '../interventions-shell-page.component';

/** Route data one of the three leaves would declare, mirroring `interventions.routes.ts`. */
const routeData = (
  path: 'list' | 'board' | 'calendar',
  honouredFilterKeys: readonly InterventionFilterFieldKey[],
): {
  readonly routeConfig: { readonly path: string };
  readonly data: Readonly<Record<string, unknown>>;
} => ({
  routeConfig: { path: path === 'list' ? '' : path },
  data: { honouredFilterKeys },
});

const createPage = async (
  inputs: Readonly<Record<string, unknown>> = {},
): Promise<ComponentFixture<InterventionsShellPage>> => {
  const created: ComponentFixture<InterventionsShellPage> =
    TestBed.createComponent(InterventionsShellPage);
  created.componentRef.setInput('organizationId', 'org-1');
  for (const [name, value] of Object.entries(inputs)) {
    created.componentRef.setInput(name, value);
  }
  await created.whenStable();

  return created;
};

describe('InterventionsShellPage', () => {
  let fixture: ComponentFixture<InterventionsShellPage>;
  let navigate: ReturnType<typeof vi.fn>;
  let routerEvents: Subject<NavigationEnd>;
  let firstChild: { routeConfig: { path: string }; data: Readonly<Record<string, unknown>> };

  beforeEach(() => {
    navigate = vi.fn().mockResolvedValue(true);
    routerEvents = new Subject<NavigationEnd>();
    firstChild = routeData('list', [
      'status',
      'type',
      'priority',
      'site',
      'responsible',
      'label',
      'dueRange',
      'plannedStartRange',
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: Router, useValue: { navigate, events: routerEvents } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get firstChild(): typeof firstChild {
                return firstChild;
              },
            },
          },
        },
        {
          provide: InterventionPlanningOptionsStore,
          useValue: {
            sites: signal([]),
            members: signal([]),
            labels: signal([]),
            loadCreationOptions: vi.fn(),
          },
        },
        {
          provide: InterventionStatisticsStore,
          useValue: {
            queryData: signal(null),
            isQueryLoading: signal(false),
            load: vi.fn(),
          },
        },
      ],
    });
  });

  it('loads the shared planning options once on arrival', async () => {
    const loadCreationOptions = vi.fn();
    TestBed.overrideProvider(InterventionPlanningOptionsStore, {
      useValue: {
        sites: signal([]),
        members: signal([]),
        labels: signal([]),
        loadCreationOptions,
      },
    });

    fixture = await createPage();

    expect(loadCreationOptions).toHaveBeenCalledWith('org-1');
  });

  it('reads "list" as the active view from the route snapshot by default', async () => {
    fixture = await createPage();

    expect(fixture.componentInstance['activeView']()).toBe('list');
  });

  it('honours every filter field when the active leaf declares all eight', async () => {
    fixture = await createPage();

    expect(fixture.componentInstance['isFieldIgnored']('status')).toBe(false);
    expect(fixture.componentInstance['isFieldIgnored']('dueRange')).toBe(false);
  });

  it("renders 'status' as ignored once the router lands on the board leaf", async () => {
    fixture = await createPage();
    firstChild = routeData('board', [
      'type',
      'priority',
      'site',
      'responsible',
      'label',
      'dueRange',
      'plannedStartRange',
    ]);
    routerEvents.next(
      new NavigationEnd(
        1,
        '/organizations/org-1/interventions/board',
        '/organizations/org-1/interventions/board',
      ),
    );
    await fixture.whenStable();

    expect(fixture.componentInstance['activeView']()).toBe('board');
    expect(fixture.componentInstance['isFieldIgnored']('status')).toBe(true);
    expect(fixture.componentInstance['isFieldIgnored']('type')).toBe(false);
  });

  it("renders 'priority' and both date ranges as ignored on the calendar leaf", async () => {
    fixture = await createPage();
    firstChild = routeData('calendar', ['status', 'type', 'site', 'responsible']);
    routerEvents.next(
      new NavigationEnd(
        1,
        '/organizations/org-1/interventions/calendar',
        '/organizations/org-1/interventions/calendar',
      ),
    );
    await fixture.whenStable();

    expect(fixture.componentInstance['activeView']()).toBe('calendar');
    expect(fixture.componentInstance['isFieldIgnored']('priority')).toBe(true);
    expect(fixture.componentInstance['isFieldIgnored']('label')).toBe(true);
    expect(fixture.componentInstance['isFieldIgnored']('dueRange')).toBe(true);
    expect(fixture.componentInstance['isFieldIgnored']('plannedStartRange')).toBe(true);
    expect(fixture.componentInstance['isFieldIgnored']('status')).toBe(false);
  });

  it('names the reason a status chip is ignored on the board', async () => {
    fixture = await createPage();

    expect(fixture.componentInstance['ignoredReason']('status')).toContain('status');
  });

  it('writes a picked filter into the URL by merging query params', async () => {
    fixture = await createPage();

    fixture.componentInstance['applyFilter']({ status: 'planned' });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ status: 'planned' }),
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('drops every narrowing at once on "Clear filters"', async () => {
    fixture = await createPage({ status: 'planned', mine: '1' });

    fixture.componentInstance['clearFilters']();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ status: null, mine: null }),
      }),
    );
  });

  it('debounces the search box before writing "?q="', async () => {
    fixture = await createPage();

    fixture.componentInstance['onSearchQueryChanged']('sweep');
    await new Promise<void>((resolve) => setTimeout(resolve, 350));
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: expect.objectContaining({ q: 'sweep' }) }),
    );
  });

  it('navigates to the list with "?create=1", preserving the current filters', async () => {
    fixture = await createPage({ status: 'planned' });

    fixture.componentInstance['openCreate']();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(
      ['/organizations', 'org-1', 'interventions'],
      expect.objectContaining({
        queryParams: expect.objectContaining({ status: 'planned', create: '1' }),
      }),
    );
  });

  it("excludes status from the board destination's query params", async () => {
    fixture = await createPage({ status: 'planned', priority: 'high' });

    expect(fixture.componentInstance['queryParamsWithoutStatus']()).not.toHaveProperty('status');
    expect(fixture.componentInstance['queryParamsWithoutStatus']()).toMatchObject({
      priority: 'high',
    });
    expect(fixture.componentInstance['queryParamsWithStatus']()).toMatchObject({
      status: 'planned',
    });
  });
});
