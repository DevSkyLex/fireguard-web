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

/**
 * Component FacilityBuilding3dPage
 * @class FacilityBuilding3dPage
 *
 * @description
 * Route entry page for the dedicated building 3D view
 * (`/organizations/:organizationId/facilities/:facilityId/3d`). This lot
 * (P0) ships no three.js scene at all — the page orchestrates
 * {@link FacilityBuilding3dStore}'s browser-only `loadModel` and renders one
 * of five states: a full-frame skeleton while the model is unresolved (also
 * the exact SSR output, since the store's fetch never fires on the server),
 * `app-error-state` with a retry, `app-empty-state` when the building has no
 * floors, a dedicated incompatible-device state when this browser lacks
 * WebGL, and — once P1 exists — an explicit placeholder standing in for the
 * scene, beside a toolbar already wired to the store (reset camera, toggle
 * exploded layout, link to the 2D plan, back to the record).
 *
 * WebGL support is probed inline, once, in {@link afterNextRender} — a
 * three-line `canvas.getContext` check does not earn a shared `utils/`
 * helper (rule of three, `ARCHITECTURE.md` §2.9) and never runs on the
 * server, where {@link webglSupported} simply keeps its optimistic default
 * masked by the loading state.
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
  imports: [RouterLink, NgIcon, EmptyState, ErrorState, HlmButton, HlmSkeleton],
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
