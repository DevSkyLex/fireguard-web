import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  input,
  provideZonelessChangeDetection,
  signal,
  type InputSignal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { CookieService } from '@core/cookie';
import { PageActionsService } from '@core/page-actions';
import {
  idleCallState,
  successCallState,
  errorCallState,
  type CallState,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InspectionStore } from '@features/organization/features/inspections/state';
import { InspectionsPage } from '../inspections-page.component';

const createPage = async (
  inputs: Readonly<Record<string, unknown>> = {},
): Promise<ComponentFixture<InspectionsPage>> => {
  const created: ComponentFixture<InspectionsPage> = TestBed.createComponent(InspectionsPage);
  created.componentRef.setInput('organizationId', 'org-1');
  for (const [name, value] of Object.entries(inputs)) {
    created.componentRef.setInput(name, value);
  }
  await created.whenStable();

  return created;
};

/**
 * Stands in for the shell's `DashboardPageActions` — see `InterventionsPage`'s
 * spec for the approach every migrated page's spec reuses.
 */
@Component({
  selector: 'app-page-actions-host',
  imports: [NgTemplateOutlet],
  template: '<ng-container *ngTemplateOutlet="template()" />',
})
class PageActionsHost {
  public readonly template: InputSignal<TemplateRef<unknown> | null> =
    input<TemplateRef<unknown> | null>(null);
}

const renderPageActions = (): HTMLElement => {
  const hostFixture: ComponentFixture<PageActionsHost> = TestBed.createComponent(PageActionsHost);
  hostFixture.componentRef.setInput('template', TestBed.inject(PageActionsService).actions());
  hostFixture.detectChanges();

  return hostFixture.nativeElement as HTMLElement;
};

describe('InspectionsPage', () => {
  let fixture: ComponentFixture<InspectionsPage>;
  let load: ReturnType<typeof vi.fn>;
  let inspectionList: WritableSignal<readonly InspectionOutput[]>;
  let listCallState: WritableSignal<CallState>;
  let hasPermission: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    load = vi.fn();
    inspectionList = signal<readonly InspectionOutput[]>([]);
    listCallState = signal<CallState>(idleCallState());
    hasPermission = vi.fn().mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: InspectionStore,
          useValue: {
            load,
            inspections: inspectionList,
            listCallState,
            totalInspections: signal(0),
            isLoadingInspections: signal(false),
          },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission } },
        {
          provide: CookieService,
          useValue: { getCookie: vi.fn().mockReturnValue(null), setCookie: vi.fn() },
        },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('should load the list for the workspace on arrival, sorted by performed date descending', async () => {
    fixture = await createPage();

    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0][0]).toMatchObject({ organizationId: 'org-1' });
    expect(load.mock.calls[0][0].options).toMatchObject({
      page: 1,
      itemsPerPage: 30,
      sort: { field: 'performedAt', direction: 'desc' },
    });
  });

  it('should send the search term as the typed search option', async () => {
    fixture = await createPage({ q: '  gauge  ' });

    expect(load.mock.calls.at(-1)?.[0].options).toMatchObject({ search: 'gauge' });
  });

  it('should narrow the query when a filter is picked, and return to the first page', async () => {
    fixture = await createPage();

    fixture.componentInstance['applyFilter']({ status: 'draft' });
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options).toMatchObject({ status: 'draft' });
    expect(fixture.componentInstance['page']()).toBe(1);
  });

  it('should never send an unset filter as a value', async () => {
    fixture = await createPage();

    expect(load.mock.calls[0][0].options.status).toBeUndefined();
    expect(load.mock.calls[0][0].options.result).toBeUndefined();
  });

  it('should drop every narrowing at once when filters are cleared', async () => {
    fixture = await createPage({ q: 'gauge' });

    fixture.componentInstance['applyFilter']({ result: 'fail' });
    await fixture.whenStable();
    fixture.componentInstance['clearFilters']();
    await fixture.whenStable();

    const options = load.mock.calls.at(-1)?.[0].options;
    expect(options.status).toBeUndefined();
    expect(options.result).toBeUndefined();
    expect(TestBed.inject(Router).navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({ queryParams: { q: null } }),
    );
  });

  it('should reverse direction when the same field is picked again, and reload from the first page', async () => {
    fixture = await createPage();
    fixture.componentInstance['page'].set(3);

    fixture.componentInstance['applySortField']('performedAt');
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options.sort).toEqual({
      field: 'performedAt',
      direction: 'asc',
    });
    expect(fixture.componentInstance['page']()).toBe(1);
  });

  it('should switch field and keep the current direction when a different field is picked', async () => {
    fixture = await createPage();

    fixture.componentInstance['applySortField']('result');
    await fixture.whenStable();

    expect(load.mock.calls.at(-1)?.[0].options.sort).toEqual({
      field: 'result',
      direction: 'desc',
    });
  });

  it('should not offer "New inspection" without the write permission', async () => {
    hasPermission.mockReturnValue(false);
    fixture = await createPage();

    expect(renderPageActions().querySelector('[data-testid="inspections-new"]')).toBeNull();
  });

  it('should offer "New inspection" with the write permission', async () => {
    fixture = await createPage();

    const link: HTMLAnchorElement | null = renderPageActions().querySelector(
      '[data-testid="inspections-new"]',
    );

    expect(link?.getAttribute('href')).toBe('/organizations/org-1/inspections/create');
  });

  it('should show the error state and let the operator retry', async () => {
    listCallState.set(
      errorCallState({
        error: null,
        message: 'Network down',
        code: null,
        retryable: true,
        timestamp: 0,
      }),
    );
    fixture = await createPage();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="inspections-retry"]')).not.toBeNull();

    (element.querySelector('[data-testid="inspections-retry"]') as HTMLButtonElement).click();

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('should show the empty state once loaded with nothing to show', async () => {
    listCallState.set(successCallState(null));
    inspectionList.set([]);
    fixture = await createPage();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No inspections found');
  });

  it('should keep a requested page within bounds', async () => {
    fixture = await createPage();

    fixture.componentInstance['goToPage'](-3);
    expect(fixture.componentInstance['page']()).toBe(1);
  });

  describe('filters visibility', () => {
    function toggleButton(): HTMLButtonElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="inspections-filters-toggle"]',
      );
    }

    function filterBar(): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector('#inspections-filter-bar');
    }

    it('should render collapsed with no badge when nothing is filtered on arrival', async () => {
      fixture = await createPage();

      expect(toggleButton()?.getAttribute('aria-expanded')).toBe('false');
      expect(filterBar()).toBeNull();
      expect(toggleButton()?.querySelector('hlm-badge')).toBeNull();
    });

    it('should mount the bar and show the active-filter count once the toggle is activated and a field is picked', async () => {
      fixture = await createPage();

      toggleButton()?.click();
      await fixture.whenStable();
      expect(filterBar()).not.toBeNull();

      fixture.componentInstance['applyFilter']({ status: 'draft', result: 'fail' });
      await fixture.whenStable();

      expect(toggleButton()?.querySelector('hlm-badge')?.textContent?.trim()).toBe('2');
      expect(filterBar()).not.toBeNull();
    });

    it('should unmount the bar when the toggle is activated again', async () => {
      fixture = await createPage();
      toggleButton()?.click();
      await fixture.whenStable();
      expect(filterBar()).not.toBeNull();

      toggleButton()?.click();
      await fixture.whenStable();

      expect(filterBar()).toBeNull();
      expect(toggleButton()?.getAttribute('aria-expanded')).toBe('false');
    });
  });
});
