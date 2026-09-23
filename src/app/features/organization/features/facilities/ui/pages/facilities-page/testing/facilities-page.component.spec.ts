import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
import { of, Subject, throwError } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { PageActionsService } from '@core/page-actions';
import {
  errorCallState,
  idleCallState,
  successCallState,
  type CallState,
} from '@core/request-state';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type {
  CreateFacilityInput,
  FacilityGeocodeOutput,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import {
  FacilityOptionsStore,
  FacilityStore,
} from '@features/organization/features/facilities/state';
import { FacilitiesPage } from '../facilities-page.component';

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

const facility = (overrides: Partial<FacilityOutput> = {}): FacilityOutput =>
  ({
    '@id': '/api/facilities/facility-1',
    '@type': 'Facility',
    id: 'facility-1',
    organizationId: 'org-1',
    parentFacilityId: null,
    hasChildren: false,
    type: 'building',
    name: 'Headquarters',
    code: 'HQ-01',
    status: 'active',
    address: null,
    metadata: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as FacilityOutput;

const createPage = async (
  inputs: Readonly<Record<string, unknown>> = {},
): Promise<ComponentFixture<FacilitiesPage>> => {
  const created: ComponentFixture<FacilitiesPage> = TestBed.createComponent(FacilitiesPage);
  created.componentRef.setInput('organizationId', 'org-1');
  for (const [name, value] of Object.entries(inputs)) {
    created.componentRef.setInput(name, value);
  }
  await created.whenStable();

  return created;
};

describe('FacilitiesPage', () => {
  let fixture: ComponentFixture<FacilitiesPage>;
  let loadRootFacilities: ReturnType<typeof vi.fn>;
  let archive: ReturnType<typeof vi.fn>;
  let restore: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let rootFacilities: WritableSignal<readonly FacilityOutput[]>;
  let totalRootFacilities: WritableSignal<number>;
  let rootListCallState: WritableSignal<CallState>;
  let createCallState: WritableSignal<CallState<FacilityOutput | null>>;
  let isCreating: WritableSignal<boolean>;
  let createFacility: ReturnType<typeof vi.fn>;
  let resetCreateOperation: ReturnType<typeof vi.fn>;
  let ensureOptionsLoaded: ReturnType<typeof vi.fn>;
  let hasPermission: ReturnType<typeof vi.fn>;
  let exportCsv: ReturnType<typeof vi.fn>;
  let geocode: ReturnType<typeof vi.fn>;
  let feedbackWarn: ReturnType<typeof vi.fn>;
  let feedbackError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loadRootFacilities = vi.fn();
    archive = vi.fn();
    restore = vi.fn();
    rootFacilities = signal<readonly FacilityOutput[]>([]);
    totalRootFacilities = signal<number>(0);
    rootListCallState = signal<CallState>(idleCallState());
    createCallState = signal<CallState<FacilityOutput | null>>(idleCallState());
    isCreating = signal(false);
    createFacility = vi.fn();
    resetCreateOperation = vi.fn();
    ensureOptionsLoaded = vi.fn();
    hasPermission = vi.fn().mockReturnValue(true);
    exportCsv = vi.fn().mockReturnValue(of(new Blob(['csv'], { type: 'text/csv' })));
    geocode = vi.fn();
    feedbackWarn = vi.fn();
    feedbackError = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: THEME_PORT,
          useValue: {
            theme: signal('light'),
            resolvedTheme: signal('light'),
            setTheme: vi.fn(),
          } satisfies ThemePort,
        },
        provideZonelessChangeDetection(),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            interactionMode: signal('desktop'),
            isMobileInteractionMode: signal(false),
          },
        },
        provideRouter([]),
        {
          provide: FacilityStore,
          useValue: {
            rootFacilities,
            totalRootFacilities,
            rootListCallState,
            isLoadingRootFacilities: signal(false),
            createCallState,
            isCreating,
            createError: signal(null),
            create: createFacility,
            resetCreateOperation,
            loadRootFacilities,
            archive,
            restore,
          },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission } },
        { provide: FacilityService, useValue: { exportCsv, geocode } },
        { provide: FeedbackService, useValue: { warn: feedbackWarn, error: feedbackError } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });

    TestBed.overrideComponent(FacilitiesPage, {
      set: {
        providers: [
          {
            provide: FacilityOptionsStore,
            useValue: {
              options: signal([]),
              mapCenter: signal(undefined),
              ensureLoaded: ensureOptionsLoaded,
            },
          },
        ],
      },
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('should load the first page of roots for the workspace on arrival', async () => {
    fixture = await createPage();

    expect(loadRootFacilities).toHaveBeenCalledTimes(1);
    expect(loadRootFacilities.mock.calls[0][0]).toMatchObject({ organizationId: 'org-1' });
    expect(loadRootFacilities.mock.calls[0][0].options).toMatchObject({
      page: 1,
      itemsPerPage: 30,
      search: undefined,
      includeArchived: undefined,
    });
  });

  it('should send the search term as a search param', async () => {
    fixture = await createPage({ q: '  warehouse  ' });

    expect(loadRootFacilities.mock.calls.at(-1)?.[0].options.search).toBe('warehouse');
  });

  it('should never send an unset search as an empty string', async () => {
    fixture = await createPage();

    expect(loadRootFacilities.mock.calls[0][0].options.search).toBeUndefined();
  });

  it('should include archived facilities once the filter is toggled, and return to page 1', async () => {
    fixture = await createPage({ page: '3' });

    fixture.componentInstance['toggleIncludeArchived'](true);
    await fixture.whenStable();

    expect(loadRootFacilities.mock.calls.at(-1)?.[0].options.includeArchived).toBe(true);
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { page: null },
      }),
    );
  });

  it('should drop every narrowing at once when filters are cleared', async () => {
    fixture = await createPage({ q: 'warehouse' });

    fixture.componentInstance['toggleIncludeArchived'](true);
    await fixture.whenStable();
    fixture.componentInstance['clearFilters']();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { q: null, page: null } }),
    );

    fixture.componentRef.setInput('q', undefined); // The mocked router does not round-trip the cleared query param back onto the input.
    await fixture.whenStable();

    expect(loadRootFacilities.mock.calls.at(-1)?.[0].options.search).toBeUndefined();
    expect(loadRootFacilities.mock.calls.at(-1)?.[0].options.includeArchived).toBeUndefined();
  });

  it('should not offer "New facility" without the write permission', async () => {
    hasPermission.mockReturnValue(false);
    fixture = await createPage();

    expect(renderPageActions().querySelector('[data-testid="facilities-new"]')).toBeNull();
  });

  it('should offer "New facility" with the write permission', async () => {
    fixture = await createPage();

    const button: HTMLButtonElement | null = renderPageActions().querySelector(
      '[data-testid="facilities-new"]',
    );
    expect(button).not.toBeNull();

    button?.click();
    await fixture.whenStable();

    expect(fixture.componentInstance['createSheetVisible']()).toBe(true);
  });

  it('should consume a scoped creation deep link and load its picker options', async () => {
    fixture = await createPage({ create: '1', parent: 'parent-7' });

    expect(fixture.componentInstance['createSheetVisible']()).toBe(true);
    expect(fixture.componentInstance['pendingScopeId']()).toBe('parent-7');
    expect(ensureOptionsLoaded).toHaveBeenCalledOnce();
    expect(ensureOptionsLoaded).toHaveBeenCalledWith('org-1');
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { create: null, parent: null } }),
    );

    fixture.componentInstance['onCreateSheetVisibleChange'](false);
    expect(fixture.componentInstance['pendingScopeId']()).toBeNull();
  });

  it('should consume a creation deep link without opening the sheet when writing is denied', async () => {
    hasPermission.mockReturnValue(false);
    fixture = await createPage({ create: '1', parent: 'parent-7' });

    expect(fixture.componentInstance['createSheetVisible']()).toBe(false);
    expect(fixture.componentInstance['pendingScopeId']()).toBeNull();
    expect(ensureOptionsLoaded).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { create: null, parent: null } }),
    );
  });

  it('should submit once and navigate to the created facility only after the write succeeds', async () => {
    fixture = await createPage();
    const payload: CreateFacilityInput = { name: 'Annex', type: 'building' };
    fixture.componentInstance['openCreate']();

    isCreating.set(true);
    fixture.componentInstance['onCreateSubmitted'](payload);
    expect(createFacility).not.toHaveBeenCalled();

    isCreating.set(false);
    fixture.componentInstance['onCreateSubmitted'](payload);
    expect(createFacility).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-1',
      input: payload,
    });
    expect(fixture.componentInstance['createSheetVisible']()).toBe(true);

    createCallState.set(successCallState(facility({ id: 'created-7' })));
    await fixture.whenStable();

    expect(fixture.componentInstance['createSheetVisible']()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'facilities', 'created-7']);
    expect(resetCreateOperation).toHaveBeenCalledOnce();
  });

  it('should ignore a duplicate geocode request while a lookup is pending', async () => {
    const pending = new Subject<FacilityGeocodeOutput>();
    const match: FacilityGeocodeOutput = {
      '@id': '/api/facilities/geocode/annex',
      '@type': 'FacilityGeocode',
      displayName: 'Annex Street',
      latitude: 48.85,
      longitude: 2.35,
    };
    geocode.mockReturnValue(pending);
    fixture = await createPage();

    fixture.componentInstance['onGeocodeRequested']('Annex Street');
    fixture.componentInstance['onGeocodeRequested']('Annex Street');
    expect(geocode).toHaveBeenCalledExactlyOnceWith('org-1', 'Annex Street');
    expect(fixture.componentInstance['geocodePending']()).toBe(true);

    pending.next(match);
    pending.complete();
    expect(fixture.componentInstance['geocodePending']()).toBe(false);
    expect(fixture.componentInstance['geocodeResult']()).toEqual(match);
    expect(feedbackError).not.toHaveBeenCalled();
  });

  it('should show a geocode 404 inline and surface a rate-limit detail as a toast', async () => {
    fixture = await createPage();
    geocode.mockReturnValueOnce(
      throwError(() => ({ '@type': 'Error', status: 404, detail: 'No address matched' })),
    );

    fixture.componentInstance['onGeocodeRequested']('Unknown address');
    expect(fixture.componentInstance['geocodeNotFound']()).toBe(true);
    expect(feedbackError).not.toHaveBeenCalled();

    geocode.mockReturnValueOnce(
      throwError(() => ({ '@type': 'Error', status: 429, detail: 'Too many lookups' })),
    );
    fixture.componentInstance['onGeocodeRequested']('Busy address');

    expect(fixture.componentInstance['geocodeNotFound']()).toBe(false);
    expect(fixture.componentInstance['geocodePending']()).toBe(false);
    expect(feedbackError).toHaveBeenCalledExactlyOnceWith('Too many lookups');
  });

  it('should show the error state and let the operator retry', async () => {
    rootListCallState.set(
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
    expect(element.querySelector('[data-testid="facilities-retry"]')).not.toBeNull();

    (element.querySelector('[data-testid="facilities-retry"]') as HTMLButtonElement).click();

    expect(loadRootFacilities).toHaveBeenCalledTimes(2);
  });

  it('should show the empty state once loaded with nothing to show', async () => {
    rootListCallState.set(successCallState(null));
    rootFacilities.set([]);
    fixture = await createPage();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No facilities found');
  });

  it('should render the loaded roots and the row count', async () => {
    rootListCallState.set(successCallState(null));
    rootFacilities.set([facility()]);
    totalRootFacilities.set(1);
    fixture = await createPage();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="facility-table-row"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="facilities-row-count"]')?.textContent).toContain(
      '1 of 1',
    );
  });

  it('should clamp a page request below the first page to the first page', async () => {
    fixture = await createPage();

    fixture.componentInstance['goToPage'](-3);

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { page: null },
      }),
    );
  });

  it('should clamp a page request beyond the last page to the last page', async () => {
    totalRootFacilities.set(100);
    fixture = await createPage();

    fixture.componentInstance['goToPage'](999);

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { page: '4' },
      }),
    );
  });

  it('should default the ordering to name/asc and toggle its direction on a re-picked field', async () => {
    fixture = await createPage();

    expect(loadRootFacilities.mock.calls[0][0].options.sort).toEqual({
      field: 'name',
      direction: 'asc',
    });

    fixture.componentInstance['applySortField']('status');
    await fixture.whenStable();

    expect(loadRootFacilities.mock.calls.at(-1)?.[0].options.sort).toEqual({
      field: 'status',
      direction: 'asc',
    });

    fixture.componentInstance['applySortField']('status');
    await fixture.whenStable();

    expect(loadRootFacilities.mock.calls.at(-1)?.[0].options.sort).toEqual({
      field: 'status',
      direction: 'desc',
    });
  });

  it('should return to the first page when the ordering changes', async () => {
    fixture = await createPage({ page: '3' });

    fixture.componentInstance['applySortField']('type');
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { page: null } }),
    );
  });

  it('should send an archive request for the requested facility', async () => {
    fixture = await createPage();

    fixture.componentInstance['onArchiveRequested'](facility({ id: 'facility-7' }));

    expect(archive).toHaveBeenCalledWith({ organizationId: 'org-1', facilityId: 'facility-7' });
  });

  it('should send a restore request for the requested facility', async () => {
    fixture = await createPage();

    fixture.componentInstance['onRestoreRequested'](facility({ id: 'facility-7' }));

    expect(restore).toHaveBeenCalledWith({ organizationId: 'org-1', facilityId: 'facility-7' });
  });

  it('should switch from the table to the grid dataview when the layout toggle changes', async () => {
    rootListCallState.set(successCallState(null));
    rootFacilities.set([facility()]);
    fixture = await createPage();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="facility-table-row"]')).not.toBeNull();

    fixture.componentInstance['onLayoutChanged']('grid');
    await fixture.whenStable();

    expect(element.querySelector('[data-testid="facility-table-row"]')).toBeNull();
    expect(element.querySelector('[data-testid="facility-grid-card"]')).not.toBeNull();
  });

  describe('filters visibility', () => {
    function toggleButton(): HTMLButtonElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="facilities-filters-toggle"]',
      );
    }

    function filterBar(): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector('#facilities-filter-bar');
    }

    it('should render collapsed with no badge when nothing is filtered on arrival', async () => {
      fixture = await createPage();

      expect(toggleButton()?.getAttribute('aria-expanded')).toBe('false');
      expect(filterBar()).toBeNull();
      expect(toggleButton()?.querySelector('hlm-badge')).toBeNull();
    });

    it('should mount the bar and show the active-filter count once the toggle is activated and archived facilities are included', async () => {
      fixture = await createPage();

      toggleButton()?.click();
      await fixture.whenStable();
      expect(filterBar()).not.toBeNull();

      fixture.componentInstance['toggleIncludeArchived'](true);
      await fixture.whenStable();

      expect(toggleButton()?.querySelector('hlm-badge')?.textContent?.trim()).toBe('1');
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

  describe('export', () => {
    beforeEach(() => {
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
      URL.revokeObjectURL = vi.fn();
    });

    it('should disable the button while the list is loading, busy or empty', async () => {
      totalRootFacilities.set(0);
      fixture = await createPage();

      expect(fixture.componentInstance['exportDisabled']()).toBe(true);

      totalRootFacilities.set(3);
      await fixture.whenStable();

      expect(fixture.componentInstance['exportDisabled']()).toBe(false);

      fixture.componentInstance['exportBusy'].set(true);
      expect(fixture.componentInstance['exportDisabled']()).toBe(true);
    });

    it('should forward the search and archived narrowing, both accepted by the export, without warning', async () => {
      totalRootFacilities.set(3);
      fixture = await createPage({ q: 'north' });
      fixture.componentInstance['includeArchived'].set(true);

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(exportCsv).toHaveBeenCalledTimes(1);
      expect(exportCsv.mock.calls[0][0]).toBe('org-1');
      expect(exportCsv.mock.calls[0][1]).toEqual({ search: 'north', includeArchived: true });
      expect(feedbackWarn).not.toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance['exportBusy']()).toBe(false);
    });

    it('should omit unset narrowing from the export options', async () => {
      totalRootFacilities.set(3);
      fixture = await createPage();

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(exportCsv.mock.calls[0][1]).toEqual({ search: undefined, includeArchived: undefined });
    });

    it('should clear the busy flag and surface an error toast when the export fails', async () => {
      totalRootFacilities.set(3);
      exportCsv.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      fixture = await createPage();

      fixture.componentInstance['exportCsv']();
      await fixture.whenStable();

      expect(fixture.componentInstance['exportBusy']()).toBe(false);
      expect(feedbackError).toHaveBeenCalledTimes(1);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
    });
  });
});
