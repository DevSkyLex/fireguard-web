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
import { provideRouter, Router } from '@angular/router';
import { PageActionsService } from '@core/page-actions';
import {
  errorCallState,
  idleCallState,
  successCallState,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { TitleService } from '@core/title';
import { OrganizationPermissionService } from '@features/organization/access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import {
  ActiveFacilityStore,
  FacilityOverviewStore,
  FacilityStore,
} from '@features/organization/features/facilities/state';
import type { InspectionResult } from '@features/organization/features/inspections/models';
import { FacilityDetailPage } from '../facility-detail-page.component';

const inBody = (id: string): HTMLElement | null => document.querySelector(`[data-testid="${id}"]`);

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
    address: '1 Main Street',
    metadata: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as FacilityOutput;

describe('FacilityDetailPage', () => {
  let fixture: ComponentFixture<FacilityDetailPage>;
  let update: ReturnType<typeof vi.fn>;
  let remove: ReturnType<typeof vi.fn>;
  let ensureFacilityDescendantsLoaded: ReturnType<typeof vi.fn>;
  let overviewLoad: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let setTitle: ReturnType<typeof vi.fn>;
  let selectedFacility: WritableSignal<FacilityOutput | null>;
  let getError: WritableSignal<StoreError | null>;
  let updateCallState: WritableSignal<CallState<FacilityOutput | null>>;
  let deleteCallState: WritableSignal<CallState>;
  let hasPermission: ReturnType<typeof vi.fn>;

  const createPage = async (): Promise<void> => {
    fixture = TestBed.createComponent(FacilityDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('facilityId', 'facility-1');
    await fixture.whenStable();
  };

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string): HTMLElement | null =>
    root().querySelector(`[data-testid="${id}"]`);

  beforeEach(() => {
    update = vi.fn();
    remove = vi.fn();
    ensureFacilityDescendantsLoaded = vi.fn();
    overviewLoad = vi.fn();
    setTitle = vi.fn();
    selectedFacility = signal<FacilityOutput | null>(facility());
    getError = signal<StoreError | null>(null);
    updateCallState = signal<CallState<FacilityOutput | null>>(idleCallState());
    deleteCallState = signal<CallState>(idleCallState());
    hasPermission = vi.fn().mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ActiveFacilityStore, useValue: { selectedFacility, getError } },
        { provide: TitleService, useValue: { setTitle } },
        {
          provide: FacilityStore,
          useValue: {
            update,
            remove,
            ensureFacilityDescendantsLoaded,
            updateCallState,
            deleteCallState,
            childFacilitiesByParent: signal({}),
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission },
        },
      ],
    });

    TestBed.overrideComponent(FacilityDetailPage, {
      remove: { providers: [FacilityOverviewStore] },
      add: {
        providers: [
          {
            provide: FacilityOverviewStore,
            useValue: {
              complianceDisplay: signal('—'),
              equipmentCount: signal(0),
              equipmentDescription: signal('0 to monitor'),
              nextInspectionInDays: signal<number | null>(null),
              equipmentStatusRows: signal([]),
              recentInspections: signal([]),
              isLoadingEquipment: signal(false),
              isLoadingInspections: signal(false),
              load: overviewLoad,
            },
          },
        ],
      },
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('should show a loading state before the facility resolves', async () => {
    selectedFacility.set(null);
    await createPage();

    expect(root().querySelector('[role="status"]')).not.toBeNull();
  });

  it('should show the facility status, code and address once resolved', async () => {
    await createPage();

    expect(root().textContent).toContain('HQ-01');
    expect(root().textContent).toContain('1 Main Street');
    expect(root().querySelector('app-facility-status-tag')).not.toBeNull();
  });

  it('should re-set the document title once the facility resolves', async () => {
    selectedFacility.set(null);
    await createPage();

    expect(setTitle).not.toHaveBeenCalled();

    selectedFacility.set(facility());
    await fixture.whenStable();

    expect(setTitle).toHaveBeenCalledWith('Headquarters');
  });

  it('should return to the organization landing page when the load fails', async () => {
    selectedFacility.set(null);
    await createPage();

    getError.set({ error: null, message: 'down', code: 500, retryable: false, timestamp: 0 });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1']);
  });

  it('should load the overview summary once the facility resolves', async () => {
    await createPage();

    expect(overviewLoad).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
    });
  });

  it('should load the descendant subtree only when the facility has children', async () => {
    selectedFacility.set(facility({ hasChildren: true }));
    await createPage();

    expect(ensureFacilityDescendantsLoaded).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
    });
  });

  it('should not fetch a subtree for a leaf facility', async () => {
    selectedFacility.set(facility({ hasChildren: false }));
    await createPage();

    expect(ensureFacilityDescendantsLoaded).not.toHaveBeenCalled();
  });

  it('should default to the Overview tab, with Information hidden', async () => {
    await createPage();

    expect((root().querySelector('[hlmTabsContent="overview"]') as HTMLElement).hidden).toBe(false);
    expect((root().querySelector('[hlmTabsContent="information"]') as HTMLElement).hidden).toBe(
      true,
    );
  });

  it('should switch to Information when its tab trigger is activated', async () => {
    await createPage();

    byTestId('facility-tab-information')?.dispatchEvent(new MouseEvent('click'));
    await fixture.whenStable();

    expect((root().querySelector('[hlmTabsContent="information"]') as HTMLElement).hidden).toBe(
      false,
    );
  });

  it('should navigate to another facility when a hierarchy node is selected', async () => {
    await createPage();

    fixture.componentInstance['onHierarchyNodeSelected'](facility({ id: 'facility-2' }));

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'facilities', 'facility-2']);
  });

  it('should not navigate when the selected hierarchy node is the record already shown', async () => {
    await createPage();

    fixture.componentInstance['onHierarchyNodeSelected'](facility({ id: 'facility-1' }));

    expect(navigate).not.toHaveBeenCalled();
  });

  describe('in-place editing', () => {
    it('should route a patch from the open field to the store', async () => {
      await createPage();

      fixture.componentInstance['onEditTargetChanged']('name');
      fixture.componentInstance['onDetailsChanged']({ name: 'New name' });

      expect(update).toHaveBeenCalledWith({
        organizationId: 'org-1',
        facilityId: 'facility-1',
        input: { name: 'New name' },
      });
    });

    it('should ignore a patch that belongs to no open field', async () => {
      await createPage();

      fixture.componentInstance['onDetailsChanged']({ name: 'New name' });

      expect(update).not.toHaveBeenCalled();
    });

    it('should close the field once its write succeeds', async () => {
      await createPage();

      fixture.componentInstance['onEditTargetChanged']('name');
      fixture.componentInstance['onDetailsChanged']({ name: 'New name' });
      updateCallState.set(successCallState(facility({ name: 'New name' })));
      await fixture.whenStable();

      expect(fixture.componentInstance['editState']()).toEqual({
        open: null,
        saving: null,
        failed: null,
        failure: null,
      });
    });

    it('should attribute a rejection to the field that caused it, and keep it open', async () => {
      await createPage();

      fixture.componentInstance['onEditTargetChanged']('name');
      fixture.componentInstance['onDetailsChanged']({ name: 'New name' });
      updateCallState.set(
        errorCallState({
          error: null,
          message: 'Rejected',
          code: 422,
          retryable: false,
          timestamp: 0,
        }),
      );
      await fixture.whenStable();

      expect(fixture.componentInstance['editState']()).toEqual({
        open: 'name',
        saving: null,
        failed: 'name',
        failure: 'Rejected',
      });
    });
  });

  describe('delete', () => {
    it('should hide Delete without the write permission', async () => {
      hasPermission.mockReturnValue(false);
      await createPage();

      expect(
        renderPageActions().querySelector('[data-testid="facility-detail-delete"]'),
      ).toBeNull();
    });

    it('should open the confirmation before deleting, and delete only once confirmed', async () => {
      await createPage();

      renderPageActions()
        .querySelector('[data-testid="facility-detail-delete"]')
        ?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(remove).not.toHaveBeenCalled();
      expect(inBody('facility-delete-dialog')).not.toBeNull();

      inBody('facility-delete-confirm')?.dispatchEvent(new MouseEvent('click'));

      expect(remove).toHaveBeenCalledWith({ facilityId: 'facility-1' });
    });

    it('should navigate to the facility list once the delete write succeeds', async () => {
      await createPage();

      deleteCallState.set(successCallState(null));
      await fixture.whenStable();

      expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'facilities']);
    });
  });

  describe('resultLabelOf', () => {
    it.each<[InspectionResult, string]>([
      ['pass', 'Pass'],
      ['fail', 'Fail'],
      ['partial', 'Partial'],
    ])('should localize %s as %s', async (result: InspectionResult, label: string) => {
      await createPage();

      expect(fixture.componentInstance['resultLabelOf'](result)).toBe(label);
    });
  });
});
