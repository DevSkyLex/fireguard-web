import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  FacilityBuildingModelFloor,
  FacilityPlanOverlayZone,
} from '@features/organization/features/facilities/models';
import {
  FacilityBuilding3dStore,
  type FacilityBuilding3dStoreType,
} from '@features/organization/features/facilities/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { isCompact } from '@shared/breakpoint';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { FacilityBuilding3dRoomPanel } from '../../components/facility-building-3d-room-panel';
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
 * select, `backgroundActivated` deselects the current room only (the floor
 * selection is never cleared by a pointer gesture — see below), and
 * `roomHovered` only ever writes {@link hoveredRoomId}, feeding the
 * discreet hover label ({@link hoveredRoomName}), never the store (a
 * per-frame `patchState` would be a store misuse `FacilityBuilding3dStore`'s
 * own `@description` already rules out).
 *
 * The empty state's "Go to Plans" call to action links to this facility's
 * record with `?tab=plans`, gated on `FACILITIES_WRITE` — floors are added
 * from that tab, not from here. `FacilityDetailPage.activeTab` follows that
 * query parameter, so arriving there lands on the Plans tab.
 *
 * `app-facility-building-3d-room-panel` (P2) is this feature's **only**
 * keyboard/screen-reader entry path, since the canvas is pointer-only. It
 * mounts as soon as a floor is selected — never gated on a room, which
 * would leave no path in at all — and `FacilityBuilding3dStore.loadModel`
 * selects the model's first floor by default precisely so that panel is
 * always reachable with no prior pointer interaction (WCAG 2.1.1). Selecting
 * a room (canvas tap or the panel's own room list) moves real DOM focus into
 * the panel's room-detail close control (see {@link syncSelectionFocus});
 * deselecting it — that control, `backgroundActivated`, or `Escape`
 * ({@link onEscapePressed}) — returns focus to wherever it was before,
 * never to `body`, and never touches the floor selection. A `sr-only`
 * `aria-live="polite"` region ({@link selectionAnnouncement}) announces the
 * same selection change in words, and a discreet, `aria-hidden` label
 * ({@link hoveredRoomName}) mirrors the scene's own hover preview — the
 * canvas's tap-only tablet path never assumes a prior hover, and neither
 * does this page. {@link pageRoot}, this focus machinery's last-resort
 * fallback, carries {@link pageRootLabel} so a focus landing there is never
 * silent.
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
    FacilityBuilding3dRoomPanel,
    HlmButton,
    HlmSkeleton,
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
   * output — page-local only, feeding {@link hoveredRoomName}'s discreet
   * preview label. Never written to a store: hover is a per-frame signal the
   * scene already keeps local to itself.
   *
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string | null>}
   */
  /**
   * Property roomPanelOpen
   * @readonly
   *
   * @description
   * Whether the compact-viewport sheet is showing. Owned here rather than by
   * the panel, because the toolbar control that brings a dismissed sheet back
   * lives here too.
   *
   * It starts closed: on a small screen the sheet covers most of the very
   * building it describes, and arriving on a dedicated 3D view to find it
   * hidden would be the wrong first impression. The toolbar button is a real
   * focusable control, so the keyboard path into the room list survives the
   * sheet being closed.
   *
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly roomPanelOpen: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the viewport is narrow enough that the panel renders as a dismissible sheet. */
  protected readonly isCompact: Signal<boolean> = isCompact();

  protected readonly hoveredRoomId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property hoveredRoomName
   * @readonly
   * @description {@link hoveredRoomId} resolved to its display name, across every floor — `null` while nothing is hovered or the id matches no room in the loaded model. The hover preview's own text.
   * @access protected
   * @since 1.0.0
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
   * @type {Signal<string>}
   */
  protected readonly selectionAnnouncement: Signal<string> = computed<string>(() => {
    const room: FacilityPlanOverlayZone | null = this.store.selectedRoom();
    const floor: FacilityBuildingModelFloor | null = this.store.selectedFloor();

    if (room && floor) {
      return $localize`:@@facility.building3d.selectionAnnouncement:Selected ${room.name}:room: on ${floor.name}:floor:`;
    }
    if (floor) {
      return $localize`:@@facility.building3d.floorSelectionAnnouncement:Selected floor ${floor.name}:floor:`;
    }

    return '';
  });

  /** Injection context {@link syncSelectionFocus} needs to schedule a post-render focus move. */
  private readonly injector: Injector = inject(Injector);

  /** The room panel instance, when the current selection renders it — {@link syncSelectionFocus}'s open-side focus target. */
  private readonly roomPanel: Signal<FacilityBuilding3dRoomPanel | undefined> = viewChild(
    FacilityBuilding3dRoomPanel,
  );

  /** This page's own root — {@link syncSelectionFocus}'s close-side fallback once the element focus started on is gone. */
  private readonly pageRoot: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('pageRoot');

  /** {@link pageRoot}'s accessible name — a focus landing on a last-resort fallback must still be named, not silent. */
  protected readonly pageRootLabel: string = $localize`:@@facility.building3d.pageRootLabel:3D building view`;

  /** The element that held focus just before a selection opened the room panel, restored once it closes. */
  private previouslyFocusedElement: HTMLElement | null = null;

  /** Whether a selection was present on the previous check — the edge {@link syncSelectionFocus} reacts to. */
  private wasSelected = false;

  /** Injects `Router` for {@link onPlan2dRequested}'s navigation — the panel itself only emits. */
  private readonly router: Router = inject(Router);
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

    effect((): void => {
      const isSelected: boolean = this.store.selectedRoomId() !== null;

      untracked((): void => this.syncSelectionFocus(isSelected));
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

  /**
   * Method onEscapePressed
   * @description `Escape` deselects the current room — the same effect as `backgroundActivated` or the panel's own room-detail close control. Never touches the floor selection, so the room panel stays mounted and reachable. A no-op when no room is selected, so it never fights another surface's own `Escape` handling.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onEscapePressed(): void {
    if (this.store.selectedRoomId() === null) return;

    this.store.selectRoom(null);
  }

  /**
   * Method onPlan2dRequested
   * @description The room panel's "View on 2D plan" action — navigates to this facility's record on its Plans tab, the same destination the toolbar's own link already points to.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onPlan2dRequested(): void {
    void this.router.navigate(this.plansTabRoute(), { queryParams: { tab: 'plans' } });
  }

  /**
   * Method syncSelectionFocus
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
   * @param {boolean} isSelected - Whether a room is currently selected.
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
