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
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type {
  FacilityAttachmentOutput,
  FacilityOutput,
  FacilityPlanOverlayOutput,
} from '@features/organization/features/facilities/models';
import {
  ActiveFacilityStore,
  FacilityOverviewStore,
  FacilityPlansStore,
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

const plan = (overrides: Partial<FacilityAttachmentOutput> = {}): FacilityAttachmentOutput => ({
  '@id': `/api/facility-attachments/${overrides.id ?? 'plan-1'}`,
  '@type': 'FacilityAttachment',
  id: 'plan-1',
  facilityId: 'facility-1',
  fileName: 'ground-floor.png',
  mimeType: 'image/png',
  size: 2048,
  kind: 'floor_plan',
  isPrimaryPlan: false,
  imageWidth: 1200,
  imageHeight: 800,
  revision: 1,
  uploadedAt: '2026-08-01T00:00:00+00:00',
  ...overrides,
});

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
  let planLoad: ReturnType<typeof vi.fn>;
  let planUpload: ReturnType<typeof vi.fn>;
  let planSetPrimary: ReturnType<typeof vi.fn>;
  let planRemove: ReturnType<typeof vi.fn>;
  let planSelectPlan: ReturnType<typeof vi.fn>;
  let orderedPlans: WritableSignal<readonly FacilityAttachmentOutput[]>;
  let selectedPlan: WritableSignal<FacilityAttachmentOutput | null>;
  let planImageUrl: WritableSignal<string | null>;
  let plansLoading: WritableSignal<boolean>;
  let planOverlay: WritableSignal<FacilityPlanOverlayOutput | null>;
  let planOverlayHasContent: WritableSignal<boolean>;
  let planShowZones: WritableSignal<boolean>;
  let planShowEquipment: WritableSignal<boolean>;
  let planSetShowZones: ReturnType<typeof vi.fn>;
  let planSetShowEquipment: ReturnType<typeof vi.fn>;
  let planEditMode: WritableSignal<'none' | 'draw-zone' | 'place-pin'>;
  let planDrawTargetFacilityId: WritableSignal<string | null>;
  let planPlaceEquipmentId: WritableSignal<string | null>;
  let planDraftPoints: WritableSignal<ReadonlyArray<readonly [number, number]>>;
  let planIsSavingZoneGeometry: WritableSignal<boolean>;
  let planIsSavingPinPosition: WritableSignal<boolean>;
  let planAvailableZoneCandidates: WritableSignal<readonly FacilityOutput[]>;
  let planAvailableEquipmentCandidates: WritableSignal<readonly EquipmentOutput[]>;
  let planEnterDrawZoneMode: ReturnType<typeof vi.fn>;
  let planEnterPlacePinMode: ReturnType<typeof vi.fn>;
  let planCancelEditing: ReturnType<typeof vi.fn>;
  let planAddDraftVertex: ReturnType<typeof vi.fn>;
  let planUndoDraftVertex: ReturnType<typeof vi.fn>;
  let planFinishDrawZone: ReturnType<typeof vi.fn>;
  let planClearZoneGeometry: ReturnType<typeof vi.fn>;
  let planSaveZoneGeometryFromDialog: ReturnType<typeof vi.fn>;
  let planPlacePin: ReturnType<typeof vi.fn>;
  let planMovePin: ReturnType<typeof vi.fn>;
  let planRemovePinFromPlan: ReturnType<typeof vi.fn>;
  let planEnsureZoneCandidatesLoaded: ReturnType<typeof vi.fn>;
  let planEnsureFacilityEquipmentLoaded: ReturnType<typeof vi.fn>;

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
    planLoad = vi.fn();
    planUpload = vi.fn();
    planSetPrimary = vi.fn();
    planRemove = vi.fn();
    planSelectPlan = vi.fn();
    orderedPlans = signal<readonly FacilityAttachmentOutput[]>([]);
    selectedPlan = signal<FacilityAttachmentOutput | null>(null);
    planImageUrl = signal<string | null>(null);
    plansLoading = signal<boolean>(false);
    planOverlay = signal<FacilityPlanOverlayOutput | null>(null);
    planOverlayHasContent = signal<boolean>(false);
    planShowZones = signal<boolean>(true);
    planShowEquipment = signal<boolean>(true);
    planSetShowZones = vi.fn();
    planSetShowEquipment = vi.fn();
    planEditMode = signal<'none' | 'draw-zone' | 'place-pin'>('none');
    planDrawTargetFacilityId = signal<string | null>(null);
    planPlaceEquipmentId = signal<string | null>(null);
    planDraftPoints = signal<ReadonlyArray<readonly [number, number]>>([]);
    planIsSavingZoneGeometry = signal(false);
    planIsSavingPinPosition = signal(false);
    planAvailableZoneCandidates = signal<readonly FacilityOutput[]>([]);
    planAvailableEquipmentCandidates = signal<readonly EquipmentOutput[]>([]);
    planEnterDrawZoneMode = vi.fn();
    planEnterPlacePinMode = vi.fn();
    planCancelEditing = vi.fn();
    planAddDraftVertex = vi.fn();
    planUndoDraftVertex = vi.fn();
    planFinishDrawZone = vi.fn();
    planClearZoneGeometry = vi.fn();
    planSaveZoneGeometryFromDialog = vi.fn();
    planPlacePin = vi.fn();
    planMovePin = vi.fn();
    planRemovePinFromPlan = vi.fn();
    planEnsureZoneCandidatesLoaded = vi.fn();
    planEnsureFacilityEquipmentLoaded = vi.fn();

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
      remove: { providers: [FacilityOverviewStore, FacilityPlansStore] },
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
          {
            provide: FacilityPlansStore,
            useValue: {
              orderedPlans,
              selectedPlan,
              planImageUrl,
              isLoading: plansLoading,
              isUploading: signal(false),
              settingPrimaryId: signal<string | null>(null),
              deletingId: signal<string | null>(null),
              overlay: planOverlay,
              overlayHasContent: planOverlayHasContent,
              showZones: planShowZones,
              showEquipment: planShowEquipment,
              load: planLoad,
              upload: planUpload,
              setPrimary: planSetPrimary,
              remove: planRemove,
              selectPlan: planSelectPlan,
              setShowZones: planSetShowZones,
              setShowEquipment: planSetShowEquipment,
              editMode: planEditMode,
              drawTargetFacilityId: planDrawTargetFacilityId,
              placeEquipmentId: planPlaceEquipmentId,
              draftPoints: planDraftPoints,
              isSavingZoneGeometry: planIsSavingZoneGeometry,
              isSavingPinPosition: planIsSavingPinPosition,
              availableZoneCandidates: planAvailableZoneCandidates,
              availableEquipmentCandidates: planAvailableEquipmentCandidates,
              enterDrawZoneMode: planEnterDrawZoneMode,
              enterPlacePinMode: planEnterPlacePinMode,
              cancelEditing: planCancelEditing,
              addDraftVertex: planAddDraftVertex,
              undoDraftVertex: planUndoDraftVertex,
              finishDrawZone: planFinishDrawZone,
              clearZoneGeometry: planClearZoneGeometry,
              saveZoneGeometryFromDialog: planSaveZoneGeometryFromDialog,
              placePin: planPlacePin,
              movePin: planMovePin,
              removePinFromPlan: planRemovePinFromPlan,
              ensureZoneCandidatesLoaded: planEnsureZoneCandidatesLoaded,
              ensureFacilityEquipmentLoaded: planEnsureFacilityEquipmentLoaded,
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

  describe('plans tab', () => {
    it('should not load plans before the tab is activated', async () => {
      await createPage();

      expect(planLoad).not.toHaveBeenCalled();
    });

    it('should load plans once, on first activation', async () => {
      await createPage();

      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();
      byTestId('facility-tab-overview')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();
      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(planLoad).toHaveBeenCalledTimes(1);
      expect(planLoad).toHaveBeenCalledWith({
        facilityId: 'facility-1',
        organizationId: 'org-1',
      });
    });

    it('should announce a skeleton loading state while the first plans load is in flight', async () => {
      plansLoading.set(true);
      await createPage();

      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      const loading: HTMLElement | null = byTestId('facility-plans-loading');
      expect(loading).not.toBeNull();
      expect(loading?.getAttribute('role')).toBe('status');
      expect(byTestId('facility-plans-empty')).toBeNull();
    });

    it('should announce the image spinner while the selected plan image resolves', async () => {
      orderedPlans.set([plan({ isPrimaryPlan: true })]);
      selectedPlan.set(plan({ isPrimaryPlan: true }));
      planImageUrl.set(null);
      await createPage();

      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      const spinner: HTMLElement | null =
        byTestId('facility-plan-viewer')?.querySelector('[role="status"]') ?? null;
      expect(spinner).not.toBeNull();
    });

    it('should show the empty state when there is no floor plan', async () => {
      await createPage();

      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(byTestId('facility-plans-empty')).not.toBeNull();
    });

    it('should hide the upload control without the write permission', async () => {
      hasPermission.mockReturnValue(false);
      await createPage();

      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(byTestId('facility-plans-upload')).toBeNull();
    });

    it('should show the plan viewer and the plan list once a plan exists', async () => {
      orderedPlans.set([plan({ isPrimaryPlan: true })]);
      selectedPlan.set(plan({ isPrimaryPlan: true }));
      planImageUrl.set('blob:test-plan');
      await createPage();

      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(byTestId('facility-plan-viewer')).not.toBeNull();
      expect(root().querySelector('app-facility-plan-list')).not.toBeNull();
    });

    it('should route the picked file to the store as an upload', async () => {
      orderedPlans.set([plan({ isPrimaryPlan: true })]);
      selectedPlan.set(plan({ isPrimaryPlan: true }));
      await createPage();

      const file = new File(['plan'], 'floor.png', { type: 'image/png' });
      fixture.componentInstance['onPlanFilePicked'](file);

      expect(planUpload).toHaveBeenCalledWith({ facilityId: 'facility-1', file });
    });

    it('should route a set-primary request to the store', async () => {
      await createPage();

      fixture.componentInstance['onPlanSetPrimaryRequested'](plan({ id: 'plan-2' }));

      expect(planSetPrimary).toHaveBeenCalledWith({ attachmentId: 'plan-2' });
    });

    it('should route a delete request to the store with the plan revision', async () => {
      await createPage();

      fixture.componentInstance['onPlanDeleteRequested'](plan({ id: 'plan-2', revision: 4 }));

      expect(planRemove).toHaveBeenCalledWith({ attachmentId: 'plan-2', revision: 4 });
    });

    it('should route a selection to the store', async () => {
      await createPage();

      fixture.componentInstance['onPlanSelected']('plan-2');

      expect(planSelectPlan).toHaveBeenCalledWith('plan-2');
    });
  });

  describe('plan overlay', () => {
    it('should not show the layer toggles when the overlay has no content', async () => {
      orderedPlans.set([plan({ isPrimaryPlan: true })]);
      selectedPlan.set(plan({ isPrimaryPlan: true }));
      planImageUrl.set('blob:test-plan');
      planOverlayHasContent.set(false);
      await createPage();

      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(byTestId('facility-plan-overlay-toggles')).toBeNull();
    });

    it('should show the layer toggles and project the overlay once it has content', async () => {
      orderedPlans.set([plan({ isPrimaryPlan: true })]);
      selectedPlan.set(plan({ isPrimaryPlan: true }));
      planImageUrl.set('blob:test-plan');
      planOverlayHasContent.set(true);
      await createPage();

      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(byTestId('facility-plan-overlay-toggles')).not.toBeNull();
      expect(root().querySelector('app-facility-plan-overlay')).not.toBeNull();
    });

    it('should route a zone toggle change to the store', async () => {
      orderedPlans.set([plan({ isPrimaryPlan: true })]);
      selectedPlan.set(plan({ isPrimaryPlan: true }));
      planImageUrl.set('blob:test-plan');
      planOverlayHasContent.set(true);
      await createPage();

      fixture.componentInstance['onShowZonesChanged'](false);

      expect(planSetShowZones).toHaveBeenCalledWith(false);
    });

    it('should route an equipment toggle change to the store', async () => {
      await createPage();

      fixture.componentInstance['onShowEquipmentChanged'](false);

      expect(planSetShowEquipment).toHaveBeenCalledWith(false);
    });

    it('should navigate to the zone facility when a plan overlay zone is activated', async () => {
      await createPage();

      fixture.componentInstance['onPlanZoneActivated']('facility-zone-1');

      expect(navigate).toHaveBeenCalledWith([
        '/organizations',
        'org-1',
        'facilities',
        'facility-zone-1',
      ]);
    });

    it('should navigate to the equipment record when a plan overlay pin is activated', async () => {
      await createPage();

      fixture.componentInstance['onPlanEquipmentActivated']('equipment-1');

      expect(navigate).toHaveBeenCalledWith([
        '/organizations',
        'org-1',
        'equipments',
        'equipment-1',
      ]);
    });
  });

  describe('plan editor', () => {
    it('should hide the draw-zone and place-pin pickers without permission', async () => {
      hasPermission.mockReturnValue(false);
      await createPage();

      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(byTestId('facility-plan-editor-toolbar')).toBeNull();
    });

    it('should show the toolbar once permitted', async () => {
      orderedPlans.set([plan({ isPrimaryPlan: true })]);
      selectedPlan.set(plan({ isPrimaryPlan: true }));
      planImageUrl.set('blob:test-plan');
      await createPage();

      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(byTestId('facility-plan-editor-toolbar')).not.toBeNull();
    });

    it('should load the candidate lists when their picker is opened', async () => {
      orderedPlans.set([plan({ isPrimaryPlan: true })]);
      selectedPlan.set(plan({ isPrimaryPlan: true }));
      planImageUrl.set('blob:test-plan');
      await createPage();

      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      byTestId('facility-plan-editor-draw-zone-picker')?.dispatchEvent(new MouseEvent('click'));
      byTestId('facility-plan-editor-place-pin-picker')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(planEnsureZoneCandidatesLoaded).toHaveBeenCalled();
      expect(planEnsureFacilityEquipmentLoaded).toHaveBeenCalled();
    });

    it('should enter draw-zone mode when a zone target is picked', async () => {
      await createPage();

      fixture.componentInstance['onZoneDrawTargetPicked']('zone-1');

      expect(planEnterDrawZoneMode).toHaveBeenCalledWith('zone-1');
    });

    it('should ignore a nullish picker selection', async () => {
      await createPage();

      fixture.componentInstance['onZoneDrawTargetPicked'](undefined);
      fixture.componentInstance['onPlaceEquipmentPicked'](null);

      expect(planEnterDrawZoneMode).not.toHaveBeenCalled();
      expect(planEnterPlacePinMode).not.toHaveBeenCalled();
    });

    it('should enter place-pin mode when equipment is picked', async () => {
      await createPage();

      fixture.componentInstance['onPlaceEquipmentPicked']('equipment-1');

      expect(planEnterPlacePinMode).toHaveBeenCalledWith('equipment-1');
    });

    it('should forward a vertex tap to the store', async () => {
      await createPage();

      fixture.componentInstance['onVertexAdded']([0.2, 0.4]);

      expect(planAddDraftVertex).toHaveBeenCalledWith([0.2, 0.4]);
    });

    it('should finish drawing on a close request', async () => {
      await createPage();

      fixture.componentInstance['onPolygonCloseRequested']();

      expect(planFinishDrawZone).toHaveBeenCalled();
    });

    it('should forward a pin placement tap to the store', async () => {
      await createPage();

      fixture.componentInstance['onPinPlaced']([0.1, 0.9]);

      expect(planPlacePin).toHaveBeenCalledWith([0.1, 0.9]);
    });

    it('should forward a pin drag-drop to the store', async () => {
      await createPage();

      fixture.componentInstance['onPinMoved']({ equipmentId: 'equipment-1', point: [0.3, 0.3] });

      expect(planMovePin).toHaveBeenCalledWith('equipment-1', [0.3, 0.3]);
    });

    it('should cancel editing on Escape while a mode is active', async () => {
      planEditMode.set('draw-zone');
      await createPage();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(planCancelEditing).toHaveBeenCalled();
    });

    it('should not react to Escape while no mode is active', async () => {
      await createPage();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(planCancelEditing).not.toHaveBeenCalled();
    });

    it('should undo the last vertex on Backspace while drawing', async () => {
      planEditMode.set('draw-zone');
      await createPage();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', cancelable: true }));

      expect(planUndoDraftVertex).toHaveBeenCalled();
    });

    it('should not undo on Backspace outside draw-zone mode', async () => {
      planEditMode.set('place-pin');
      await createPage();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));

      expect(planUndoDraftVertex).not.toHaveBeenCalled();
    });

    it('should leave Backspace alone when it targets a text entry field', async () => {
      planEditMode.set('draw-zone');
      await createPage();

      const field: HTMLInputElement = document.createElement('input');
      document.body.appendChild(field);
      const event = new KeyboardEvent('keydown', {
        key: 'Backspace',
        cancelable: true,
        bubbles: true,
      });
      field.dispatchEvent(event);
      field.remove();

      expect(event.defaultPrevented).toBe(false);
      expect(planUndoDraftVertex).not.toHaveBeenCalled();
    });

    it('should cancel an active editor mode when leaving the Plans tab', async () => {
      await createPage();

      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();
      planEditMode.set('draw-zone');

      byTestId('facility-tab-overview')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(planCancelEditing).toHaveBeenCalled();
    });

    it('should not cancel when leaving the Plans tab with no mode active', async () => {
      await createPage();

      byTestId('facility-tab-plans')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();
      byTestId('facility-tab-overview')?.dispatchEvent(new MouseEvent('click'));
      await fixture.whenStable();

      expect(planCancelEditing).not.toHaveBeenCalled();
    });

    it('should open the coordinate dialog for the picked draw target — the keyboard creation path', async () => {
      planEditMode.set('draw-zone');
      planDrawTargetFacilityId.set('zone-1');
      await createPage();

      fixture.componentInstance['onEnterCoordinatesRequested']();

      expect(fixture.componentInstance['zoneGeometryDialogFacilityId']()).toBe('zone-1');
    });

    it('should open the position dialog for the picked equipment — the keyboard placement path', async () => {
      planEditMode.set('place-pin');
      planPlaceEquipmentId.set('equipment-1');
      await createPage();

      fixture.componentInstance['onEnterPositionRequested']();

      expect(fixture.componentInstance['pinPositionDialogEquipmentId']()).toBe('equipment-1');
    });

    it('should route a first placement submitted from the dialog through placePin', async () => {
      planEditMode.set('place-pin');
      planPlaceEquipmentId.set('equipment-1');
      await createPage();

      fixture.componentInstance['onEnterPositionRequested']();
      fixture.componentInstance['onPinPositionSubmitted']([0.5, 0.5]);

      expect(planPlacePin).toHaveBeenCalledWith([0.5, 0.5]);
      expect(planMovePin).not.toHaveBeenCalled();
      expect(fixture.componentInstance['pinPositionDialogEquipmentId']()).toBeNull();
    });

    it('should open the zone geometry dialog and submit through saveZoneGeometryFromDialog', async () => {
      planOverlay.set({
        attachmentId: 'plan-1',
        imageWidth: 1200,
        imageHeight: 800,
        zones: [
          {
            facilityId: 'zone-1',
            name: 'Zone A',
            type: 'zone',
            status: 'active',
            points: [
              [0, 0],
              [0.5, 0],
              [0.5, 0.5],
            ],
          },
        ],
        equipment: [],
      });
      await createPage();

      fixture.componentInstance['openZoneGeometryDialog']('zone-1');
      fixture.componentInstance['onZoneGeometrySubmitted']([
        [0, 0],
        [0.6, 0],
        [0.6, 0.6],
      ]);

      expect(planSaveZoneGeometryFromDialog).toHaveBeenCalledWith('zone-1', [
        [0, 0],
        [0.6, 0],
        [0.6, 0.6],
      ]);
      expect(fixture.componentInstance['zoneGeometryDialogFacilityId']()).toBeNull();
    });

    it('should clear the zone geometry from the dialog', async () => {
      await createPage();

      fixture.componentInstance['openZoneGeometryDialog']('zone-1');
      fixture.componentInstance['onZoneGeometryCleared']();

      expect(planClearZoneGeometry).toHaveBeenCalledWith('zone-1');
    });

    it('should submit an equipment pin position through movePin', async () => {
      await createPage();

      fixture.componentInstance['openPinPositionDialog']('equipment-1');
      fixture.componentInstance['onPinPositionSubmitted']([0.4, 0.6]);

      expect(planMovePin).toHaveBeenCalledWith('equipment-1', [0.4, 0.6]);
    });

    it('should remove a pin from the plan', async () => {
      await createPage();

      fixture.componentInstance['onPinPositionRemoved']('equipment-1');

      expect(planRemovePinFromPlan).toHaveBeenCalledWith('equipment-1');
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
