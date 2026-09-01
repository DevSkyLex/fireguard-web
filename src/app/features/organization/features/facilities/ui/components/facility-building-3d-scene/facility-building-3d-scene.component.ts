import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type { FacilityBuildingModelOutput } from '@features/organization/features/facilities/models';
import { HlmSkeleton } from '@shared/ui/skeleton';
import {
  CAMERA_DISTANCE_MULTIPLIER,
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_NEAR,
  DIMMED_OPACITY,
  EXPLODE_ANIMATION_MS,
  EXPLODE_EXTRA_GAP,
  FLOOR_HEIGHT,
  MAX_DEVICE_PIXEL_RATIO,
  ROOM_TYPE_HUE_OFFSET,
} from './constants/facility-building-3d-scene.constants';
import type { SceneObjectUserData, ScenePalette, ScenePickCandidate } from './models';
import { buildFloorGroup, pickTarget, readScenePalette } from './utils';

/** The three.js module's own type, imported dynamically so it never enters the initial bundle. */
type ThreeModule = typeof import('three');
type ThreeScene = InstanceType<ThreeModule['Scene']>;
type ThreeCamera = InstanceType<ThreeModule['PerspectiveCamera']>;
type ThreeRenderer = InstanceType<ThreeModule['WebGLRenderer']>;
type ThreeGroup = InstanceType<ThreeModule['Group']>;
type ThreeMesh = InstanceType<ThreeModule['Mesh']>;
type ThreeColorMaterial = InstanceType<ThreeModule['MeshLambertMaterial']>;
type ThreeRaycaster = InstanceType<ThreeModule['Raycaster']>;
type ThreeVector2 = InstanceType<ThreeModule['Vector2']>;

/**
 * Constant TAP_THRESHOLD_PX
 *
 * @description
 * The maximum pointer travel, in screen pixels, still counted as a tap
 * rather than an orbit drag — the same value as `FacilityPlanEditor`'s own
 * `TAP_THRESHOLD_PX`, duplicated here rather than shared: only two call
 * sites exist so far (`ARCHITECTURE.md` §2.9's rule of three).
 *
 * @since 1.0.0
 */
const TAP_THRESHOLD_PX = 6;

/**
 * Component FacilityBuilding3dScene
 * @class FacilityBuilding3dScene
 *
 * @description
 * The `/:facilityId/3d` route's three.js canvas: one `THREE.Group` per
 * floor (`buildFloorGroup`), lit by a `HemisphereLight` and a directional
 * light over the geometry utils' `MeshLambertMaterial` — a plain diffuse
 * material, deliberately not a PBR one: this view has to stay fluid on a
 * throttled tablet, and nothing it draws would read differently under a
 * physically based shader. `three` and `OrbitControls` are both loaded
 * through `await import()`, mounted only in the browser
 * (`afterNextRender`-style `isPlatformBrowser` guard, mirroring `Map`), so
 * neither ships in this route's initial chunk.
 *
 * Rendering is **on demand**: nothing here runs a permanent
 * `requestAnimationFrame` loop. `invalidate` coalesces any number of
 * triggers (an `OrbitControls` `change` event, a resize, a selection/
 * isolation/theme change) into at most one `renderer.render` per animation
 * frame; the only bounded loop is the exploded-layout tween
 * (`animateExploded`), which stops itself once its duration elapses and is
 * skipped outright — jumping straight to the target — under
 * `prefers-reduced-motion`.
 *
 * A monotonic `generation` counter guards every asynchronous continuation
 * (`await import('three')`, `await import(OrbitControls)`): a
 * `mountAsync` that resolves after the component already tore down checks
 * its captured generation and aborts rather than attaching a live renderer
 * to a dead scene. `teardown` (run from the mount effect's cleanup, i.e. on
 * destroy) bumps the counter first, cancels every pending
 * `requestAnimationFrame`, disconnects the `ResizeObserver`, removes every
 * canvas listener, disposes `OrbitControls` and the renderer, and walks the
 * building group exactly once (`disposeBuildingGroup`) disposing each
 * distinct geometry and material a single time — the utils share materials
 * across meshes, so a naive per-mesh `dispose()` would double-free some and
 * miss others.
 *
 * Hover is coalesced to at most one raycast per animation frame
 * (`onPointerMove` schedules a single pending frame) and never touches a
 * store — `roomHovered` is the only trace it leaves, matching
 * `ARCHITECTURE.md`'s ban on a per-frame `patchState`. A tap
 * (`TAP_THRESHOLD_PX`) is disambiguated from an `OrbitControls` drag by
 * travel distance alone, exactly like `FacilityPlanEditor`'s own gesture,
 * so a tablet with no hover still selects directly on tap.
 *
 * Isolation dims a non-isolated floor's materials to `DIMMED_OPACITY`
 * rather than hiding the group — picking exclusion is already `pickTarget`'s
 * job, given `isolatedFloorId`. A room's tint comes from
 * `ROOM_TYPE_HUE_OFFSET`, a hue rotation of the theme's own resolved
 * `roomFill`, so it distinguishes {@link FacilityType} at a glance without
 * ever standing in for `status` — `PRODUCT.md` reserves status for the P2
 * detail panel, never scene colour alone.
 *
 * Presentational: inputs and outputs only, no store or service
 * (`ARCHITECTURE.md` §10.3) — `FacilityBuilding3dPage` owns every store
 * call this scene's outputs trigger.
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-building-3d-scene',
  imports: [HlmSkeleton],
  templateUrl: './facility-building-3d-scene.component.html',
  host: { class: 'block h-full w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityBuilding3dScene {
  //#region Inputs
  /**
   * Property model
   * @readonly
   * @description The building's floors, plans, outlines and rooms to render.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<FacilityBuildingModelOutput>}
   */
  public readonly model: InputSignal<FacilityBuildingModelOutput> =
    input.required<FacilityBuildingModelOutput>();

  /**
   * Property selectedRoomId
   * @readonly
   * @description The currently selected room's facility id, highlighted with the theme's `roomSelected` colour.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly selectedRoomId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property selectedFloorId
   * @readonly
   * @description The currently selected floor's facility id, highlighted the same way as a selected room's slab.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly selectedFloorId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property isolatedFloorId
   * @readonly
   * @description The floor isolated for display, or `null` when every floor renders. Dims non-isolated floors and, through `pickTarget`, excludes them from picking.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly isolatedFloorId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property exploded
   * @readonly
   * @description Whether floors render vertically spread apart. Tweens on change, unless `prefers-reduced-motion` jumps straight to the target.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly exploded: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property cameraResetToken
   * @readonly
   * @description Recentres the camera on the building's bounding box whenever this value changes — only the change is observed, never its magnitude.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly cameraResetToken: InputSignal<number> = input<number>(0);
  //#endregion

  //#region Outputs
  /**
   * Property roomActivated
   * @readonly
   * @description A room mesh was tapped/clicked — emits its facility id.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly roomActivated: OutputEmitterRef<string> = output<string>();

  /**
   * Property floorActivated
   * @readonly
   * @description A floor's slab was tapped/clicked (no room hit) — emits the floor's facility id.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly floorActivated: OutputEmitterRef<string> = output<string>();

  /**
   * Property roomHovered
   * @readonly
   * @description The hovered room's facility id, or `null` once the pointer leaves it — coalesced to at most one raycast per frame, never written to a store.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string | null>}
   */
  public readonly roomHovered: OutputEmitterRef<string | null> = output<string | null>();

  /**
   * Property backgroundActivated
   * @readonly
   * @description A tap/click hit nothing pickable — the page's cue to clear the current selection.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly backgroundActivated: OutputEmitterRef<void> = output<void>();

  /**
   * Property renderingUnavailable
   * @readonly
   * @description The renderer could not be created, or its WebGL context was lost — the page's cue to fall back to a non-3D state.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly renderingUnavailable: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** Guards the browser-only mount. */
  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /** Whether this instance runs on the browser platform. */
  protected readonly isBrowser: boolean = isPlatformBrowser(this.platformId);

  /** Whether the exploded-layout tween may animate, or must jump straight to its target. */
  private readonly reducedMotion: boolean =
    this.isBrowser &&
    (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  /** The app-wide appearance contract driving the palette refresh. */
  private readonly themePort: ThemePort = inject<ThemePort>(THEME_PORT);

  /** Injection context carried into the async mount, for the effects it creates there. */
  private readonly injector: Injector = inject(Injector);

  /** The element the renderer sizes itself against. */
  private readonly containerRef: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild<ElementRef<HTMLDivElement>>('container');

  /** The canvas the renderer mounts into. */
  private readonly canvasRef: Signal<ElementRef<HTMLCanvasElement> | undefined> =
    viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  /**
   * Property ready
   * @readonly
   * @description Whether the renderer has painted at least one frame — the template overlays a skeleton until it does.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly ready: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property ariaLabel
   * @readonly
   * @description The canvas's accessible name, naming the building and its floor count.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly ariaLabel: Signal<string> = computed<string>(() => {
    const data: FacilityBuildingModelOutput = this.model();
    return $localize`:@@facility.building3dScene.ariaLabel:3D view of ${data.buildingName}:buildingName: — ${data.floors.length}:floorCount: floor(s)`;
  });

  /** A monotonic token: every async continuation checks it before touching live state. */
  private generation = 0;

  /** The three.js module, once loaded — reused by every method needing a `THREE.*` constructor. */
  private threeModule: ThreeModule | null = null;

  private renderer: ThreeRenderer | null = null;
  private scene: ThreeScene | null = null;
  private camera: ThreeCamera | null = null;
  private controls: OrbitControls | null = null;
  private raycaster: ThreeRaycaster | null = null;
  private pointerVector: ThreeVector2 | null = null;
  private buildingGroup: ThreeGroup | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private palette: ScenePalette | null = null;

  /** Every room mesh, keyed by its own facility id — read back on selection change. */
  private readonly roomMeshes = new Map<string, ThreeMesh>();

  /** Each room's untinted-by-selection colour, keyed by facility id — restored when deselected. */
  private readonly roomBaseColors = new Map<string, InstanceType<ThreeModule['Color']>>();

  /** Every floor's slab mesh, keyed by the floor's facility id. */
  private readonly slabMeshes = new Map<string, ThreeMesh>();

  /** Every floor's group and stack ordinal, keyed by the floor's facility id — read by `animateExploded`. */
  private readonly floorGroups = new Map<
    string,
    { readonly group: ThreeGroup; readonly ordinal: number }
  >();

  private renderRaf: number | null = null;
  private hoverRaf: number | null = null;
  private explodeRaf: number | null = null;
  private pointerDownPoint: { readonly x: number; readonly y: number } | null = null;
  private lastPointerEvent: PointerEvent | null = null;
  private hoveredFacilityId: string | null = null;
  //#endregion

  //#region Pointer handlers
  /** Records where a pointer sequence on the canvas started, for tap-vs-orbit-drag disambiguation. */
  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerDownPoint = { x: event.clientX, y: event.clientY };
  };

  /** Completes a tap: picks under the pointer and emits the matching activation output, or `backgroundActivated` when nothing was hit. */
  private readonly onPointerUp = (event: PointerEvent): void => {
    const down: { readonly x: number; readonly y: number } | null = this.pointerDownPoint;
    this.pointerDownPoint = null;
    if (!down) return;
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > TAP_THRESHOLD_PX) return;

    const picked: SceneObjectUserData | null = this.pickAt(event);
    if (!picked) {
      this.backgroundActivated.emit();
      return;
    }
    if (picked.kind === 'room') {
      this.roomActivated.emit(picked.facilityId);
    } else if (picked.kind === 'floor-slab') {
      this.floorActivated.emit(picked.floorId);
    }
  };

  /** Schedules at most one raycast per animation frame, emitting `roomHovered` only when the hovered room changes. */
  private readonly onPointerMove = (event: PointerEvent): void => {
    this.lastPointerEvent = event;
    if (this.hoverRaf !== null) return;

    this.hoverRaf = requestAnimationFrame((): void => {
      this.hoverRaf = null;
      const current: PointerEvent | null = this.lastPointerEvent;
      if (!current) return;

      const picked: SceneObjectUserData | null = this.pickAt(current);
      const canvas: HTMLCanvasElement | undefined = this.canvasRef()?.nativeElement;
      if (canvas) canvas.style.cursor = picked ? 'pointer' : '';

      const facilityId: string | null = picked?.kind === 'room' ? picked.facilityId : null;
      if (facilityId === this.hoveredFacilityId) return;
      this.hoveredFacilityId = facilityId;
      this.roomHovered.emit(facilityId);
    });
  };

  /** A lost WebGL context tears the scene down and reports it — no implicit restoration loop. */
  private readonly onContextLost = (event: Event): void => {
    event.preventDefault();
    this.teardown();
    this.renderingUnavailable.emit();
  };
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Kicks off the browser-only, dynamically-imported mount once the canvas renders, tearing it down on destroy.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    if (this.isBrowser) {
      effect(
        (onCleanup): void => {
          if (this.containerRef() === undefined || this.canvasRef() === undefined) return;

          untracked((): void => this.mount());
          onCleanup((): void => this.teardown());
        },
        { injector: this.injector },
      );
    }
  }
  //#endregion

  //#region Mount / teardown
  /** Bumps the generation token and starts an async mount attempt for it. */
  private mount(): void {
    this.generation += 1;
    void this.mountAsync(this.generation);
  }

  /**
   * Method mountAsync
   *
   * @description
   * Loads `three` and `OrbitControls`, creates the renderer/scene/camera/
   * controls, wires the canvas listeners and the `ResizeObserver`, builds
   * the initial building group, and registers the reactive effects for
   * every later input change. Checks `generation` after each `await` so a
   * navigation away mid-import never attaches live objects to a dead
   * component.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {number} generation - This attempt's captured generation token.
   *
   * @returns {Promise<void>}
   */
  private async mountAsync(generation: number): Promise<void> {
    const canvas: HTMLCanvasElement | undefined = this.canvasRef()?.nativeElement;
    const container: HTMLDivElement | undefined = this.containerRef()?.nativeElement;
    if (!canvas || !container) return;

    const THREE: ThreeModule = await import('three');
    if (generation !== this.generation) return;

    let renderer: ThreeRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch {
      this.renderingUnavailable.emit();
      return;
    }

    const { OrbitControls: OrbitControlsCtor } =
      await import('three/examples/jsm/controls/OrbitControls.js');
    if (generation !== this.generation) {
      renderer.dispose();
      return;
    }

    this.threeModule = THREE;
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO));
    renderer.setSize(container.clientWidth, container.clientHeight, false);

    const scene: ThreeScene = new THREE.Scene();
    this.palette = readScenePalette(THREE, container);
    scene.background = this.palette.background;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(1, 2, 1.5);
    scene.add(directional);
    this.scene = scene;

    const aspect: number =
      container.clientWidth > 0 && container.clientHeight > 0
        ? container.clientWidth / container.clientHeight
        : 1;
    const camera: ThreeCamera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      aspect,
      CAMERA_NEAR,
      CAMERA_FAR,
    );
    this.camera = camera;

    const controls: OrbitControls = new OrbitControlsCtor(camera, canvas);
    controls.enableDamping = false;
    controls.addEventListener('change', (): void => this.invalidate());
    this.controls = controls;

    this.raycaster = new THREE.Raycaster();
    this.pointerVector = new THREE.Vector2();

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('webglcontextlost', this.onContextLost, false);

    this.resizeObserver = new ResizeObserver((): void => this.handleResize());
    this.resizeObserver.observe(container);

    this.rebuildBuilding(this.model());
    this.resetCameraView();
    this.invalidate();
    this.ready.set(true);

    this.registerReactiveEffects();
  }

  /**
   * Method teardown
   *
   * @description
   * Invalidates the generation token, cancels every pending
   * `requestAnimationFrame`, disconnects the `ResizeObserver`, removes the
   * canvas listeners, disposes `OrbitControls` and the building group
   * (`disposeBuildingGroup`), disposes the renderer, and nulls every
   * reference. Idempotent — safe to call from the mount effect's cleanup
   * and from `onContextLost` without double-freeing anything.
   *
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private teardown(): void {
    this.generation += 1;

    if (this.renderRaf !== null) {
      cancelAnimationFrame(this.renderRaf);
      this.renderRaf = null;
    }
    if (this.hoverRaf !== null) {
      cancelAnimationFrame(this.hoverRaf);
      this.hoverRaf = null;
    }
    if (this.explodeRaf !== null) {
      cancelAnimationFrame(this.explodeRaf);
      this.explodeRaf = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    const canvas: HTMLCanvasElement | undefined = this.canvasRef()?.nativeElement;
    if (canvas) {
      canvas.removeEventListener('pointerdown', this.onPointerDown);
      canvas.removeEventListener('pointerup', this.onPointerUp);
      canvas.removeEventListener('pointermove', this.onPointerMove);
      canvas.removeEventListener('webglcontextlost', this.onContextLost, false);
      canvas.style.cursor = '';
    }

    this.controls?.dispose();
    this.controls = null;

    if (this.buildingGroup) {
      this.scene?.remove(this.buildingGroup);
      this.disposeBuildingGroup(this.buildingGroup);
      this.buildingGroup = null;
    }
    this.roomMeshes.clear();
    this.roomBaseColors.clear();
    this.slabMeshes.clear();
    this.floorGroups.clear();

    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.raycaster = null;
    this.pointerVector = null;
    this.palette = null;
    this.threeModule = null;
    this.pointerDownPoint = null;
    this.lastPointerEvent = null;
    this.hoveredFacilityId = null;
    this.ready.set(false);
  }
  //#endregion

  //#region Reactive effects
  /**
   * Method registerReactiveEffects
   *
   * @description
   * Registers one effect per input the initial mount already applied once
   * directly — each skips its own first run so the initial state built by
   * {@link mountAsync} is never redundantly rebuilt.
   *
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private registerReactiveEffects(): void {
    let skipModel = true;
    effect(
      (): void => {
        const model: FacilityBuildingModelOutput = this.model();
        if (skipModel) {
          skipModel = false;
          return;
        }
        untracked((): void => this.rebuildBuilding(model));
      },
      { injector: this.injector },
    );

    let skipSelection = true;
    effect(
      (): void => {
        const selectedRoomId: string | null = this.selectedRoomId();
        const selectedFloorId: string | null = this.selectedFloorId();
        if (skipSelection) {
          skipSelection = false;
          return;
        }
        untracked((): void => this.applySelection(selectedRoomId, selectedFloorId));
      },
      { injector: this.injector },
    );

    let skipIsolation = true;
    effect(
      (): void => {
        const isolatedFloorId: string | null = this.isolatedFloorId();
        if (skipIsolation) {
          skipIsolation = false;
          return;
        }
        untracked((): void => this.applyIsolation(isolatedFloorId));
      },
      { injector: this.injector },
    );

    let skipExploded = true;
    effect(
      (): void => {
        const exploded: boolean = this.exploded();
        if (skipExploded) {
          skipExploded = false;
          return;
        }
        untracked((): void => this.animateExploded(exploded));
      },
      { injector: this.injector },
    );

    let skipCamera = true;
    effect(
      (): void => {
        this.cameraResetToken();
        if (skipCamera) {
          skipCamera = false;
          return;
        }
        untracked((): void => this.resetCameraView());
      },
      { injector: this.injector },
    );

    let skipTheme = true;
    effect(
      (): void => {
        this.themePort.resolvedTheme();
        if (skipTheme) {
          skipTheme = false;
          return;
        }
        untracked((): void => this.applyTheme());
      },
      { injector: this.injector },
    );
  }
  //#endregion

  //#region Scene building
  /**
   * Method rebuildBuilding
   *
   * @description
   * Disposes the previous building group (if any) and rebuilds it from
   * `model` — one `buildFloorGroup` per floor, each room mesh's colour
   * overridden to a {@link ROOM_TYPE_HUE_OFFSET} tint of the theme's
   * `roomFill`, keyed maps refreshed, and the current selection/isolation/
   * exploded state reapplied to the fresh meshes.
   *
   * @access private
   * @since 1.0.0
   * @param {FacilityBuildingModelOutput} model - The building to render.
   * @returns {void}
   */
  private rebuildBuilding(model: FacilityBuildingModelOutput): void {
    const THREE: ThreeModule | null = this.threeModule;
    const container: HTMLDivElement | undefined = this.containerRef()?.nativeElement;
    if (!THREE || !this.scene || !container) return;

    if (this.buildingGroup) {
      this.scene.remove(this.buildingGroup);
      this.disposeBuildingGroup(this.buildingGroup);
    }
    this.roomMeshes.clear();
    this.roomBaseColors.clear();
    this.slabMeshes.clear();
    this.floorGroups.clear();

    const palette: ScenePalette = this.palette ?? readScenePalette(THREE, container);
    this.palette = palette;

    const group: ThreeGroup = new THREE.Group();

    model.floors.forEach((floor, ordinal: number): void => {
      const floorGroup: ThreeGroup = buildFloorGroup(THREE, {
        floorId: floor.facilityId,
        ordinal,
        imageWidth: floor.plan?.imageWidth ?? null,
        imageHeight: floor.plan?.imageHeight ?? null,
        outline: floor.outline?.points ?? null,
        rooms: floor.rooms.map((room) => ({ facilityId: room.facilityId, points: room.points })),
        roomColor: palette.roomFill.getHex(),
        slabColor: palette.floorSlab.getHex(),
        edgesColor: palette.edges.getHex(),
      });

      this.floorGroups.set(floor.facilityId, { group: floorGroup, ordinal });

      for (const child of floorGroup.children) {
        const userData = child.userData as SceneObjectUserData;

        if (userData.kind === 'room') {
          const mesh = child as ThreeMesh;
          const material = mesh.material as ThreeColorMaterial;
          const room = floor.rooms.find(
            (candidate) => candidate.facilityId === userData.facilityId,
          );
          const baseColor = palette.roomFill.clone();
          if (room) baseColor.offsetHSL(ROOM_TYPE_HUE_OFFSET[room.type], 0, 0);
          material.color.copy(baseColor);

          this.roomMeshes.set(userData.facilityId, mesh);
          this.roomBaseColors.set(userData.facilityId, baseColor);
        } else if (userData.kind === 'floor-slab') {
          this.slabMeshes.set(userData.floorId, child as ThreeMesh);
        }
      }

      group.add(floorGroup);
    });

    this.buildingGroup = group;
    this.scene.add(group);

    this.applyIsolation(this.isolatedFloorId());
    this.applySelection(this.selectedRoomId(), this.selectedFloorId());
    if (this.exploded()) this.animateExploded(true);
    this.invalidate();
  }

  /**
   * Method disposeBuildingGroup
   *
   * @description
   * Walks every descendant of `group` exactly once, disposing each distinct
   * geometry and material a single time — the utils share materials across
   * meshes (e.g. every room on a floor may reuse none, but a naive per-mesh
   * `dispose()` would still double-free whichever *are* shared and is the
   * bug this guards against — then clears the group.
   *
   * @access private
   * @since 1.0.0
   * @param {ThreeGroup} group - The building group being torn down.
   * @returns {void}
   */
  private disposeBuildingGroup(group: ThreeGroup): void {
    const disposedGeometries = new Set<{ dispose(): void }>();
    const disposedMaterials = new Set<{ dispose(): void }>();

    group.traverse((object): void => {
      const withResources = object as unknown as {
        geometry?: { dispose(): void };
        material?: { dispose(): void } | ReadonlyArray<{ dispose(): void }>;
      };

      const geometry = withResources.geometry;
      if (geometry && !disposedGeometries.has(geometry)) {
        geometry.dispose();
        disposedGeometries.add(geometry);
      }

      const materials = withResources.material;
      if (!materials) return;
      const materialList = Array.isArray(materials) ? materials : [materials];
      for (const material of materialList) {
        if (material && !disposedMaterials.has(material)) {
          material.dispose();
          disposedMaterials.add(material);
        }
      }
    });

    group.clear();
  }

  /**
   * Method applySelection
   * @description Recolours every room/slab mesh: the selected one to `roomSelected`, every other back to its own base colour.
   * @access private
   * @since 1.0.0
   * @param {string | null} selectedRoomId - The selected room's facility id, or `null`.
   * @param {string | null} selectedFloorId - The selected floor's facility id, or `null`.
   * @returns {void}
   */
  private applySelection(selectedRoomId: string | null, selectedFloorId: string | null): void {
    const palette: ScenePalette | null = this.palette;
    if (!palette) return;

    for (const [facilityId, mesh] of this.roomMeshes) {
      const base = this.roomBaseColors.get(facilityId);
      if (!base) continue;
      (mesh.material as ThreeColorMaterial).color.copy(
        facilityId === selectedRoomId ? palette.roomSelected : base,
      );
    }

    for (const [floorId, mesh] of this.slabMeshes) {
      (mesh.material as ThreeColorMaterial).color.copy(
        floorId === selectedFloorId ? palette.roomSelected : palette.floorSlab,
      );
    }

    this.invalidate();
  }

  /**
   * Method applyIsolation
   * @description Dims every mesh/edge belonging to a floor other than `isolatedFloorId` to `DIMMED_OPACITY`; restores full opacity when `null`. Placeholders are skipped — they render nothing regardless.
   * @access private
   * @since 1.0.0
   * @param {string | null} isolatedFloorId - The isolated floor's facility id, or `null` for none.
   * @returns {void}
   */
  private applyIsolation(isolatedFloorId: string | null): void {
    if (!this.buildingGroup) return;

    this.buildingGroup.traverse((object): void => {
      const userData = object.userData as Partial<SceneObjectUserData>;
      if (!userData.floorId || userData.kind === 'floor-placeholder') return;

      const material = (object as unknown as { material?: ThreeColorMaterial }).material;
      if (!material) return;

      if (material.transparent !== true) {
        material.transparent = true;
        material.needsUpdate = true;
      }
      material.opacity =
        isolatedFloorId !== null && userData.floorId !== isolatedFloorId ? DIMMED_OPACITY : 1;
    });

    this.invalidate();
  }

  /**
   * Method animateExploded
   *
   * @description
   * Tweens every floor group's `position.y` between its stacked base
   * (`ordinal * FLOOR_HEIGHT`) and its exploded target
   * (`+ ordinal * EXPLODE_EXTRA_GAP`) over `EXPLODE_ANIMATION_MS`, in a
   * bounded `requestAnimationFrame` loop that stops itself once the
   * interpolation reaches `1`. Jumps straight to the target with no
   * animation at all under `prefers-reduced-motion`.
   *
   * @access private
   * @since 1.0.0
   * @param {boolean} exploded - The exploded layout's new state.
   * @returns {void}
   */
  private animateExploded(exploded: boolean): void {
    if (this.explodeRaf !== null) {
      cancelAnimationFrame(this.explodeRaf);
      this.explodeRaf = null;
    }
    if (this.floorGroups.size === 0) return;

    const targets = new Map<ThreeGroup, number>();
    for (const { group, ordinal } of this.floorGroups.values()) {
      const baseY: number = ordinal * FLOOR_HEIGHT;
      targets.set(group, exploded ? baseY + ordinal * EXPLODE_EXTRA_GAP : baseY);
    }

    if (this.reducedMotion) {
      for (const [group, y] of targets) group.position.y = y;
      this.invalidate();
      return;
    }

    const starts = new Map<ThreeGroup, number>();
    for (const group of targets.keys()) starts.set(group, group.position.y);
    const startedAt: number = performance.now();

    const step = (now: number): void => {
      const progress: number = Math.min(1, (now - startedAt) / EXPLODE_ANIMATION_MS);
      for (const [group, targetY] of targets) {
        const startY: number = starts.get(group) ?? targetY;
        group.position.y = startY + (targetY - startY) * progress;
      }
      this.invalidate();
      this.explodeRaf = progress < 1 ? requestAnimationFrame(step) : null;
    };
    this.explodeRaf = requestAnimationFrame(step);
  }

  /**
   * Method resetCameraView
   * @description Frames the building's bounding box in a three-quarter view and points `OrbitControls`' target at its centre.
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private resetCameraView(): void {
    const THREE: ThreeModule | null = this.threeModule;
    if (!THREE || !this.camera || !this.controls || !this.buildingGroup) return;

    const box = new THREE.Box3().setFromObject(this.buildingGroup);
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDimension: number = Math.max(size.x, size.y, size.z, 0.1);
    const distance: number = maxDimension * CAMERA_DISTANCE_MULTIPLIER;

    this.camera.position.set(center.x + distance, center.y + distance * 0.75, center.z + distance);
    this.camera.near = Math.max(0.01, distance / 100);
    this.camera.far = distance * 10;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(center);
    this.controls.update();
    this.invalidate();
  }

  /**
   * Method applyTheme
   * @description Re-reads the theme palette off the container and rebuilds the building group so every material picks up the new colours.
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private applyTheme(): void {
    const THREE: ThreeModule | null = this.threeModule;
    const container: HTMLDivElement | undefined = this.containerRef()?.nativeElement;
    if (!THREE || !container || !this.scene) return;

    this.palette = readScenePalette(THREE, container);
    this.scene.background = this.palette.background;
    this.rebuildBuilding(this.model());
  }

  /**
   * Method handleResize
   * @description Resizes the renderer and updates the camera aspect ratio when the container's size changes.
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private handleResize(): void {
    const container: HTMLDivElement | undefined = this.containerRef()?.nativeElement;
    if (!container || !this.renderer || !this.camera) return;

    const width: number = container.clientWidth;
    const height: number = container.clientHeight;
    if (width <= 0 || height <= 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.invalidate();
  }

  /**
   * Method pickAt
   * @description Raycasts from the pointer event through the camera and resolves the nearest eligible object via `pickTarget`.
   * @access private
   * @since 1.0.0
   * @param {PointerEvent} event - The pointer event to raycast from.
   * @returns {SceneObjectUserData | null} The picked object's `userData`, or `null` when nothing eligible was hit.
   */
  private pickAt(event: PointerEvent): SceneObjectUserData | null {
    const canvas: HTMLCanvasElement | undefined = this.canvasRef()?.nativeElement;
    if (!canvas || !this.camera || !this.buildingGroup || !this.raycaster || !this.pointerVector) {
      return null;
    }

    const rect: DOMRect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    this.pointerVector.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointerVector, this.camera);

    const intersections = this.raycaster.intersectObjects(this.buildingGroup.children, true);
    const candidates: ReadonlyArray<ScenePickCandidate> = intersections.map(
      (intersection): ScenePickCandidate => ({
        userData: intersection.object.userData as SceneObjectUserData,
        distance: intersection.distance,
      }),
    );

    return pickTarget(candidates, this.isolatedFloorId());
  }

  /**
   * Method invalidate
   * @description Schedules at most one `renderer.render` per animation frame — the sole rendering trigger, since this scene runs no permanent render loop.
   * @access private
   * @since 1.0.0
   * @returns {void}
   */
  private invalidate(): void {
    if (this.renderRaf !== null) return;

    this.renderRaf = requestAnimationFrame((): void => {
      this.renderRaf = null;
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    });
  }
  //#endregion
}
