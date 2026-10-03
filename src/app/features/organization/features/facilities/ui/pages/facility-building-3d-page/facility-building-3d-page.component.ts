import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideBoxes,
  lucideLayers,
  lucideList,
  lucideMap,
  lucideMonitorOff,
  lucideRotateCcw,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { isCallError, isCallSuccess, type StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  FacilityModelOutput,
  FacilityModelInput,
  FacilityOption,
  FacilityOutput,
  FacilityBuildingModelFloor,
  FacilityPlanOverlayZone,
} from '@features/organization/features/facilities/models';
import {
  FacilityModelsStore,
  type FacilityModelsStoreType,
  FacilityBuilding3dStore,
  type FacilityBuilding3dStoreType,
} from '@features/organization/features/facilities/state';
import {
  applyFacilityModelSettings,
  resolveFacilityModelBinding,
} from '@features/organization/features/facilities/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { ResourceIllustration } from '@shared/resource-illustration';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmToggleImports } from '@shared/ui/toggle';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { FacilityBuilding3dRoomPanel } from '../../components/facility-building-3d-room-panel';
import { FacilityBuilding3dScene } from '../../components/facility-building-3d-scene';
import { FacilityModelManager } from '../../components/facility-model-manager';
/**
 * Class FacilityBuilding3dPage
 * @class FacilityBuilding3dPage
 *
 * @description
 * Route entry page for the dedicated building 3D view
 * (`/organizations/:organizationId/facilities/:facilityId/3d`). The page orchestrates
 * {@link FacilityBuilding3dStore}'s browser-only `loadModel` and renders one of five states: a
 * full-frame skeleton while the model is unresolved (also the exact SSR output, since the store's
 * fetch never fires on the server), the Spartan `hlmEmpty` error composition with a retry, the
 * Spartan `hlmEmpty` composition when the building has no floors, a dedicated incompatible-device
 * state when this browser lacks WebGL, and — once loaded and WebGL-capable —
 * `app-facility-building-3d-scene` (P1) beside a toolbar wired to the store (reset camera, toggle
 * exploded layout, link to the 2D plan, back to the record). The scene's own `renderingUnavailable`
 * output (a `getContext` failure the inline probe below did not catch, or a lost WebGL context)
 * falls back to the same incompatible-device state by flipping {@link webglSupported}. WebGL
 * support is probed inline, once, in {@link afterNextRender} — a three-line `canvas.getContext`
 * check does not earn a shared `utils/` helper (rule of three, `ARCHITECTURE.md` §2.9) and never
 * runs on the server, where {@link webglSupported} simply keeps its optimistic default masked by
 * the loading state. The scene is presentational (`ARCHITECTURE.md` §10.3): this page owns every
 * store call its outputs trigger — `roomActivated`/`floorActivated` select, `backgroundActivated`
 * deselects the current room only (the floor selection is never cleared by a pointer gesture — see
 * below), and `roomHovered` only ever writes {@link hoveredRoomId}, feeding the discreet hover
 * label ({@link hoveredRoomName}), never the store (a per-frame `patchState` would be a store
 * misuse `FacilityBuilding3dStore`'s own `@description` already rules out). The empty state's "Add
 * a floor" call to action opens the facility list's creation sheet pre-scoped to this building
 * (`?create=1&parent=`), gated on `FACILITIES_WRITE` — floors are sub-facilities created there, not
 * from the record's Plans tab. "Back to facility" registers on the shell header
 * (`PageActionsService`) instead of sitting beside the scene toolbar's own controls, and the room
 * panel's "View on 2D plan" ({@link onPlan2dRequested}) opens the _selected room's floor_ record,
 * since a room is drawn on its floor's own plan. `app-facility-building-3d-room-panel` (P2) is this
 * feature's **only** keyboard/screen-reader entry path, since the canvas is pointer-only. It mounts
 * as soon as a floor is selected — never gated on a room, which would leave no path in at all — and
 * `FacilityBuilding3dStore.loadModel` selects the model's first floor by default precisely so that
 * panel is always reachable with no prior pointer interaction (WCAG 2.1.1). Selecting a room
 * (canvas tap or the panel's own room list) moves real DOM focus into the panel's room-detail close
 * control (see {@link syncSelectionFocus}); deselecting it — that control, `backgroundActivated`,
 * or `Escape` ({@link onEscapePressed}) — returns focus to wherever it was before, never to `body`,
 * and never touches the floor selection. A `sr-only` `aria-live="polite"` region
 * ({@link selectionAnnouncement}) announces the same selection change in words, and a discreet,
 * `aria-hidden` label ({@link hoveredRoomName}) mirrors the scene's own hover preview — the
 * canvas's tap-only tablet path never assumes a prior hover, and neither does this page.
 * {@link pageRoot}, this focus machinery's last-resort fallback, carries {@link pageRootLabel} so a
 * focus landing there is never silent.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-building-3d-page',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    RouterLink,
    ResourceIllustration,
    FacilityBuilding3dScene,
    FacilityModelManager,
    FacilityBuilding3dRoomPanel,
    HlmButton,
    HlmSkeleton,
    ...HlmToggleImports,
    ...HlmToggleGroupImports,
  ],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucideBoxes,
      lucideLayers,
      lucideList,
      lucideMap,
      lucideMonitorOff,
      lucideRotateCcw,
      lucideTriangleAlert,
    }),
  ],
  templateUrl: './facility-building-3d-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityBuilding3dPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The workspace owning this facility, bound from the route.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * The building facility whose model this route renders, bound from the route.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly facilityId: InputSignal<string> = input.required<string>();
  //#endregion
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Provides the facility building view state and actions.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FacilityBuilding3dStoreType}
   */
  protected readonly store: FacilityBuilding3dStoreType =
    inject<FacilityBuilding3dStoreType>(FacilityBuilding3dStore);
  /**
   * Property modelsStore
   * @readonly
   *
   * @description
   * Owns immutable GLB files, settings mutations and browser parsed assets for this route.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FacilityModelsStoreType}
   */
  protected readonly modelsStore: FacilityModelsStoreType = inject(FacilityModelsStore);
  /**
   * Property sceneMode
   * @readonly
   *
   * @description
   * Chooses the generated building or selected imported model.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<'generated' | 'imported'>}
   */
  protected readonly sceneMode: WritableSignal<'generated' | 'imported'> = signal('generated');
  /**
   * Property previewSettings
   * @readonly
   *
   * @description
   * Keeps local transform and association previews tied to their immutable model identity.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<{ modelId: string; input: FacilityModelInput } | null>}
   */
  private readonly previewSettings: WritableSignal<{
    modelId: string;
    input: FacilityModelInput;
  } | null> = signal(null);
  /**
   * Property renderedImportedModel
   * @readonly
   *
   * @description
   * Applies unsaved valid settings to the selected file without changing server state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<FacilityModelOutput | null>}
   */
  protected readonly renderedImportedModel: Signal<FacilityModelOutput | null> = computed(() => {
    const model = this.modelsStore.selectedModel();
    const preview = this.previewSettings();
    return model && preview?.modelId === model.id
      ? applyFacilityModelSettings(model, preview.input)
      : model;
  });
  /**
   * Property modelError
   * @readonly
   *
   * @description
   * Exposes a normalized refusal from the independent imported-model workflow.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<StoreError | null>}
   */
  protected readonly modelError: Signal<StoreError | null> = computed(() => {
    const states = [
      this.modelsStore.listCallState(),
      this.modelsStore.optionsCallState(),
      this.modelsStore.uploadCallState(),
      this.modelsStore.previewCallState(),
      this.modelsStore.activateCallState(),
      this.modelsStore.removeCallState(),
      this.modelsStore.downloadCallState(),
    ];
    return states.find(isCallError)?.error ?? null;
  });
  /**
   * Property modelPending
   * @readonly
   *
   * @description
   * Keeps accepted file and settings mutations serialized in the manager.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly modelPending: Signal<boolean> = computed(
    () =>
      this.modelsStore.isUploadPending() ||
      this.modelsStore.isUpdatePending() ||
      this.modelsStore.isActivatePending() ||
      this.modelsStore.isRemovePending(),
  );
  /**
   * Property modelFacilityOptions
   * @readonly
   *
   * @description
   * Offers existing facilities of this building as binding targets.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly FacilityOption[]>}
   */
  protected readonly modelFacilityOptions: Signal<readonly FacilityOption[]> = computed(() =>
    this.modelsStore.facilityOptions(),
  );
  /**
   * Property selectedImportedFacility
   * @readonly
   *
   * @description
   * Resolves the selected GLB association through the complete authorized building hierarchy.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<FacilityOutput | null>}
   */
  protected readonly selectedImportedFacility: Signal<FacilityOutput | null> = computed(() => {
    const model = this.renderedImportedModel();
    const nodeIndex = this.modelsStore.selectedNodeIndex();
    if (!model || nodeIndex === null) return null;
    const binding = this.resolveImportedNodeBinding(model, nodeIndex);
    if (
      !binding.facilityId ||
      !Object.hasOwn(this.modelsStore.bindingFloorIds(), binding.facilityId)
    )
      return null;
    return (
      this.modelsStore.bindingFacilities().find((facility) => facility.id === binding.facilityId) ??
      null
    );
  });
  /**
   * Property downloads
   * @readonly
   *
   * @description
   * Saves authenticated model bytes through the existing native download service.
   *
   * @access private
   * @since unreleased
   *
   * @type {BrowserDownloadService}
   */
  private readonly downloads: BrowserDownloadService = inject(BrowserDownloadService);
  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Provides organization permissions used to gate building actions.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );
  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Whether the member may add floors from the record's Plans tab.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canWrite: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_WRITE),
  );
  /**
   * Property webglSupported
   * @readonly
   *
   * @description
   * Whether this browser can render WebGL. Optimistically `true` until
   * {@link afterNextRender} probes it — never checked on the server, where
   * the loading state always shows first regardless of this value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly webglSupported: WritableSignal<boolean> = signal<boolean>(true);
  /**
   * Property plansTabRoute
   * @readonly
   *
   * @description
   * Provides the route commands for the building plans tab.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly plansTabRoute: Signal<readonly string[]> = computed<readonly string[]>(() => [
    '/organizations',
    this.organizationId(),
    'facilities',
    this.facilityId(),
  ]);
  /**
   * Property roomPanelVisible
   * @readonly
   *
   * @description
   * Whether the compact-viewport sheet is showing. Owned here rather than by
   * the panel, because the toolbar control that brings a dismissed sheet back
   * lives here too.
   * It starts closed: on a small screen the sheet covers most of the very
   * building it describes, and arriving on a dedicated 3D view to find it
   * hidden would be the wrong first impression. The toolbar button is a real
   * focusable control, so the keyboard path into the room list survives the
   * sheet being closed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly roomPanelVisible: WritableSignal<boolean> = signal<boolean>(false);
  /**
   * Property isMobileInteractionMode
   * @readonly
   *
   * @description
   * Selects mobile sheets and touch composition from the central interaction mode, independent of
   * width.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;
  /**
   * Property hoveredRoomId
   * @readonly
   *
   * @description
   * The scene's currently hovered room, mirrored from its `roomHovered`
   * output — page-local only, feeding {@link hoveredRoomName}'s discreet
   * preview label. Never written to a store: hover is a per-frame signal the
   * scene already keeps local to itself.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly hoveredRoomId: WritableSignal<string | null> = signal<string | null>(null);
  /**
   * Property hoveredRoomName
   * @readonly
   *
   * @description
   * {@link hoveredRoomId} resolved to its display name, across every floor — `null` while nothing is
   * hovered or the id matches no room in the loaded model. The hover preview's own text.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly hoveredRoomName: Signal<string | null> = computed<string | null>(() => {
    const hoveredRoomId: string | null = this.hoveredRoomId();
    if (hoveredRoomId === null) return null;
    for (const floor of this.store.floors()) {
      const room: FacilityPlanOverlayZone | undefined = floor.rooms.find(
        (candidate) => candidate.facilityId === hoveredRoomId,
      );
      if (room) return room.name;
    }
    return null;
  });
  /**
   * Property selectionAnnouncement
   * @readonly
   *
   * @description
   * The `sr-only`, `aria-live="polite"` region's own text — the room and
   * floor names, or the floor alone when a floor slab was selected with no
   * room, or the empty string once nothing is selected. This is what makes
   * the scene followable without seeing it: a sighted pointer user gets the
   * fill tint and the outline, everyone else gets this sentence.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly selectionAnnouncement: Signal<string> = computed<string>(() => {
    const room: FacilityPlanOverlayZone | null = this.store.selectedRoom();
    const floor: FacilityBuildingModelFloor | null = this.store.selectedFloor();
    const equipment = this.store.selectedEquipment();
    const importedFacility =
      this.sceneMode() === 'imported' ? this.selectedImportedFacility() : null;
    if (importedFacility && floor)
      return $localize`:@@facility.building3d.selectionAnnouncement:Selected ${importedFacility.name}:room: on ${floor.name}:floor:`;
    if (importedFacility) return importedFacility.name;
    if (equipment && floor)
      return $localize`:@@facility.building3d.equipmentSelectionAnnouncement:Selected equipment on ${floor.name}:floor:`;
    if (room && floor) {
      return $localize`:@@facility.building3d.selectionAnnouncement:Selected ${room.name}:room: on ${floor.name}:floor:`;
    }
    if (floor) {
      return $localize`:@@facility.building3d.floorSelectionAnnouncement:Selected floor ${floor.name}:floor:`;
    }
    return '';
  });
  /**
   * Property injector
   * @readonly
   *
   * @description
   * Provides the injection context for loading browser-only scene dependencies.
   *
   * @access private
   * @since unreleased
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);
  /**
   * Property roomPanel
   * @readonly
   *
   * @description
   * Holds the selected room panel data when a room is selected.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<FacilityBuilding3dRoomPanel | undefined>}
   */
  private readonly roomPanel: Signal<FacilityBuilding3dRoomPanel | undefined> = viewChild(
    FacilityBuilding3dRoomPanel,
  );
  /**
   * Property pageRoot
   * @readonly
   *
   * @description
   * References the page root used to manage focus around the room panel.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly pageRoot: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('pageRoot');
  /**
   * Property pageRootLabel
   * @readonly
   *
   * @description
   * Provides the accessible name for the building page root.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly pageRootLabel: string = $localize`:@@facility.building3d.pageRootLabel:3D building view`;
  /**
   * Property previouslyFocusedElement
   *
   * @description
   * Stores the element that receives focus when the room panel closes.
   *
   * @access private
   * @since unreleased
   *
   * @type {HTMLElement | null}
   */
  private previouslyFocusedElement: HTMLElement | null = null;
  /**
   * Property wasSelected
   *
   * @description
   * Tracks whether this page previously had a selected room.
   *
   * @access private
   * @since unreleased
   *
   * @type {unknown}
   */
  private wasSelected = false;
  /**
   * Property router
   * @readonly
   *
   * @description
   * Provides navigation for the current facility building route.
   *
   * @access private
   * @since unreleased
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);
  /**
   * Property pageActionsService
   * @readonly
   *
   * @description
   * Builds the contextual actions available on this page.
   *
   * @access private
   * @since unreleased
   *
   * @type {PageActionsService}
   */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);
  /**
   * Property pageActions
   * @readonly
   *
   * @description
   * Provides the current contextual page action template.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');
  //#endregion
  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   *   Constructor
   *
   * @description
   * Loads the building model whenever the route params resolve — a no-op on
   * the server, per {@link FacilityBuilding3dStore.loadModel} — and probes
   * WebGL support once the browser has painted the first frame.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));
    effect((): void => {
      const organizationId: string = this.organizationId();
      const facilityId: string = this.facilityId();
      untracked((): void => {
        this.store.loadModel({ organizationId, facilityId });
        this.modelsStore.load({ organizationId, buildingId: facilityId });
        this.sceneMode.set('generated');
        this.previewSettings.set(null);
      });
    });
    effect(() => {
      const asset = this.modelsStore.previewAsset();
      const selectedModelId = this.modelsStore.selectedModelId();
      const previewPending = this.modelsStore.isPreviewPending();
      if (asset) untracked(() => this.sceneMode.set('imported'));
      else if (!selectedModelId && !previewPending)
        untracked(() => this.sceneMode.set('generated'));
    });
    effect(() => {
      const result = this.modelsStore.downloadCallState();
      if (isCallSuccess(result))
        untracked(() => this.downloads.trigger(result.data.blob, result.data.fileName));
    });
    effect(() => {
      this.modelsStore.settingsSavedToken();
      this.modelsStore.selectedModelId();
      untracked(() => this.previewSettings.set(null));
    });
    effect(() => {
      const facility = this.selectedImportedFacility();
      const selectedFloorId = this.store.selectedFloorId();
      const isolatedFloorId = this.store.isolatedFloorId();
      if (!facility) return;
      const bindingFloorId = this.modelsStore.bindingFloorIds()[facility.id];
      if (
        bindingFloorId != null &&
        (bindingFloorId !== selectedFloorId ||
          (isolatedFloorId !== null && bindingFloorId !== isolatedFloorId))
      )
        untracked(() => this.modelsStore.clearNodeSelection());
    });
    afterNextRender((): void => {
      this.webglSupported.set(detectWebglSupport());
    });
    effect((): void => {
      const isSelected: boolean =
        this.store.selectedRoomId() !== null || this.store.selectedEquipmentId() !== null;
      untracked((): void => this.syncSelectionFocus(isSelected));
    });
  }
  //#endregion
  //#region Methods
  /**
   * Method retryLoad
   * @method retryLoad
   *
   * @description
   * The load-failed state's retry — re-runs {@link FacilityBuilding3dStore.loadModel}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retryLoad(): void {
    this.store.loadModel({ organizationId: this.organizationId(), facilityId: this.facilityId() });
  }
  /**
   * Method onCoordinateModeChanged
   *
   * @description
   * Selects the physical or schematic coordinate space.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string | readonly string[] | null | undefined} value - Toggle group selection.
   *
   * @returns {void}
   */
  protected onCoordinateModeChanged(value: string | readonly string[] | null | undefined): void {
    if (value === 'metric' || value === 'schematic') this.store.setMetric(value === 'metric');
  }
  /**
   * Method onModelModeChanged
   *
   * @description
   * Selects an imported or generated scene, preserving valid source selections.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string | readonly string[] | null | undefined} value - Toggle group selection.
   *
   * @returns {void}
   */
  protected onModelModeChanged(value: string | readonly string[] | null | undefined): void {
    if (value === 'generated' || value === 'imported') this.sceneMode.set(value);
  }
  /**
   * Method onModelSettingsPreviewed
   *
   * @description
   * Applies a valid unsaved model transform and association draft to the current preview.
   *
   * @access protected
   * @since unreleased
   *
   * @param {FacilityModelInput} settings - Complete valid preview settings.
   *
   * @returns {void}
   */
  protected onModelSettingsPreviewed(settings: FacilityModelInput): void {
    const id = this.modelsStore.selectedModelId();
    if (id) this.previewSettings.set({ modelId: id, input: settings });
  }
  /**
   * Method onImportedNodeSelected
   *
   * @description
   * Opens the indexed object in the association manager and selects its existing facility binding.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} nodeIndex - Immutable source node index.
   *
   * @returns {void}
   */
  protected onImportedNodeSelected(nodeIndex: number): void {
    this.modelsStore.selectNode(nodeIndex);
    const model = this.renderedImportedModel();
    this.store.selectRoom(null);
    if (!model) return;
    const binding = this.resolveImportedNodeBinding(model, nodeIndex);
    if (
      !binding.facilityId ||
      !Object.hasOwn(this.modelsStore.bindingFloorIds(), binding.facilityId)
    )
      return;
    this.store.selectFloor(this.modelsStore.bindingFloorIds()[binding.facilityId]);
    if (
      this.store
        .floors()
        .some((floor) => floor.rooms.some((room) => room.facilityId === binding.facilityId))
    )
      this.store.selectRoom(binding.facilityId);
  }
  /**
   * Method resolveImportedNodeBinding
   *
   * @description
   * Resolves the closest association while preventing inheritance through an unavailable child.
   *
   * @access private
   * @since unreleased
   *
   * @param {FacilityModelOutput} model - Safe model settings rendered by the scene.
   * @param {number} nodeIndex - Immutable selected source node index.
   *
   * @returns {ReturnType<typeof resolveFacilityModelBinding>} Closest binding or unavailable state.
   */
  private resolveImportedNodeBinding(
    model: FacilityModelOutput,
    nodeIndex: number,
  ): ReturnType<typeof resolveFacilityModelBinding> {
    let binding = resolveFacilityModelBinding(model, [nodeIndex]);
    if (!binding.facilityId && !binding.unavailable) {
      const objects =
        this.modelsStore.previewAsset()?.nodes.find((node) => node.index === nodeIndex)?.objects ??
        [];
      for (const object of objects) {
        const path = [nodeIndex];
        let current: typeof object | null = object;
        while (current) {
          const ancestorIndex = current.userData['facilityModelNodeIndex'] as number | undefined;
          if (ancestorIndex !== undefined && !path.includes(ancestorIndex))
            path.push(ancestorIndex);
          current = current.parent;
        }
        binding = resolveFacilityModelBinding(model, path);
        if (binding.facilityId || binding.unavailable) break;
      }
    }
    return binding;
  }
  /**
   * Method onBackgroundActivated
   *
   * @description
   * Clears details and imported node selection while retaining the current floor.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected onBackgroundActivated(): void {
    this.store.selectRoom(null);
    this.modelsStore.clearNodeSelection();
  }
  /**
   * Method onRenderingUnavailable
   * @method onRenderingUnavailable
   *
   * @description
   * The scene's `renderingUnavailable` output — falls back to the incompatible-device state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onRenderingUnavailable(): void {
    this.webglSupported.set(false);
  }
  /**
   * Method onEscapePressed
   * @method onEscapePressed
   *
   * @description
   * `Escape` deselects the current room — the same effect as `backgroundActivated` or the panel's
   * own room-detail close control. Never touches the floor selection, so the room panel stays
   * mounted and reachable. A no-op when no room is selected, so it never fights another surface's
   * own `Escape` handling.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onEscapePressed(): void {
    if (
      this.store.selectedRoomId() === null &&
      this.store.selectedEquipmentId() === null &&
      this.modelsStore.selectedNodeIndex() === null
    )
      return;
    this.onBackgroundActivated();
  }
  /**
   * Method onPlan2dRequested
   * @method onPlan2dRequested
   *
   * @description
   * The room panel's "View on 2D plan" action — navigates to the _selected room's own floor_ record
   * on its Plans tab, since a room is drawn on its floor's plan, not on this building facility's
   * own (which may carry none).
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected onPlan2dRequested(): void {
    const floorId: string | null = this.store.selectedFloorId();
    if (!floorId) return;
    void this.router.navigate(['/organizations', this.organizationId(), 'facilities', floorId], {
      queryParams: { tab: 'plans' },
    });
  }
  /**
   * Method syncSelectionFocus
   * @method syncSelectionFocus
   *
   * @description
   * Moves real DOM focus on the room-selection edge: opening it
   * (`false → true`) captures `document.activeElement` and, once the
   * room-detail block has rendered inside the (already-mounted) panel,
   * moves focus onto its close control (`FacilityBuilding3dRoomPanel.focus`);
   * closing it (`true → false`) restores focus to whatever was captured, or
   * this page's own root when that element is no longer in the document — a
   * lost focus falling back to `body` is the trap this guards against.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {boolean} isSelected - Whether a room is currently selected.
   *
   * @returns {void}
   */
  private syncSelectionFocus(isSelected: boolean): void {
    if (isSelected && !this.wasSelected) {
      this.previouslyFocusedElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      afterNextRender(
        { write: (): void => this.roomPanel()?.focus() },
        { injector: this.injector },
      );
    } else if (!isSelected && this.wasSelected) {
      const target: HTMLElement | null = this.previouslyFocusedElement;
      this.previouslyFocusedElement = null;
      afterNextRender(
        {
          write: (): void => {
            if (target && document.contains(target)) {
              target.focus();
            } else {
              this.pageRoot()?.nativeElement.focus();
            }
          },
        },
        { injector: this.injector },
      );
    }
    this.wasSelected = isSelected;
  }
  //#endregion
}
/**
 * Function detectWebglSupport
 *
 * @description
 * Probes this browser for WebGL2, falling back to WebGL1 — the same
 * fallback order a three.js `WebGLRenderer` would attempt. Never throws: a
 * browser that refuses `canvas.getContext` entirely is treated as
 * unsupported rather than crashing the page.
 *
 * @access private
 * @since 1.0.0
 *
 * @returns {boolean} `true` when either context is available.
 */
function detectWebglSupport(): boolean {
  try {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
