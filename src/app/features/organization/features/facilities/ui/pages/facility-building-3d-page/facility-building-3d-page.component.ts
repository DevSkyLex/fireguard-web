import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideBoxes,
  lucideLayers,
  lucideMap,
  lucideMonitorOff,
  lucideRotateCcw,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  FacilityBuilding3dStore,
  type FacilityBuilding3dStoreType,
} from '@features/organization/features/facilities/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { FacilityBuilding3dScene } from '../../components/facility-building-3d-scene';

/**
 * Component FacilityBuilding3dPage
 * @class FacilityBuilding3dPage
 *
 * @description
 * Route entry page for the dedicated building 3D view
 * (`/organizations/:organizationId/facilities/:facilityId/3d`). The page
 * orchestrates {@link FacilityBuilding3dStore}'s browser-only `loadModel`
 * and renders one of five states: a full-frame skeleton while the model is
 * unresolved (also the exact SSR output, since the store's fetch never
 * fires on the server), `app-error-state` with a retry, `app-empty-state`
 * when the building has no floors, a dedicated incompatible-device state
 * when this browser lacks WebGL, and — once loaded and WebGL-capable —
 * `app-facility-building-3d-scene` (P1) beside a toolbar wired to the store
 * (reset camera, toggle exploded layout, link to the 2D plan, back to the
 * record). The scene's own `renderingUnavailable` output (a `getContext`
 * failure the inline probe below did not catch, or a lost WebGL context)
 * falls back to the same incompatible-device state by flipping
 * {@link webglSupported}.
 *
 * WebGL support is probed inline, once, in {@link afterNextRender} — a
 * three-line `canvas.getContext` check does not earn a shared `utils/`
 * helper (rule of three, `ARCHITECTURE.md` §2.9) and never runs on the
 * server, where {@link webglSupported} simply keeps its optimistic default
 * masked by the loading state.
 *
 * The scene is presentational (`ARCHITECTURE.md` §10.3): this page owns
 * every store call its outputs trigger — `roomActivated`/`floorActivated`
 * select, `backgroundActivated` clears the selection, and `roomHovered`
 * only ever writes {@link hoveredRoomId}, a page-local signal reserved for
 * a future hover detail chip, never the store (a per-frame `patchState`
 * would be a store misuse `FacilityBuilding3dStore`'s own `@description`
 * already rules out).
 *
 * The empty state's "Go to Plans" call to action links to this facility's
 * record with `?tab=plans`, gated on `FACILITIES_WRITE` — floors are added
 * from that tab, not from here. `FacilityDetailPage.activeTab` follows that
 * query parameter, so arriving there lands on the Plans tab.
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-building-3d-page',
  imports: [
    RouterLink,
    NgIcon,
    EmptyState,
    ErrorState,
    FacilityBuilding3dScene,
    HlmButton,
    HlmSkeleton,
  ],
  providers: [
    provideIcons({
      lucideArrowLeft,
      lucideBoxes,
      lucideLayers,
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
   * @description The workspace owning this facility, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property facilityId
   * @readonly
   * @description The building facility whose model this route renders, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly facilityId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The route-scoped store carrying the model fetch and the view-local scene state. */
  protected readonly store: FacilityBuilding3dStoreType =
    inject<FacilityBuilding3dStoreType>(FacilityBuilding3dStore);

  /** Organization permission checks gating the empty state's "Go to Plans" call to action. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /**
   * Property canWrite
   * @readonly
   * @description Whether the member may add floors from the record's Plans tab.
   * @access protected
   * @since 1.0.0
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
   * @type {WritableSignal<boolean>}
   */
  protected readonly webglSupported: WritableSignal<boolean> = signal<boolean>(true);

  /** Where the toolbar's "View 2D plan" and the empty state's call to action point. */
  protected readonly plansTabRoute: Signal<readonly string[]> = computed<readonly string[]>(() => [
    '/organizations',
    this.organizationId(),
    'facilities',
    this.facilityId(),
  ]);

  /**
   * Property hoveredRoomId
   * @readonly
   *
   * @description
   * The scene's currently hovered room, mirrored from its `roomHovered`
   * output — page-local only, reserved for a future hover detail chip.
   * Never written to a store: hover is a per-frame signal the scene already
   * keeps local to itself.
   *
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string | null>}
   */
  protected readonly hoveredRoomId: WritableSignal<string | null> = signal<string | null>(null);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
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
    effect((): void => {
      const organizationId: string = this.organizationId();
      const facilityId: string = this.facilityId();

      untracked((): void => {
        this.store.loadModel({ organizationId, facilityId });
      });
    });

    afterNextRender((): void => {
      this.webglSupported.set(detectWebglSupport());
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method retryLoad
   * @description The load-failed state's retry — re-runs {@link FacilityBuilding3dStore.loadModel}.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected retryLoad(): void {
    this.store.loadModel({ organizationId: this.organizationId(), facilityId: this.facilityId() });
  }

  /**
   * Method onRenderingUnavailable
   * @description The scene's `renderingUnavailable` output — falls back to the incompatible-device state.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onRenderingUnavailable(): void {
    this.webglSupported.set(false);
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
