import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { FacilityPlanOverlayOutput } from '@features/organization/features/facilities/models';
import type { FacilityPlanEditMode } from '@features/organization/features/facilities/state';
import { FacilityPlanOverlay } from '../facility-plan-overlay';
import { isTapGesture, screenPointToNormalized } from './utils';

/**
 * Constant TAP_THRESHOLD_PX
 *
 * @description
 * The maximum pointer travel, in screen pixels, still counted as a tap rather than a drag pan.
 */
const TAP_THRESHOLD_PX = 6;

/**
 * Constant MIN_CLOSABLE_POLYGON_VERTICES
 *
 * @description
 * The minimum vertex count `dblclick` may close a polygon at.
 */
const MIN_CLOSABLE_POLYGON_VERTICES = 3;

/**
 * Component FacilityPlanEditor
 * @class FacilityPlanEditor
 *
 * @description
 * Wraps the read-only {@link FacilityPlanOverlay} with the Plans tab's
 * pointer-editing affordances: drawing a new zone outline vertex by vertex,
 * placing an unplaced equipment pin, and dragging an already-placed pin to
 * move it. Rendered inside `app-plan-viewer`'s transformed stage, exactly
 * like the overlay it wraps, so every layer inherits pan/zoom through the
 * DOM.
 * A single image-sized `#stage` element (`data-testid="facility-plan-editor-stage"`)
 * doubles as the vertex/pin tap surface (`pointer-events` toggled by
 * `editMode`) and as the geometry reference every normalized-coordinate
 * conversion reads (`getBoundingClientRect`, already reflecting the current
 * zoom since it renders inside the transformed stage). A tap is
 * distinguished from the plan viewer's own drag-pan by travel distance
 * (`isTapGesture`) rather than by suppressing the viewer's `pointerdown`: a
 * stationary click produces a zero-delta pan the viewer already no-ops, so
 * both coexist without the viewer losing the ability to drag-pan while a
 * mode is active. The completing `pointerup` is listened on `document`
 * rather than on `#stage` itself: the plan viewer's own `pointerdown`
 * handler calls `setPointerCapture` on its viewport (so *it* can keep
 * tracking a drag that leaves the element under the cursor), and per the
 * Pointer Events spec every subsequent event for that pointer — including
 * `pointerup` — is retargeted to the capturing element instead of bubbling
 * from wherever the pointer actually is; a listener bound to `#stage` would
 * simply never see it. `clientX`/`clientY` stay correct regardless of the
 * retarget, so reading them from a `document`-level listener sidesteps the
 * whole issue.
 * Drag-to-move renders one transparent handle per existing equipment pin,
 * matching the read overlay's own pin position/counter-scale math. The
 * handle is a pure pointer affordance, deliberately excluded from the
 * accessibility tree (`aria-hidden`, `tabindex="-1"`): the read overlay's
 * pin button already owns the tab stop at the same spot, and the keyboard
 * path for moving a pin is the equipment list's "Edit position" button on
 * the page, which opens the numeric position dialog. Its
 * `pointerdown` calls `stopPropagation` (unlike the stage's) so the plan
 * viewer never also starts panning underneath a pin drag — a pin's own
 * gesture is not gated by `editMode`, so there is no mode-driven reason to
 * still allow a simultaneous pan the way `#stage` does. `pointermove`/
 * `pointerup` are, for the same capture-retargeting reason as `#stage`,
 * listened on `document`, guarded on a locally-tracked `draggingEquipmentId`
 * rather than the event's own target. While a drag is in progress a
 * translucent indicator follows the pointer, and the static pin (still
 * rendered by {@link FacilityPlanOverlay}) re-syncs once the store's overlay
 * reload lands after a successful drop.
 * Presentational: inputs and outputs only, no store or service —
 * `ARCHITECTURE.md` §10.3. The page owns every write and the draft state
 * (`editMode`, `draftPoints`) that drives what this component renders.
 *
 * @since 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-plan-editor',
  imports: [FacilityPlanOverlay],
  templateUrl: './facility-plan-editor.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityPlanEditor {
  //#region Inputs
  /**
   * Property overlay
   * @readonly
   *
   * @description
   * The floor plan's overlay data; null while unloaded.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityPlanOverlayOutput | null>}
   */
  public readonly overlay: InputSignal<FacilityPlanOverlayOutput | null> =
    input<FacilityPlanOverlayOutput | null>(null);

  /**
   * Property scale
   * @readonly
   *
   * @description
   * The plan viewer's current zoom scale.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly scale: InputSignal<number> = input<number>(1);

  /**
   * Property showZones
   * @readonly
   *
   * @description
   * Whether the zone-polygon layer renders.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showZones: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property showEquipment
   * @readonly
   *
   * @description
   * Whether the equipment-pin layer renders.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showEquipment: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property selectedZoneId
   * @readonly
   *
   * @description
   * The currently selected zone's facility id, or `null` — forwarded verbatim to the wrapped read
   * overlay.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly selectedZoneId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property selectedEquipmentId
   * @readonly
   *
   * @description
   * The currently selected equipment pin's id, or `null` — forwarded verbatim to the wrapped read
   * overlay.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly selectedEquipmentId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property editMode
   * @readonly
   *
   * @description
   * The tab's current pointer-editing mode.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityPlanEditMode>}
   */
  public readonly editMode: InputSignal<FacilityPlanEditMode> = input<FacilityPlanEditMode>('none');

  /**
   * Property draftPoints
   * @readonly
   *
   * @description
   * The in-progress `draw-zone` outline's vertices, in normalized `[0, 1]` image coordinates.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ReadonlyArray<readonly [number, number]>>}
   */
  public readonly draftPoints: InputSignal<ReadonlyArray<readonly [number, number]>> = input<
    ReadonlyArray<readonly [number, number]>
  >([]);

  /**
   * Property canEditEquipment
   * @readonly
   *
   * @description
   * Whether an existing equipment pin may be dragged to move it.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canEditEquipment: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property zoneActivated
   * @readonly
   *
   * @description
   * Forwarded from the wrapped read overlay.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly zoneActivated: OutputEmitterRef<string> = output<string>();

  /**
   * Property equipmentActivated
   * @readonly
   *
   * @description
   * Forwarded from the wrapped read overlay.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly equipmentActivated: OutputEmitterRef<string> = output<string>();

  /**
   * Property vertexAdded
   * @readonly
   *
   * @description
   * A tap in `draw-zone` mode added this vertex.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<readonly [number, number]>}
   */
  public readonly vertexAdded: OutputEmitterRef<readonly [number, number]> =
    output<readonly [number, number]>();

  /**
   * Property polygonCloseRequested
   * @readonly
   *
   * @description
   * A double-click requested closing the in-progress outline.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly polygonCloseRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property pinPlaced
   * @readonly
   *
   * @description
   * A tap in `place-pin` mode placed the pin here.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<readonly [number, number]>}
   */
  public readonly pinPlaced: OutputEmitterRef<readonly [number, number]> =
    output<readonly [number, number]>();

  /**
   * Property pinMoved
   * @readonly
   *
   * @description
   * An existing pin was dragged and dropped at this position.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<{
   *   readonly equipmentId: string;
   *   readonly point: readonly [number, number];
   * }>}
   */
  public readonly pinMoved: OutputEmitterRef<{
    readonly equipmentId: string;
    readonly point: readonly [number, number];
  }> = output<{ readonly equipmentId: string; readonly point: readonly [number, number] }>();
  //#endregion

  //#region Properties
  /**
   * Property stageRef
   * @readonly
   *
   * @description
   * The image-sized reference element every coordinate conversion reads.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ElementRef<HTMLDivElement> | undefined>}
   */
  private readonly stageRef: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild<ElementRef<HTMLDivElement>>('stage');

  /**
   * Property stageDownPoint
   *
   * @description
   * Where the current pointer sequence on `#stage` went down, for tap-vs-drag disambiguation.
   *
   * @access private
   * @since unreleased
   *
   * @type {{ readonly x: number; readonly y: number } | null}
   */
  private stageDownPoint: { readonly x: number; readonly y: number } | null = null;

  /**
   * Property draggingEquipmentId
   *
   * @description
   * The equipment id whose pin handle is currently down, while a drag may be starting.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null}
   */
  private draggingEquipmentId: string | null = null;

  /**
   * Property dragPreview
   * @readonly
   *
   * @description
   * The pixel position a pin drag currently previews, or `null` when no drag is in progress.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<{
   *   readonly equipmentId: string;
   *   readonly x: number;
   *   readonly y: number;
   * } | null>}
   */
  protected readonly dragPreview: WritableSignal<{
    readonly equipmentId: string;
    readonly x: number;
    readonly y: number;
  } | null> = signal(null);

  /**
   * Property captureActive
   * @readonly
   *
   * @description
   * Whether the `#stage` capture surface should intercept pointer events.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly captureActive: Signal<boolean> = computed<boolean>(
    () => this.editMode() !== 'none',
  );

  /**
   * Property draftPixelPoints
   * @readonly
   *
   * @description
   * The draft outline's vertices in image-pixel coordinates, for the in-progress polyline.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ReadonlyArray<{ readonly x: number; readonly y: number }>>}
   */
  protected readonly draftPixelPoints: Signal<
    ReadonlyArray<{ readonly x: number; readonly y: number }>
  > = computed(() => {
    const data: FacilityPlanOverlayOutput | null = this.overlay();
    if (!data) return [];

    return this.draftPoints().map(([x, y]) => ({
      x: x * data.imageWidth,
      y: y * data.imageHeight,
    }));
  });

  /**
   * Property draftPolylineAttr
   * @readonly
   *
   * @description
   * The draft outline's vertices as an SVG `points` attribute.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly draftPolylineAttr: Signal<string> = computed<string>(() =>
    this.draftPixelPoints()
      .map((point) => `${point.x},${point.y}`)
      .join(' '),
  );

  /**
   * Property draggablePins
   * @readonly
   *
   * @description
   * Existing equipment pins, positioned for the drag-handle layer, counter-scaled like the read
   * overlay's pins.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<
   *   ReadonlyArray<{ readonly equipmentId: string; readonly x: number; readonly y: number }>
   * >}
   */
  protected readonly draggablePins: Signal<
    ReadonlyArray<{
      readonly equipmentId: string;
      readonly x: number;
      readonly y: number;
    }>
  > = computed(() => {
    const data: FacilityPlanOverlayOutput | null = this.overlay();
    if (!data) return [];

    return data.equipment.map((pin) => ({
      equipmentId: pin.equipmentId,
      x: pin.x * data.imageWidth,
      y: pin.y * data.imageHeight,
    }));
  });

  /**
   * Property pinScale
   * @readonly
   *
   * @description
   * The inverse of `scale`, keeping drag handles and the drag preview a constant on-screen size.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly pinScale: Signal<number> = computed<number>(() => {
    const scale: number = this.scale();

    return scale > 0 ? 1 / scale : 1;
  });
  //#endregion

  //#region Methods
  /**
   * Method onStagePointerDown
   * @method onStagePointerDown
   *
   * @description
   * Records where a pointer sequence on `#stage` started, for tap-vs-drag disambiguation.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {PointerEvent} event - The pointer-down event.
   *
   * @returns {void}
   */
  protected onStagePointerDown(event: PointerEvent): void {
    if (this.editMode() === 'none') return;

    this.stageDownPoint = { x: event.clientX, y: event.clientY };
  }

  /**
   * Method onDocumentPointerUp
   * @method onDocumentPointerUp
   *
   * @description
   * Completes whichever gesture is in progress — a `#stage` tap or a pin
   * drag — read from locally-tracked state rather than the event's own
   * target, since a captured pointer's `pointerup` targets the capturing
   * element, not wherever the pointer actually is (see the class
   * `@description`). A `#stage` tap adds a vertex (`draw-zone`) or places
   * the pin (`place-pin`) when the sequence stayed within the tap threshold
   * of where it went down; a pin-handle sequence with no intervening
   * `pointermove` (`dragPreview` still `null`) is reinterpreted as
   * `equipmentActivated` instead of `pinMoved`.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {PointerEvent} event - The pointer-up event.
   *
   * @returns {void}
   */
  @HostListener('document:pointerup', ['$event'])
  protected onDocumentPointerUp(event: PointerEvent): void {
    const draggingEquipmentId = this.draggingEquipmentId;
    if (draggingEquipmentId) {
      this.draggingEquipmentId = null;
      const preview = this.dragPreview();
      this.dragPreview.set(null);

      if (!preview) {
        this.equipmentActivated.emit(draggingEquipmentId);

        return;
      }

      const rect: DOMRect | undefined = this.stageRef()?.nativeElement.getBoundingClientRect();
      if (!rect) return;

      this.pinMoved.emit({
        equipmentId: draggingEquipmentId,
        point: screenPointToNormalized({ x: event.clientX, y: event.clientY }, rect),
      });

      return;
    }

    const down = this.stageDownPoint;
    this.stageDownPoint = null;
    if (!down || this.editMode() === 'none') return;
    if (!isTapGesture(down, { x: event.clientX, y: event.clientY }, TAP_THRESHOLD_PX)) return;

    const rect: DOMRect | undefined = this.stageRef()?.nativeElement.getBoundingClientRect();
    if (!rect) return;

    const point = screenPointToNormalized({ x: event.clientX, y: event.clientY }, rect);
    if (this.editMode() === 'draw-zone' || this.editMode() === 'calibrate') {
      this.vertexAdded.emit(point);
    } else if (this.editMode() === 'place-pin') {
      this.pinPlaced.emit(point);
    }
  }

  /**
   * Method onStageDoubleClick
   * @method onStageDoubleClick
   *
   * @description
   * In `draw-zone` mode with at least three vertices, requests closing the outline.
   *
   * @access protected
   * @since 1.4.0
   *
   * @returns {void}
   */
  protected onStageDoubleClick(): void {
    if (this.editMode() !== 'draw-zone') return;
    if (this.draftPoints().length < MIN_CLOSABLE_POLYGON_VERTICES) return;

    this.polygonCloseRequested.emit();
  }

  /**
   * Method onPinHandlePointerDown
   * @method onPinHandlePointerDown
   *
   * @description
   * Starts tracking a possible pin drag. Stops the event from bubbling to
   * the plan viewer's own `pointerdown` handler, so a pin drag never also
   * pans the view underneath it — see the class `@description`.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {PointerEvent} event - The pointer-down event.
   * @param {string} equipmentId - The pin's equipment id.
   *
   * @returns {void}
   */
  protected onPinHandlePointerDown(event: PointerEvent, equipmentId: string): void {
    event.stopPropagation();
    this.draggingEquipmentId = equipmentId;
  }

  /**
   * Method onDocumentPointerMove
   * @method onDocumentPointerMove
   *
   * @description
   * Updates the drag preview position while a pin drag is in progress.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {PointerEvent} event - The pointer-move event.
   *
   * @returns {void}
   */
  @HostListener('document:pointermove', ['$event'])
  protected onDocumentPointerMove(event: PointerEvent): void {
    const equipmentId = this.draggingEquipmentId;
    if (!equipmentId) return;

    const rect: DOMRect | undefined = this.stageRef()?.nativeElement.getBoundingClientRect();
    const data: FacilityPlanOverlayOutput | null = this.overlay();
    if (!rect || !data) return;

    const [x, y] = screenPointToNormalized({ x: event.clientX, y: event.clientY }, rect);
    this.dragPreview.set({ equipmentId, x: x * data.imageWidth, y: y * data.imageHeight });
  }

  /**
   * Method onDocumentPointerCancel
   * @method onDocumentPointerCancel
   *
   * @description
   * Cancels an in-progress pin drag without emitting, e.g. when the browser interrupts the gesture.
   *
   * @access protected
   * @since 1.4.0
   *
   * @returns {void}
   */
  @HostListener('document:pointercancel')
  protected onDocumentPointerCancel(): void {
    this.draggingEquipmentId = null;
    this.dragPreview.set(null);
  }
  //#endregion
}
