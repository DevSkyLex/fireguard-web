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
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideFireExtinguisher,
  lucideAlarmSmoke,
  lucideThermometer,
  lucideDroplets,
  lucidePanelTop,
  lucideDoorClosed,
  lucideLightbulb,
  lucideLockKeyhole,
  lucideCamera,
  lucideWind,
  lucidePackage,
  lucideWaves,
} from '@ng-icons/lucide';
import type { Mesh, Material, Texture, BufferGeometry, Object3D, Line, Points } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { resolveEquipmentStatusTag } from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import type {
  FacilityModelAsset,
  FacilityModelOutput,
} from '@features/organization/features/facilities/models';
import type { FacilityBuildingModelOutput } from '@features/organization/features/facilities/models';
import {
  isMetricFacilityFloor,
  resolveFacilityModelBinding,
} from '@features/organization/features/facilities/utils';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import {
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_NEAR,
  EXPLODE_ANIMATION_MS,
  EXPLODE_EXTRA_GAP,
  MAX_DEVICE_PIXEL_RATIO,
} from './constants/facility-building-3d-scene.constants';
import type { SceneObjectUserData, ScenePalette, ScenePickCandidate } from './models';
import type { ScreenEquipmentMarker } from './models/screen-equipment-marker.interface';
import { buildFloorGroup, pickTarget, readScenePalette } from './utils';
/**
 * Type ThreeModule
 *
 * @description
 * Names the Three.js module type used by the browser-only scene loader.
 *
 * @type {typeof import('three')}
 */
type ThreeModule = typeof import('three');
/**
 * Type ThreeScene
 *
 * @description
 * Represents the Three.js scene instance used by the facility viewer.
 *
 * @type ThreeScene
 */
type ThreeScene = InstanceType<ThreeModule['Scene']>;
/**
 * Type ThreeCamera
 *
 * @description
 * Represents the Three.js perspective camera used by the facility viewer.
 *
 * @type ThreeCamera
 */
type ThreeCamera = InstanceType<ThreeModule['PerspectiveCamera']>;
/**
 * Type ThreeRenderer
 *
 * @description
 * Represents the WebGL renderer used by the facility viewer.
 *
 * @type ThreeRenderer
 */
type ThreeRenderer = InstanceType<ThreeModule['WebGLRenderer']>;
/**
 * Type ThreeGroup
 *
 * @description
 * Represents a Three.js group used to organize facility meshes.
 *
 * @type ThreeGroup
 */
type ThreeGroup = InstanceType<ThreeModule['Group']>;
/**
 * Type ThreeMesh
 *
 * @description
 * Represents a Three.js mesh rendered in the facility scene.
 *
 * @type ThreeMesh
 */
type ThreeMesh = InstanceType<ThreeModule['Mesh']>;
/**
 * Type ThreeColorMaterial
 *
 * @description
 * Represents the material used to color facility scene meshes.
 *
 * @type ThreeColorMaterial
 */
type ThreeColorMaterial = InstanceType<ThreeModule['MeshLambertMaterial']>;
/**
 * Type ThreeRaycaster
 *
 * @description
 * Represents the Three.js raycaster used for scene hit testing.
 *
 * @type ThreeRaycaster
 */
type ThreeRaycaster = InstanceType<ThreeModule['Raycaster']>;
/**
 * Type ThreeVector2
 *
 * @description
 * Represents the two-dimensional pointer coordinates used by the scene.
 *
 * @type ThreeVector2
 */
type ThreeVector2 = InstanceType<ThreeModule['Vector2']>;
/**
 * Type ThreeLineSegments
 *
 * @description
 * Represents line segments rendered in the facility scene.
 *
 * @type ThreeLineSegments
 */
type ThreeLineSegments = InstanceType<ThreeModule['LineSegments']>;
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
 * Constant PRIMITIVE_PICK_TOLERANCE_PX
 *
 * @description
 * Adds a fixed CSS-pixel pointer tolerance around imported points and line strokes.
 *
 * @since unreleased
 */
const PRIMITIVE_PICK_TOLERANCE_PX = 6;
/**
 * Class FacilityBuilding3dScene
 * @class FacilityBuilding3dScene
 *
 * @description
 * Renders generated plan geometry and imported GLB assets in one browser-only, on-demand scene.
 * Generation fencing protects asynchronous mounts; teardown releases renderer-owned resources once.
 * Visible bounds drive aspect-aware framing. Accessible equipment markers retain screen size.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-building-3d-scene',
  imports: [HlmSkeleton, HlmButton, NgIcon],
  providers: [
    provideIcons({
      lucideFireExtinguisher,
      lucideAlarmSmoke,
      lucideThermometer,
      lucideDroplets,
      lucidePanelTop,
      lucideDoorClosed,
      lucideLightbulb,
      lucideLockKeyhole,
      lucideCamera,
      lucideWind,
      lucidePackage,
      lucideWaves,
    }),
  ],
  templateUrl: './facility-building-3d-scene.component.html',
  host: { class: 'block h-full w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityBuilding3dScene {
  //#region Inputs
  /**
   * Property model
   * @readonly
   *
   * @description
   * The building's floors, plans, outlines and rooms to render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<FacilityBuildingModelOutput>}
   */
  public readonly model: InputSignal<FacilityBuildingModelOutput> =
    input.required<FacilityBuildingModelOutput>();
  /**
   * Property selectedRoomId
   * @readonly
   *
   * @description
   * The currently selected room's facility id, highlighted with the theme's `roomSelected` colour.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly selectedRoomId: InputSignal<string | null> = input<string | null>(null);
  /**
   * Property selectedFloorId
   * @readonly
   *
   * @description
   * The currently selected floor's facility id, highlighted the same way as a selected room's slab.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly selectedFloorId: InputSignal<string | null> = input<string | null>(null);
  /**
   * Property isolatedFloorId
   * @readonly
   *
   * @description
   * The isolated floor, or null to show every floor. Hidden floors are excluded from picking.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly isolatedFloorId: InputSignal<string | null> = input<string | null>(null);
  /**
   * Property exploded
   * @readonly
   *
   * @description
   * Whether floors render vertically spread apart. Tweens on change, unless
   * `prefers-reduced-motion` jumps straight to the target.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly exploded: InputSignal<boolean> = input<boolean>(false);
  /**
   * Property cameraResetToken
   * @readonly
   *
   * @description
   * Recentres the camera on the building's bounding box whenever this value changes — only the
   * change is observed, never its magnitude.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly cameraResetToken: InputSignal<number> = input<number>(0);
  /**
   * Property metric
   * @readonly
   *
   * @description
   * Uses only calibrated floors with physical elevation and height.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly metric: InputSignal<boolean> = input(false);
  /**
   * Property selectedEquipmentId
   * @readonly
   *
   * @description
   * Highlights the selected screen marker without moving its source position.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly selectedEquipmentId: InputSignal<string | null> = input<string | null>(null);
  /**
   * Property importedModel
   * @readonly
   *
   * @description
   * Imported model settings in the shared building reference frame.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityModelOutput | null>}
   */
  public readonly importedModel: InputSignal<FacilityModelOutput | null> =
    input<FacilityModelOutput | null>(null);
  /**
   * Property importedModelAsset
   * @readonly
   *
   * @description
   * Store-owned source asset. This renderer clones every GPU resource it disposes.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityModelAsset | null>}
   */
  public readonly importedModelAsset: InputSignal<FacilityModelAsset | null> =
    input<FacilityModelAsset | null>(null);

  /**
   * Property facilityFloorIds
   * @readonly
   *
   * @description
   * Nearest floors from the authorized hierarchy, including places without plan contours.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<Readonly<Record<string, string | null>>>}
   */
  public readonly facilityFloorIds: InputSignal<Readonly<Record<string, string | null>>> = input(
    {},
  );

  /**
   * Property selectedFacilityId
   * @readonly
   *
   * @description
   * Selected imported association independently of generated room geometry.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly selectedFacilityId: InputSignal<string | null> = input<string | null>(null);
  /**
   * Property selectedNodeIndex
   * @readonly
   *
   * @description
   * Source glTF node selected in the model association workflow.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number | null>}
   */
  public readonly selectedNodeIndex: InputSignal<number | null> = input<number | null>(null);
  //#endregion
  //#region Outputs
  /**
   * Property roomActivated
   * @readonly
   *
   * @description
   * A room mesh was tapped/clicked — emits its facility id.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly roomActivated: OutputEmitterRef<string> = output<string>();
  /**
   * Property floorActivated
   * @readonly
   *
   * @description
   * A floor's slab was tapped/clicked (no room hit) — emits the floor's facility id.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly floorActivated: OutputEmitterRef<string> = output<string>();
  /**
   * Property roomHovered
   * @readonly
   *
   * @description
   * The hovered room's facility id, or `null` once the pointer leaves it — coalesced to at most one
   * raycast per frame, never written to a store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string | null>}
   */
  public readonly roomHovered: OutputEmitterRef<string | null> = output<string | null>();
  /**
   * Property backgroundActivated
   * @readonly
   *
   * @description
   * A tap/click hit nothing pickable — the page's cue to clear the current selection.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly backgroundActivated: OutputEmitterRef<void> = output<void>();
  /**
   * Property renderingUnavailable
   * @readonly
   *
   * @description
   * The renderer could not be created, or its WebGL context was lost — the page's cue to fall back
   * to a non-3D state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly renderingUnavailable: OutputEmitterRef<void> = output<void>();
  /**
   * Property equipmentActivated
   * @readonly
   *
   * @description
   * Selects the equipment represented by a screen marker.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly equipmentActivated: OutputEmitterRef<string> = output<string>();
  /**
   * Property importedNodeSelected
   * @readonly
   *
   * @description
   * Selects a stable source node index for association to an existing facility.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly importedNodeSelected: OutputEmitterRef<number> = output<number>();
  //#endregion
  //#region Properties
  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Provides the Angular platform identifier used to guard browser-only rendering.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platformId: object = inject<object>(PLATFORM_ID);
  /**
   * Property isBrowser
   * @readonly
   *
   * @description
   * Indicates whether the scene can create browser graphics and event listeners.
   *
   * @access protected
   * @since unreleased
   *
   * @type {boolean}
   */
  protected readonly isBrowser: boolean = isPlatformBrowser(this.platformId);
  /**
   * Property reducedMotion
   * @readonly
   *
   * @description
   * Indicates whether the browser requests reduced motion for scene transitions.
   *
   * @access private
   * @since unreleased
   *
   * @type {boolean}
   */
  private readonly reducedMotion: boolean =
    this.isBrowser &&
    (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false);
  /**
   * Property themePort
   * @readonly
   *
   * @description
   * Provides the current Fireguard theme colors used to render the scene.
   *
   * @access private
   * @since unreleased
   *
   * @type {ThemePort}
   */
  private readonly themePort: ThemePort = inject<ThemePort>(THEME_PORT);
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
   * Property containerRef
   * @readonly
   *
   * @description
   * References the element that sizes the facility scene viewport.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ElementRef<HTMLDivElement> | undefined>}
   */
  private readonly containerRef: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild<ElementRef<HTMLDivElement>>('container');
  /**
   * Property canvasRef
   * @readonly
   *
   * @description
   * References the canvas that receives the WebGL rendering context.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ElementRef<HTMLCanvasElement> | undefined>}
   */
  private readonly canvasRef: Signal<ElementRef<HTMLCanvasElement> | undefined> =
    viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  /**
   * Property ready
   * @readonly
   *
   * @description
   * Whether the renderer has painted at least one frame — the template overlays a skeleton until it
   * does.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly ready: WritableSignal<boolean> = signal<boolean>(false);
  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * The canvas's accessible name, naming the building and its floor count.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly ariaLabel: Signal<string> = computed<string>(() => {
    const data: FacilityBuildingModelOutput = this.model();
    return $localize`:@@facility.building3dScene.ariaLabel:3D view of ${data.buildingName}:buildingName: — ${data.floors.length}:floorCount: floor(s)`;
  });
  /**
   * Property generation
   *
   * @description
   * Invalidates scene mounts that finish after a newer mount or teardown.
   *
   * @access private
   * @since unreleased
   *
   * @type {number}
   */
  private generation = 0;
  /**
   * Property equipmentMarkers
   * @readonly
   *
   * @description
   * Projects actual source placements into screen space; marker size remains constant while
   * orbiting.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ReadonlyArray<ScreenEquipmentMarker>>}
   */
  protected readonly equipmentMarkers: WritableSignal<ReadonlyArray<ScreenEquipmentMarker>> =
    signal([]);
  /**
   * Property threeModule
   *
   * @description
   * Caches the dynamically imported Three.js module while the scene is mounted.
   *
   * @access private
   * @since unreleased
   *
   * @type {ThreeModule | null}
   */
  private threeModule: ThreeModule | null = null;
  /**
   * Property renderer
   *
   * @description
   * Holds the WebGL renderer while the 3D facility scene is initialized.
   *
   * @access private
   * @since unreleased
   *
   * @type {ThreeRenderer | null}
   */
  private renderer: ThreeRenderer | null = null;
  /**
   * Property scene
   *
   * @description
   * Holds the Three.js scene that contains the facility model.
   *
   * @access private
   * @since unreleased
   *
   * @type {ThreeScene | null}
   */
  private scene: ThreeScene | null = null;
  /**
   * Property camera
   *
   * @description
   * Holds the camera used to view the facility scene.
   *
   * @access private
   * @since unreleased
   *
   * @type {ThreeCamera | null}
   */
  private camera: ThreeCamera | null = null;
  /**
   * Property controls
   *
   * @description
   * Holds the orbit controls attached to the facility scene camera.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrbitControls | null}
   */
  private controls: OrbitControls | null = null;
  /**
   * Property raycaster
   *
   * @description
   * Holds the raycaster used to detect pointer targets in the scene.
   *
   * @access private
   * @since unreleased
   *
   * @type {ThreeRaycaster | null}
   */
  private raycaster: ThreeRaycaster | null = null;
  /**
   * Property pointerVector
   *
   * @description
   * Holds the normalized pointer coordinates used for scene hit testing.
   *
   * @access private
   * @since unreleased
   *
   * @type {ThreeVector2 | null}
   */
  private pointerVector: ThreeVector2 | null = null;
  /**
   * Property buildingGroup
   *
   * @description
   * Groups the rendered building meshes within the scene.
   *
   * @access private
   * @since unreleased
   *
   * @type {ThreeGroup | null}
   */
  private buildingGroup: ThreeGroup | null = null;
  /**
   * Property resizeObserver
   *
   * @description
   * Tracks container size changes so the renderer can update its viewport.
   *
   * @access private
   * @since unreleased
   *
   * @type {ResizeObserver | null}
   */
  private resizeObserver: ResizeObserver | null = null;
  /**
   * Property palette
   *
   * @description
   * Holds the colors used to render facility status in the scene.
   *
   * @access private
   * @since unreleased
   *
   * @type {ScenePalette | null}
   */
  private palette: ScenePalette | null = null;
  /**
   * Property roomMeshes
   * @readonly
   *
   * @description
   * Indexes rendered room meshes by their facility id.
   *
   * @access private
   * @since unreleased
   *
   * @type {Map<string, ThreeMesh>}
   */
  private readonly roomMeshes = new Map<string, ThreeMesh>();
  /**
   * Property roomBaseColors
   * @readonly
   *
   * @description
   * Stores each room mesh base color so selection highlighting can be cleared.
   *
   * @access private
   * @since unreleased
   *
   * @type {Map<string, InstanceType<ThreeModule['Color']>>}
   */
  private readonly roomBaseColors = new Map<string, InstanceType<ThreeModule['Color']>>();
  /**
   * Property slabMeshes
   * @readonly
   *
   * @description
   * Indexes floor slab meshes by their floor id.
   *
   * @access private
   * @since unreleased
   *
   * @type {Map<string, ThreeMesh>}
   */
  private readonly slabMeshes = new Map<string, ThreeMesh>();
  /**
   * Property selectedRoomOutline
   *
   * @description
   * mesh so it inherits the same floor group's transform (including the
   * exploded-layout tween) — the non-chromatic redundancy `PRODUCT.md`
   * requires alongside `roomSelected`'s fill tint. `null` when no room is
   * selected.
   *
   * @access private
   * @since unreleased
   *
   * @type {ThreeLineSegments | null}
   */
  private selectedRoomOutline: ThreeLineSegments | null = null;
  /**
   * Property selectedFloorOutline
   *
   * @description
   * Holds the outline drawn around the currently selected floor.
   *
   * @access private
   * @since unreleased
   *
   * @type {ThreeLineSegments | null}
   */
  private selectedFloorOutline: ThreeLineSegments | null = null;
  /**
   * Property floorGroups
   * @readonly
   *
   * @description
   * Indexes rendered floor groups together with their display order.
   *
   * @access private
   * @since unreleased
   *
   * @type {Map<string, { readonly group: ThreeGroup; readonly ordinal: number }>}
   */
  private readonly floorGroups: Map<
    string,
    { readonly group: ThreeGroup; readonly ordinal: number; readonly baseY: number }
  > = new Map();
  /**
   * Property renderRaf
   *
   * @description
   * Stores the scheduled animation-frame id for scene rendering.
   *
   * @access private
   * @since unreleased
   *
   * @type {number | null}
   */
  private renderRaf: number | null = null;
  /**
   * Property hoverRaf
   *
   * @description
   * Stores the scheduled animation-frame id for hover updates.
   *
   * @access private
   * @since unreleased
   *
   * @type {number | null}
   */
  private hoverRaf: number | null = null;
  /**
   * Property explodeRaf
   *
   * @description
   * Stores the scheduled animation-frame id for the exploded-view animation.
   *
   * @access private
   * @since unreleased
   *
   * @type {number | null}
   */
  private explodeRaf: number | null = null;
  /**
   * Property pointerDownPoint
   *
   * @description
   * Stores the pointer coordinates captured when a drag begins.
   *
   * @access private
   * @since unreleased
   *
   * @type {{ readonly x: number; readonly y: number } | null}
   */
  private pointerDownPoint: { readonly x: number; readonly y: number } | null = null;
  /**
   * Property lastPointerEvent
   *
   * @description
   * Retains the latest pointer event while the scene handles interaction.
   *
   * @access private
   * @since unreleased
   *
   * @type {PointerEvent | null}
   */
  private lastPointerEvent: PointerEvent | null = null;
  /**
   * Property hoveredFacilityId
   *
   * @description
   * Identifies the facility currently under the pointer, when one is hovered.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null}
   */
  private hoveredFacilityId: string | null = null;
  /**
   * Property importedGroup
   *
   * @description
   * Renderer-owned clone of an immutable source asset.
   *
   * @access private
   * @since unreleased
   *
   * @type {ThreeGroup | null}
   */
  private importedGroup: ThreeGroup | null = null;
  /**
   * Property importedSelectionOutlines
   *
   * @description
   * Renderer-owned outlines for all meshes of a selected source node.
   *
   * @access private
   * @since unreleased
   *
   * @type {ThreeLineSegments[]}
   */
  private importedSelectionOutlines: (ThreeLineSegments | Line | Points)[] = [];
  //#endregion
  //#region Pointer handlers
  /**
   * Property onPointerDown
   * @readonly
   *
   * @description
   * Captures the pointer origin used to distinguish a tap from a drag.
   *
   * @access private
   * @since unreleased
   *
   * @type {(event: PointerEvent) => void}
   */
  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerDownPoint = { x: event.clientX, y: event.clientY };
  };
  /**
   * Property onPointerUp
   * @readonly
   *
   * @description
   * Resolves a pointer tap and emits the selected room or floor event.
   *
   * @access private
   * @since unreleased
   *
   * @type {(event: PointerEvent) => void}
   */
  private readonly onPointerUp: (event: PointerEvent) => void = (event: PointerEvent): void => {
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
    } else if (picked.kind === 'imported-node') {
      this.importedNodeSelected.emit(picked.nodeIndex);
    } else if (picked.kind === 'floor-slab') {
      this.floorActivated.emit(picked.floorId);
    }
  };
  /**
   * Property onPointerMove
   * @readonly
   *
   * @description
   * Throttles pointer hit testing and emits room hover changes.
   *
   * @access private
   * @since unreleased
   *
   * @type {(event: PointerEvent) => void}
   */
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
  /**
   * Property onContextLost
   * @readonly
   *
   * @description
   * Tears down the scene when the browser loses the WebGL context.
   *
   * @access private
   * @since unreleased
   *
   * @type {(event: Event) => void}
   */
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
   *
   * @description
   * Kicks off the browser-only, dynamically-imported mount once the canvas renders, tearing it down
   * on destroy.
   *
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
  //#region Methods
  /**
   * Method mount
   * @method mount
   *
   * @description
   * Starts the asynchronous scene mount for the current generation.
   *
   * @access private
   * @since unreleased
   *
   * @returns {void} No value is returned.
   */
  private mount(): void {
    this.generation += 1;
    void this.mountAsync(this.generation);
  }
  /**
   * Method mountAsync
   * @method mountAsync
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
    const mountedModel = this.model();
    const mountedMetric = this.metric();
    const mountedAsset = this.importedModelAsset();
    const mountedImportedModel = this.importedModel();
    const mountedFacilityFloors = this.facilityFloorIds();
    this.rebuildBuilding(mountedModel);
    this.resetCameraView();
    this.invalidate();
    this.ready.set(true);
    this.registerReactiveEffects(
      () =>
        mountedModel === this.model() &&
        mountedMetric === this.metric() &&
        mountedAsset === this.importedModelAsset() &&
        mountedImportedModel === this.importedModel() &&
        mountedFacilityFloors === this.facilityFloorIds(),
    );
  }
  /**
   * Method teardown
   * @method teardown
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
   *
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
      this.importedGroup = null;
      this.importedSelectionOutlines = [];
    }
    this.roomMeshes.clear();
    this.roomBaseColors.clear();
    this.slabMeshes.clear();
    this.floorGroups.clear();
    this.selectedRoomOutline = null;
    this.selectedFloorOutline = null;
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
   * @method registerReactiveEffects
   *
   * @description
   * Registers effects after the initial mount. The model effect skips its first run only when
   * the latest inputs still match the scene already built by {@link mountAsync}.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {() => boolean} isInitialModelCurrent - Compares current inputs to those actually
   *   rendered.
   *
   * @returns {void}
   */
  private registerReactiveEffects(isInitialModelCurrent: () => boolean): void {
    let skipModel = true;
    effect(
      (): void => {
        const model: FacilityBuildingModelOutput = this.model();
        this.metric();
        this.importedModelAsset();
        this.importedModel();
        this.facilityFloorIds();
        if (skipModel) {
          skipModel = false;
          if (isInitialModelCurrent()) return;
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
        this.selectedEquipmentId();
        this.selectedNodeIndex();
        this.selectedFacilityId();
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
   * @method rebuildBuilding
   *
   * @description
   * Rebuilds generated floors or an independently cloned imported model, preserving the current
   * selection, isolation and coordinate-space inputs.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {FacilityBuildingModelOutput} model - The building to render.
   *
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
    this.selectedRoomOutline = null;
    this.selectedFloorOutline = null;
    this.importedSelectionOutlines = [];
    const palette: ScenePalette = this.palette ?? readScenePalette(THREE, container);
    this.palette = palette;
    const group: ThreeGroup = new THREE.Group();
    model.floors.forEach((floor, ordinal: number): void => {
      const metric = this.metric() || this.importedModelAsset() !== null;
      const calibrated = floor.plan?.calibration;
      if (metric && !isMetricFacilityFloor(floor)) return;
      const floorGroup: ThreeGroup = this.importedModelAsset()
        ? new THREE.Group()
        : buildFloorGroup(THREE, {
            floorId: floor.facilityId,
            ordinal,
            imageWidth: floor.plan?.imageWidth ?? null,
            imageHeight: floor.plan?.imageHeight ?? null,
            outline: floor.outline?.points ?? null,
            rooms: floor.rooms.map((room) => ({
              facilityId: room.facilityId,
              points: room.points,
            })),
            roomColor: palette.roomFill.getHex(),
            slabColor: palette.floorSlab.getHex(),
            edgesColor: palette.edges.getHex(),
            roomHeight: metric ? (floor.heightMeters ?? undefined) : undefined,
          });
      if (metric && calibrated && floor.plan?.imageWidth && floor.plan.imageHeight) {
        const scale = calibrated.widthMeters / (floor.plan.imageWidth / floor.plan.imageHeight);
        floorGroup.scale.set(scale, 1, scale);
        floorGroup.rotation.y = (calibrated.rotationDegrees * Math.PI) / 180;
        floorGroup.position.set(
          calibrated.offsetXMeters,
          floor.elevationMeters ?? 0,
          calibrated.offsetZMeters,
        );
      }
      this.floorGroups.set(floor.facilityId, {
        group: floorGroup,
        ordinal,
        baseY: floorGroup.position.y,
      });
      for (const child of floorGroup.children) {
        const userData = child.userData as SceneObjectUserData;
        if (userData.kind === 'room') {
          const mesh = child as ThreeMesh;
          const material = mesh.material as ThreeColorMaterial;
          const baseColor = palette.roomFill.clone();
          material.color.copy(baseColor);
          this.roomMeshes.set(userData.facilityId, mesh);
          this.roomBaseColors.set(userData.facilityId, baseColor);
        } else if (userData.kind === 'floor-slab') {
          this.slabMeshes.set(userData.floorId, child as ThreeMesh);
        }
      }
      group.add(floorGroup);
    });
    this.importedGroup = this.cloneImportedModel();
    if (this.importedGroup) group.add(this.importedGroup);
    this.buildingGroup = group;
    this.scene.add(group);
    this.applyIsolation(this.isolatedFloorId());
    this.applySelection(this.selectedRoomId(), this.selectedFloorId());
    if (this.exploded() && !this.importedModelAsset()) this.animateExploded(true);
    this.resetCameraView();
    this.invalidate();
  }
  /**
   * Method disposeBuildingGroup
   * @method disposeBuildingGroup
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
   *
   * @param {ThreeGroup} group - The building group being torn down.
   *
   * @returns {void}
   */
  private disposeBuildingGroup(group: ThreeGroup): void {
    const disposedGeometries = new Set<{ dispose(): void }>();
    const disposedMaterials = new Set<{ dispose(): void }>();
    const disposedTextures = new Set<Texture>();
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
          // Three allocates this shared lookup texture when rendering PBR materials, but its
          // renderer disposal drops the properties cache without releasing the GPU allocation.
          // Dispose while that cache is live; Three can upload the retained lookup data again.
          const properties = this.renderer?.properties?.get(material) as
            | { uniforms?: { dfgLUT?: { value?: Texture } } }
            | undefined;
          const lookup = properties?.uniforms?.dfgLUT?.value;
          if (lookup?.isTexture && lookup.name === 'DFG_LUT' && !disposedTextures.has(lookup)) {
            lookup.dispose();
            disposedTextures.add(lookup);
          }
          for (const value of Object.values(material) as unknown[]) {
            if (
              typeof value === 'object' &&
              value !== null &&
              'isTexture' in value &&
              value.isTexture === true &&
              !disposedTextures.has(value as Texture)
            ) {
              (value as Texture).dispose();
              disposedTextures.add(value as Texture);
            }
          }
          material.dispose();
          disposedMaterials.add(material);
        }
      }
    });
    group.clear();
  }
  /**
   * Method applySelection
   * @method applySelection
   *
   * @description
   * Recolours every room/slab mesh: the selected one to `roomSelected`,
   * every other back to its own base colour. Also rebuilds
   * {@link selectedRoomOutline} and {@link selectedFloorOutline} — an
   * `EdgesGeometry` outline in `selectionOutline`'s colour, added as a
   * sibling of the selected mesh so it inherits the same transform. Colour
   * alone never carries the selected state (`PRODUCT.md`); the outline is
   * the redundant, non-chromatic channel a colour-blind or greyscale
   * viewing still reads.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string | null} selectedRoomId - The selected room's facility id, or `null`.
   * @param {string | null} selectedFloorId - The selected floor's facility id, or `null`.
   *
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
    // A slab keeps its own colour whatever is selected. Tinting it the way a
    // room is tinted repaints the entire floor in `--primary`, which reads as
    // a rendering fault rather than a selection — and a floor is selected by
    // default on arrival, so it was the first thing anyone saw. The outline
    // below carries the state on its own, and it is the non-chromatic cue
    // PRODUCT.md asks for anyway.
    for (const mesh of this.slabMeshes.values()) {
      (mesh.material as ThreeColorMaterial).color.copy(palette.floorSlab);
    }
    this.disposeOutline(this.selectedRoomOutline);
    this.selectedRoomOutline =
      selectedRoomId !== null
        ? this.buildSelectionOutline(this.roomMeshes.get(selectedRoomId))
        : null;
    this.disposeOutline(this.selectedFloorOutline);
    this.selectedFloorOutline =
      selectedFloorId !== null
        ? this.buildSelectionOutline(this.slabMeshes.get(selectedFloorId))
        : null;
    for (const outline of this.importedSelectionOutlines) this.disposeOutline(outline);
    this.importedSelectionOutlines = [];
    this.importedGroup?.traverse((object): void => {
      const data = object.userData as SceneObjectUserData;
      if (data.kind !== 'imported-node' || data.bindingUnavailable) return;
      if (
        data.nodePath.includes(this.selectedNodeIndex() ?? -1) ||
        (selectedRoomId !== null && data.facilityId === selectedRoomId) ||
        (this.selectedFacilityId() !== null && data.facilityId === this.selectedFacilityId()) ||
        (selectedFloorId !== null && data.facilityId === selectedFloorId)
      ) {
        const outline = this.buildImportedSelectionOutline(object as Mesh | Line | Points);
        if (outline) this.importedSelectionOutlines.push(outline);
      }
    });
    this.invalidate();
  }
  /**
   * Method buildSelectionOutline
   * @method buildSelectionOutline
   *
   * @description
   * Builds one `EdgesGeometry` outline over `mesh`'s own geometry and adds it as a sibling of
   * `mesh`, so it renders at the exact same transform.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ThreeMesh | undefined} mesh - The mesh to outline, or `undefined` when its id resolved
   *   to nothing (a stale selection against a rebuilt model).
   *
   * @returns {ThreeLineSegments | null} The outline, or `null` when `mesh` is absent or the
   *   three.js module/palette are not ready.
   */
  private buildSelectionOutline(mesh: ThreeMesh | undefined): ThreeLineSegments | null {
    const THREE: ThreeModule | null = this.threeModule;
    const palette: ScenePalette | null = this.palette;
    if (!THREE || !palette || !mesh?.parent || !this.isVisibleSceneObject(mesh)) return null;
    const edgesGeometry: InstanceType<ThreeModule['EdgesGeometry']> = new THREE.EdgesGeometry(
      mesh.geometry,
    );
    const outline: ThreeLineSegments = new THREE.LineSegments(
      edgesGeometry,
      new THREE.LineBasicMaterial({ color: palette.selectionOutline, depthTest: false }),
    );
    outline.position.copy(mesh.position);
    outline.quaternion.copy(mesh.quaternion);
    outline.scale.copy(mesh.scale);
    outline.renderOrder = 1;
    mesh.parent.add(outline);
    return outline;
  }
  /**
   * Method buildImportedSelectionOutline
   *
   * @description
   * Highlights supported GLB primitives with independently owned geometry and material.
   *
   * @access private
   * @since unreleased
   *
   * @param {Mesh | Line | Points} object - Selected imported primitive.
   *
   * @returns {ThreeLineSegments | Line | Points | null} Highlight sibling, or null when hidden.
   */
  private buildImportedSelectionOutline(
    object: Mesh | Line | Points,
  ): ThreeLineSegments | Line | Points | null {
    if ((object as Mesh).isMesh) return this.buildSelectionOutline(object as Mesh);
    const THREE = this.threeModule;
    const palette = this.palette;
    if (!THREE || !palette || !object.parent || !this.isVisibleSceneObject(object)) return null;
    let outline: Line | Points;
    const geometry = object.geometry.clone();
    if ((object as Points).isPoints) {
      const material = (
        Array.isArray(object.material) ? object.material[0] : object.material
      ) as InstanceType<ThreeModule['PointsMaterial']>;
      outline = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color: palette.selectionOutline,
          depthTest: false,
          size: material.size ?? 1,
          sizeAttenuation: material.sizeAttenuation ?? true,
        }),
      );
    } else {
      const material = new THREE.LineBasicMaterial({
        color: palette.selectionOutline,
        depthTest: false,
      });
      const line = object as Line;
      outline = (line as InstanceType<ThreeModule['LineSegments']>).isLineSegments
        ? new THREE.LineSegments(geometry, material)
        : (line as InstanceType<ThreeModule['LineLoop']>).isLineLoop
          ? new THREE.LineLoop(geometry, material)
          : new THREE.Line(geometry, material);
    }
    outline.position.copy(object.position);
    outline.quaternion.copy(object.quaternion);
    outline.scale.copy(object.scale);
    outline.renderOrder = 1;
    object.parent.add(outline);
    return outline;
  }
  /**
   * Method disposeOutline
   * @method disposeOutline
   *
   * @description
   * Removes `outline` from its parent and disposes its geometry and material — a no-op for `null`.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ThreeLineSegments | null} outline - The outline to dispose, or `null`.
   *
   * @returns {void}
   */
  private disposeOutline(outline: ThreeLineSegments | Line | Points | null): void {
    if (!outline) return;
    outline.parent?.remove(outline);
    outline.geometry.dispose();
    for (const material of Array.isArray(outline.material) ? outline.material : [outline.material])
      material.dispose();
  }
  /**
   * Method applyIsolation
   * @method applyIsolation
   *
   * @description
   * Hides non-isolated floors and reframes visible geometry. Unbound imported objects remain
   * visible so users can inspect and align them before association.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string | null} isolatedFloorId - The isolated floor's facility id, or `null` for none.
   *
   * @returns {void}
   */
  private applyIsolation(isolatedFloorId: string | null): void {
    for (const [floorId, { group }] of this.floorGroups) {
      group.visible = isolatedFloorId === null || floorId === isolatedFloorId;
    }
    this.importedGroup?.traverse((object): void => {
      const data = object.userData as SceneObjectUserData;
      if (data.kind !== 'imported-node') return;
      const floorId =
        data.facilityId && Object.hasOwn(this.facilityFloorIds(), data.facilityId)
          ? this.facilityFloorIds()[data.facilityId]
          : null;
      object.visible = isolatedFloorId === null || !floorId || floorId === isolatedFloorId;
    });
    if (this.importedGroup) this.applySelection(this.selectedRoomId(), this.selectedFloorId());
    this.resetCameraView();
    this.invalidate();
  }
  /**
   * Method animateExploded
   * @method animateExploded
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
   *
   * @param {boolean} exploded - The exploded layout's new state.
   *
   * @returns {void}
   */
  private animateExploded(exploded: boolean): void {
    if (this.explodeRaf !== null) {
      cancelAnimationFrame(this.explodeRaf);
      this.explodeRaf = null;
    }
    if (this.importedModelAsset()) return;
    if (this.floorGroups.size === 0) return;
    const targets = new Map<ThreeGroup, number>();
    for (const { group, ordinal, baseY } of this.floorGroups.values()) {
      targets.set(group, exploded ? baseY + ordinal * EXPLODE_EXTRA_GAP : baseY);
    }
    if (this.reducedMotion) {
      for (const [group, y] of targets) group.position.y = y;
      this.resetCameraView();
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
      if (progress === 1) this.resetCameraView();
    };
    this.explodeRaf = requestAnimationFrame(step);
  }
  /**
   * Method resetCameraView
   * @method resetCameraView
   *
   * @description
   * Frames the building's bounding box in a three-quarter view and points `OrbitControls`' target
   * at its centre.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private resetCameraView(): void {
    const THREE: ThreeModule | null = this.threeModule;
    if (!THREE || !this.camera || !this.controls || !this.buildingGroup) return;
    const box = new THREE.Box3();
    for (const { group } of this.floorGroups.values()) {
      if (
        group.visible &&
        group.children.some((child) => child.userData['kind'] !== 'floor-placeholder')
      )
        box.union(new THREE.Box3().setFromObject(group));
    }
    if (this.importedGroup) {
      this.importedGroup.updateWorldMatrix(true, true);
      this.importedGroup.traverse((object): void => {
        if (
          ((object as Mesh).isMesh || (object as Line).isLine || (object as Points).isPoints) &&
          this.isVisibleSceneObject(object)
        )
          box.expandByObject(object, true);
      });
    }
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const halfVertical = (this.camera.fov * Math.PI) / 360;
    const halfHorizontal = Math.atan(Math.tan(halfVertical) * this.camera.aspect);
    const radius = Math.max(size.length() / 2, 0.05);
    const distance = (radius / Math.sin(Math.min(halfVertical, halfHorizontal))) * 1.15;
    const direction = new THREE.Vector3(1, 0.75, 1).normalize();
    this.camera.position.copy(center).addScaledVector(direction, distance);
    this.camera.near = Math.max(0.01, distance / 100);
    this.camera.far = distance * 10;
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(center);
    this.controls.update();
    this.invalidate();
  }
  /**
   * Method applyTheme
   * @method applyTheme
   *
   * @description
   * Re-reads the theme palette off the container and rebuilds the building group so every material
   * picks up the new colours.
   *
   * @access private
   * @since 1.0.0
   *
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
   * @method handleResize
   *
   * @description
   * Resizes the renderer and updates the camera aspect ratio when the container's size changes.
   *
   * @access private
   * @since 1.0.0
   *
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
    this.resetCameraView();
    this.invalidate();
  }
  /**
   * Method pickAt
   * @method pickAt
   *
   * @description
   * Raycasts from the pointer event through the camera and resolves the nearest eligible object via
   * `pickTarget`.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {PointerEvent} event - The pointer event to raycast from.
   *
   * @returns {SceneObjectUserData | null} The picked object's `userData`, or `null` when nothing
   *   eligible was hit.
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
    this.buildingGroup.updateWorldMatrix(true, true);
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointerVector, this.camera);
    const surfaces: Mesh[] = [];
    this.buildingGroup.traverse((object): void => {
      if ((object as Mesh).isMesh && this.isVisibleSceneObject(object))
        surfaces.push(object as Mesh);
    });
    const intersections = this.raycaster
      .intersectObjects(surfaces, false)
      .filter(
        (intersection) =>
          (intersection.object as Mesh).isMesh && this.isVisibleSceneObject(intersection.object),
      );
    const candidates: ScenePickCandidate[] = intersections.map(
      (intersection): ScenePickCandidate => ({
        userData: intersection.object.userData as SceneObjectUserData,
        distance: intersection.distance,
      }),
    );
    this.importedGroup?.traverse((object): void => {
      if (
        ((object as Points).isPoints || (object as Line).isLine) &&
        object.userData['kind'] === 'imported-node' &&
        this.isVisibleSceneObject(object)
      ) {
        const candidate = this.pickPrimitiveAt(object as Points | Line, event, rect);
        if (candidate) candidates.push(candidate);
      }
    });
    return pickTarget(candidates, this.isolatedFloorId());
  }
  /**
   * Method pickPrimitiveAt
   *
   * @description
   * Tests projected GLB points and segments against their CSS-pixel footprint, respecting source
   * indices, draw ranges, parent transforms and camera clipping without a world-space threshold.
   *
   * @access private
   * @since unreleased
   *
   * @param {Points | Line} object - Visible imported primitive.
   * @param {PointerEvent} event - Pointer position in viewport coordinates.
   * @param {DOMRect} rect - Canvas CSS-pixel bounds.
   *
   * @returns {ScenePickCandidate | null} Nearest hit within this primitive, or null for background.
   */
  private pickPrimitiveAt(
    object: Points | Line,
    event: PointerEvent,
    rect: DOMRect,
  ): ScenePickCandidate | null {
    const THREE = this.threeModule;
    const camera = this.camera;
    if (!THREE || !camera || !this.raycaster) return null;
    const positions = object.geometry.getAttribute('position');
    if (!positions) return null;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const pointsMaterial = material as InstanceType<ThreeModule['PointsMaterial']>;
    const isPoints = (object as Points).isPoints;
    const isSegments = (object as ThreeLineSegments).isLineSegments;
    const isLoop = (object as InstanceType<ThreeModule['LineLoop']>).isLineLoop;
    const indices = object.geometry.index;
    const start = Math.max(0, object.geometry.drawRange.start);
    const end = Math.min(
      indices?.count ?? positions.count,
      start + object.geometry.drawRange.count,
    );
    const worldStart = new THREE.Vector3();
    const worldEnd = new THREE.Vector3();
    const viewStart = new THREE.Vector3();
    const viewEnd = new THREE.Vector3();
    const screenStart = new THREE.Vector3();
    const screenEnd = new THREE.Vector3();
    let distance = Number.POSITIVE_INFINITY;
    for (let offset = start; offset < end; offset += isSegments ? 2 : 1) {
      worldStart
        .fromBufferAttribute(positions, indices?.getX(offset) ?? offset)
        .applyMatrix4(object.matrixWorld);
      const depth = -viewStart.copy(worldStart).applyMatrix4(camera.matrixWorldInverse).z;
      if (isPoints) {
        if (depth < camera.near || depth > camera.far) continue;
        screenStart.copy(worldStart).project(camera);
        const size =
          (pointsMaterial.size ?? 1) *
          (pointsMaterial.sizeAttenuation ? rect.height / (2 * depth) : 1);
        const tolerance = PRIMITIVE_PICK_TOLERANCE_PX + size / 2;
        const pixelX = rect.left + ((screenStart.x + 1) * rect.width) / 2;
        const pixelY = rect.top + ((1 - screenStart.y) * rect.height) / 2;
        if (Math.hypot(event.clientX - pixelX, event.clientY - pixelY) <= tolerance)
          distance = Math.min(
            distance,
            viewStart
              .copy(worldStart)
              .sub(this.raycaster.ray.origin)
              .dot(this.raycaster.ray.direction),
          );
        continue;
      }
      const next = offset + 1 < end ? offset + 1 : isLoop ? start : null;
      if (next === null) continue;
      worldEnd
        .fromBufferAttribute(positions, indices?.getX(next) ?? next)
        .applyMatrix4(object.matrixWorld);
      const endDepth = -viewEnd.copy(worldEnd).applyMatrix4(camera.matrixWorldInverse).z;
      const depthDelta = endDepth - depth;
      if (depthDelta === 0) {
        if (depth < camera.near || depth > camera.far) continue;
      } else {
        const nearT = (camera.near - depth) / depthDelta;
        const farT = (camera.far - depth) / depthDelta;
        const firstT = Math.max(0, Math.min(nearT, farT));
        const lastT = Math.min(1, Math.max(nearT, farT));
        if (firstT > lastT) continue;
        viewStart.copy(worldStart);
        worldStart.lerp(worldEnd, firstT);
        worldEnd.lerpVectors(viewStart, worldEnd, lastT);
      }
      screenStart.copy(worldStart).project(camera);
      screenEnd.copy(worldEnd).project(camera);
      const pixelX = rect.left + ((screenStart.x + 1) * rect.width) / 2;
      const pixelY = rect.top + ((1 - screenStart.y) * rect.height) / 2;
      const deltaX = ((screenEnd.x - screenStart.x) * rect.width) / 2;
      const deltaY = ((screenStart.y - screenEnd.y) * rect.height) / 2;
      const lengthSquared = deltaX * deltaX + deltaY * deltaY;
      const fraction =
        lengthSquared === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                1,
                ((event.clientX - pixelX) * deltaX + (event.clientY - pixelY) * deltaY) /
                  lengthSquared,
              ),
            );
      const tolerance =
        PRIMITIVE_PICK_TOLERANCE_PX +
        ((material as InstanceType<ThreeModule['LineBasicMaterial']>).linewidth ?? 1) / 2;
      if (
        Math.hypot(
          event.clientX - pixelX - fraction * deltaX,
          event.clientY - pixelY - fraction * deltaY,
        ) > tolerance
      )
        continue;
      const startDepth = -viewStart.copy(worldStart).applyMatrix4(camera.matrixWorldInverse).z;
      const lastDepth = -viewEnd.copy(worldEnd).applyMatrix4(camera.matrixWorldInverse).z;
      const worldFraction =
        (fraction * startDepth) / (lastDepth * (1 - fraction) + fraction * startDepth);
      worldStart.lerp(worldEnd, worldFraction);
      distance = Math.min(
        distance,
        viewStart.copy(worldStart).sub(this.raycaster.ray.origin).dot(this.raycaster.ray.direction),
      );
    }
    return Number.isFinite(distance)
      ? { userData: object.userData as SceneObjectUserData, distance }
      : null;
  }
  /**
   * Method invalidate
   * @method invalidate
   *
   * @description
   * Schedules at most one `renderer.render` per animation frame — the sole rendering trigger, since
   * this scene runs no permanent render loop.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private invalidate(): void {
    if (this.renderRaf !== null) return;
    this.renderRaf = requestAnimationFrame((): void => {
      this.renderRaf = null;
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
        this.updateEquipmentMarkers();
      }
    });
  }
  /**
   * Method isVisibleSceneObject
   * @method isVisibleSceneObject
   *
   * @description
   * Excludes hidden nested meshes and descendants of hidden ancestors from Three raycast results.
   *
   * @access private
   * @since unreleased
   *
   * @param {Object3D} object - Scene object whose ancestor visibility must be respected.
   *
   * @returns {boolean} Whether every object in its parent chain is visible.
   */
  private isVisibleSceneObject(object: Object3D): boolean {
    let candidate: Object3D | null = object;
    while (candidate) {
      if (!candidate.visible) return false;
      candidate = candidate.parent;
    }
    return true;
  }

  /**
   * Method cloneImportedModel
   *
   * @description
   * Clones source geometry, materials and embedded textures so teardown never disposes store
   * assets.
   *
   * @access private
   * @since unreleased
   *
   * @returns {ThreeGroup | null} Transformed independent renderer clone, or null in generated mode.
   */
  private cloneImportedModel(): ThreeGroup | null {
    const asset = this.importedModelAsset();
    const model = this.importedModel();
    const THREE = this.threeModule;
    if (!asset || !model || !THREE) return null;
    const clone = asset.scene.clone(true);
    const geometries = new Map<BufferGeometry, BufferGeometry>();
    const materials = new Map<Material, Material>();
    const textures = new Map<Texture, Texture>();
    clone.traverse((object): void => {
      const mesh = object as Mesh;
      if (!mesh.isMesh && !(object as Line).isLine && !(object as Points).isPoints) return;
      if (!geometries.has(mesh.geometry)) geometries.set(mesh.geometry, mesh.geometry.clone());
      mesh.geometry = geometries.get(mesh.geometry) ?? mesh.geometry.clone();
      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const cloned = sourceMaterials.map((material) => {
        if (!materials.has(material)) {
          const own = material.clone();
          for (const [key, value] of Object.entries(material) as [string, unknown][]) {
            if (
              typeof value === 'object' &&
              value !== null &&
              'isTexture' in value &&
              value.isTexture === true
            ) {
              const texture = value as Texture;
              if (!textures.has(texture)) textures.set(texture, texture.clone());
              (own as unknown as Record<string, unknown>)[key] = textures.get(texture);
            }
          }
          materials.set(material, own);
        }
        return materials.get(material) ?? material.clone();
      });
      mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
      const nodePath: number[] = [];
      let node: Object3D | null = object;
      while (node) {
        const index = node.userData['facilityModelNodeIndex'] as number | undefined;
        if (index != null) nodePath.push(index);
        node = node.parent;
      }
      const nodeIndex = nodePath[0];
      const binding = resolveFacilityModelBinding(model, nodePath);
      const bindingUnavailable =
        binding.unavailable ||
        (binding.facilityId !== null &&
          !Object.hasOwn(this.facilityFloorIds(), binding.facilityId));
      if (nodeIndex != null)
        mesh.userData = {
          kind: 'imported-node',
          nodeIndex,
          nodePath,
          facilityModelNodeIndex: nodeIndex,
          facilityId: bindingUnavailable ? null : binding.facilityId,
          bindingUnavailable,
        };
    });
    const group = new THREE.Group();
    group.add(clone);
    group.scale.setScalar(model.transform.scale);
    group.rotation.y = (model.transform.rotationDegrees * Math.PI) / 180;
    group.position.set(
      model.transform.translation.x,
      model.transform.translation.y,
      model.transform.translation.z,
    );
    return group;
  }
  /**
   * Method updateEquipmentMarkers
   *
   * @description
   * Projects valid equipment placements and removes anchors occluded by another visible floor.
   *
   * @access private
   * @since unreleased
   *
   * @returns {void}
   */
  private updateEquipmentMarkers(): void {
    const THREE = this.threeModule;
    const camera = this.camera;
    const container = this.containerRef()?.nativeElement;
    if (!THREE || !camera || !container || !this.buildingGroup) return;
    this.buildingGroup.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const markers: ScreenEquipmentMarker[] = [];
    for (const floor of this.model().floors) {
      const entry = this.floorGroups.get(floor.facilityId);
      if (!entry?.group.visible || !floor.plan) continue;
      const aspect =
        floor.plan.imageWidth && floor.plan.imageHeight
          ? floor.plan.imageWidth / floor.plan.imageHeight
          : 1;
      for (const equipment of floor.equipment ?? []) {
        const position = equipment.position;
        if (
          !position ||
          equipment.placementIssue != null ||
          position.attachmentId !== floor.plan.attachmentId ||
          !Number.isFinite(position.x) ||
          !Number.isFinite(position.y) ||
          position.x < 0 ||
          position.x > 1 ||
          position.y < 0 ||
          position.y > 1
        )
          continue;
        const anchor = entry.group.localToWorld(
          new THREE.Vector3(
            position.x * aspect,
            (this.metric() || this.importedModelAsset() ? (floor.heightMeters ?? 0.8) : 0.8) + 0.08,
            1 - position.y,
          ),
        );
        const screen = anchor.clone().project(camera);
        if (screen.z < -1 || screen.z > 1 || Math.abs(screen.x) > 1 || Math.abs(screen.y) > 1)
          continue;
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(screen.x, screen.y), camera);
        const hit = ray
          .intersectObjects(
            this.buildingGroup.children.filter((object) => object.visible),
            true,
          )
          .find(
            (intersection) =>
              (intersection.object as Mesh).isMesh &&
              this.isVisibleSceneObject(intersection.object),
          );
        if (hit && hit.distance < camera.position.distanceTo(anchor) - 0.02) continue;
        const label =
          EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === equipment.type)?.label ??
          $localize`:@@facility.building3d.equipment:Equipment`;
        const icons: Readonly<Record<string, string>> = {
          fire_extinguisher: 'lucideFireExtinguisher',
          smoke_detector: 'lucideAlarmSmoke',
          heat_detector: 'lucideThermometer',
          sprinkler: 'lucideDroplets',
          fire_alarm_panel: 'lucidePanelTop',
          hydrant: 'lucideWaves',
          fire_door: 'lucideDoorClosed',
          emergency_lighting: 'lucideLightbulb',
          access_control: 'lucideLockKeyhole',
          camera: 'lucideCamera',
          gas_detector: 'lucideWind',
          other: 'lucidePackage',
        };
        markers.push({
          equipmentId: equipment.equipmentId,
          status: resolveEquipmentStatusTag('status', equipment.status).label,
          label: equipment.serialNumber ? `${label} · ${equipment.serialNumber}` : label,
          icon: icons[equipment.type] ?? 'lucidePackage',
          x: ((screen.x + 1) / 2) * container.clientWidth,
          y: ((1 - screen.y) / 2) * container.clientHeight,
        });
      }
    }
    const current = this.equipmentMarkers();
    if (
      current.length !== markers.length ||
      markers.some((marker, index) => {
        const previous = current[index];
        return (
          previous.equipmentId !== marker.equipmentId ||
          previous.label !== marker.label ||
          previous.status !== marker.status ||
          previous.x !== marker.x ||
          previous.y !== marker.y
        );
      })
    )
      this.equipmentMarkers.set(markers);
  }
  //#endregion
  //#endregion
}
