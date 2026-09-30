import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRotateCcw, lucideZoomIn, lucideZoomOut } from '@ng-icons/lucide';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type {
  PlanPoint,
  PlanTransform,
  PlanViewportSize,
} from '../../../models/plan-transform.interface';
import type { PlanViewerOverlayContext } from '../../../models/plan-viewer-overlay-context.interface';
import {
  clampPlanPan,
  clampPlanZoom,
  planPointerDistance,
  planPointerMidpoint,
  zoomPlanAtPoint,
} from '../../../utils/plan-transform/plan-transform.utils';

/**
 * Type PlanViewerStatus
 *
 * @description
 * Whether the plan image is still loading, ready, or failed to load.
 *
 * @type {PlanViewerStatus}
 */
type PlanViewerStatus = 'loading' | 'loaded' | 'error';

/**
 * Constant WHEEL_ZOOM_FACTOR
 *
 * @description
 * The multiplicative factor a wheel notch applies.
 */
const WHEEL_ZOOM_FACTOR = 1.1;

/**
 * Constant BUTTON_ZOOM_FACTOR
 *
 * @description
 * The multiplicative factor the zoom in/out buttons and +/- keys apply.
 */
const BUTTON_ZOOM_FACTOR = 1.25;

/**
 * Constant KEYBOARD_PAN_STEP_PX
 *
 * @description
 * How many pixels an arrow-key press pans by.
 */
const KEYBOARD_PAN_STEP_PX = 48;

/**
 * Constant MIN_VISIBLE_PX
 *
 * @description
 * The minimum sliver of the plan, in pixels, that panning must always leave visible.
 */
const MIN_VISIBLE_PX = 48;

/**
 * Interface PlanPointerOrigin
 * @interface PlanPointerOrigin
 *
 * @description
 * The state shared by pointer-driven interactions in progress.
 */
interface PlanPointerOrigin {
  /**
   * Property pointer
   * @readonly
   *
   * @description
   * Pointer position at the start of the drag gesture.
   *
   * @access public
   * @since unreleased
   *
   * @type {PlanPoint}
   */
  readonly pointer: PlanPoint;

  /**
   * Property transform
   * @readonly
   *
   * @description
   * Plan pan and zoom state captured before the drag begins.
   *
   * @access public
   * @since unreleased
   *
   * @type {PlanTransform}
   */
  readonly transform: PlanTransform;
}

/**
 * Interface PlanPinchOrigin
 * @interface PlanPinchOrigin
 *
 * @description
 * The state shared by a two-pointer pinch in progress.
 */
interface PlanPinchOrigin {
  /**
   * Property distance
   * @readonly
   *
   * @description
   * Initial separation between the two active pointers in viewport pixels.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly distance: number;

  /**
   * Property midpoint
   * @readonly
   *
   * @description
   * Initial center point between the two pointers in viewport coordinates.
   *
   * @access public
   * @since unreleased
   *
   * @type {PlanPoint}
   */
  readonly midpoint: PlanPoint;

  /**
   * Property transform
   * @readonly
   *
   * @description
   * Pan and zoom state captured before the pinch gesture begins.
   *
   * @access public
   * @since unreleased
   *
   * @type {PlanTransform}
   */
  readonly transform: PlanTransform;
}

/**
 * Component PlanViewer
 * @class PlanViewer
 *
 * @description
 * A domain-agnostic pan/zoom viewer for a single raster image — the floor
 * plan's rendering primitive, generic by design (`ARCHITECTURE.md` §6.4): it
 * knows nothing about zones or equipment, only an image and a transform.
 * Hand-rolled deliberately (no CDK zoom/pan primitive covers pinch + wheel +
 * keyboard + bounded pan in one package, and this is ~300 lines of well-tested
 * pure math, not a second dependency decision).
 *
 * The image is shown at its natural pixel size and moved with a single CSS
 * `translate(x, y) scale(scale)` on an inner stage; all of the arithmetic —
 * zoom-at-point, pinch, pan clamping — lives in pure functions under
 * `utils/plan-transform/` so the invariants (cursor-anchored zoom, content
 * never lost off-screen) are unit-tested independently of the DOM. The
 * component only reads pointer/viewport geometry and calls them.
 *
 * A caller projects an overlay through `overlayTemplate` — an `ng-template`
 * rendered *inside* the transformed stage, so it inherits pan and zoom
 * through the DOM automatically. Its context is `{ scale }` (see
 * {@link PlanViewerOverlayContext}), the minimum a future zone-polygon or
 * equipment-pin layer (Phase 4) needs to counter-scale itself. The stage sits
 * in an unclipped inner frame inset 4px from the clipping viewport, so an
 * overlay item's focus ring still paints at the plan's edges instead of being
 * cut by `overflow-hidden`; all fit/pan/pointer geometry is measured against
 * that frame to keep the gutter out of the math.
 *
 * SSR-safe: before the image loads, the stage carries no inline size or
 * transform, so it renders as a plain `object-contain` `<img>` — no
 * `window`/`document` access happens before that first `load` event, which
 * only ever fires in the browser.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```html
 * <app-plan-viewer
 *   [src]="plan().imageUrl"
 *   alt="Ground floor plan"
 *   [overlayTemplate]="pins"
 * />
 * <ng-template #pins let-scale="scale">
 *   <!-- equipment pins, positioned in image coordinates -->
 * </ng-template>
 * ```
 */
@Component({
  selector: 'app-plan-viewer',
  imports: [NgIcon, NgTemplateOutlet, HlmButton, HlmSkeleton],
  providers: [provideIcons({ lucideRotateCcw, lucideZoomIn, lucideZoomOut })],
  templateUrl: './plan-viewer.component.html',
  host: { class: 'block h-full min-h-0 w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanViewer {
  //#region Inputs
  /**
   * Property src
   * @readonly
   *
   * @description
   * The plan image's URL.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly src: InputSignal<string> = input.required<string>();

  /**
   * Property alt
   * @readonly
   *
   * @description
   * The accessible description of what the plan shows; also the stage's `aria-label`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly alt: InputSignal<string> = input.required<string>();

  /**
   * Property naturalWidth
   * @readonly
   *
   * @description
   * The image's pixel width, when the caller already knows it; else read from the loaded image.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number | null>}
   */
  public readonly naturalWidth: InputSignal<number | null> = input<number | null>(null);

  /**
   * Property naturalHeight
   * @readonly
   *
   * @description
   * The image's pixel height, when the caller already knows it; else read from the loaded image.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number | null>}
   */
  public readonly naturalHeight: InputSignal<number | null> = input<number | null>(null);

  /**
   * Property minZoom
   * @readonly
   *
   * @description
   * The lowest allowed scale.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly minZoom: InputSignal<number> = input<number>(0.5);

  /**
   * Property maxZoom
   * @readonly
   *
   * @description
   * The highest allowed scale.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly maxZoom: InputSignal<number> = input<number>(8);

  /**
   * Property overlayTemplate
   * @readonly
   *
   * @description
   * Optional content rendered inside the transformed stage; see the class doc.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<TemplateRef<PlanViewerOverlayContext> | null>}
   */
  public readonly overlayTemplate: InputSignal<TemplateRef<PlanViewerOverlayContext> | null> =
    input<TemplateRef<PlanViewerOverlayContext> | null>(null);
  //#endregion

  //#region Properties
  /**
   * Property viewportRef
   * @readonly
   *
   * @description
   * The focusable interactive surface pointer, wheel and keyboard events attach to.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ElementRef<HTMLDivElement> | undefined>}
   */
  private readonly viewportRef: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild<ElementRef<HTMLDivElement>>('viewport');

  /**
   * Property frameRef
   * @readonly
   *
   * @description
   * The unclipped inner frame all fit, pan and pointer geometry is measured against.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ElementRef<HTMLDivElement> | undefined>}
   */
  private readonly frameRef: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild<ElementRef<HTMLDivElement>>('frame');

  /**
   * Property activePointers
   * @readonly
   *
   * @description
   * Pointers currently down on the stage, keyed by `pointerId`.
   *
   * @access private
   * @since unreleased
   *
   * @type {Map<number, PlanPoint>}
   */
  private readonly activePointers = new Map<number, PlanPoint>();

  /**
   * Property dragOrigin
   *
   * @description
   * The single-pointer drag in progress, if any.
   *
   * @access private
   * @since unreleased
   *
   * @type {PlanPointerOrigin | null}
   */
  private dragOrigin: PlanPointerOrigin | null = null;

  /**
   * Property pinchOrigin
   *
   * @description
   * The two-pointer pinch in progress, if any.
   *
   * @access private
   * @since unreleased
   *
   * @type {PlanPinchOrigin | null}
   */
  private pinchOrigin: PlanPinchOrigin | null = null;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Loading / loaded / error.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<PlanViewerStatus>}
   */
  protected readonly status: WritableSignal<PlanViewerStatus> = signal<PlanViewerStatus>('loading');

  /**
   * Property contentSize
   * @readonly
   *
   * @description
   * The image's natural pixel size, resolved once loaded.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<PlanViewportSize | null>}
   */
  protected readonly contentSize: WritableSignal<PlanViewportSize | null> =
    signal<PlanViewportSize | null>(null);

  /**
   * Property transform
   * @readonly
   *
   * @description
   * The current pan/zoom transform.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<PlanTransform>}
   */
  protected readonly transform: WritableSignal<PlanTransform> = signal<PlanTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });

  /**
   * Property fitScale
   *
   * @description
   * The scale that fits the whole plan in the viewport, restored by {@link resetView}.
   *
   * @access private
   * @since unreleased
   *
   * @type {number}
   */
  private fitScale = 1;

  /**
   * Property hasUserTransform
   *
   * @description
   * Whether the user has panned or zoomed since the last fit.
   * It gates {@link refitToViewport}: a container that changes size re-fits
   * only while the view is still the one the component chose. Re-fitting under
   * someone who had zoomed in on a corner would throw their work away — and
   * the container does change size in ordinary use, when the detail panel
   * beside the plan opens or closes.
   *
   * @access private
   * @since unreleased
   *
   * @type {boolean}
   */
  private hasUserTransform = false;

  /**
   * Property stageTransform
   * @readonly
   *
   * @description
   * The stage's CSS transform, or `null` before the image has loaded.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string | null>}
   */
  protected readonly stageTransform: Signal<string | null> = computed<string | null>(() => {
    if (this.status() !== 'loaded') return null;
    const t: PlanTransform = this.transform();

    return `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
  });

  /**
   * Property overlayContext
   * @readonly
   *
   * @description
   * The context handed to the projected overlay template.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<PlanViewerOverlayContext>}
   */
  protected readonly overlayContext: Signal<PlanViewerOverlayContext> =
    computed<PlanViewerOverlayContext>(() => ({ scale: this.transform().scale }));
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Watches the inner frame's size and re-fits the plan when it changes.
   * Browser-only by construction — `afterNextRender` never runs on the server,
   * and `ResizeObserver` does not exist there. Without this the fit computed
   * on image load survives every later layout change, which is how the plan
   * ended up rendered larger than the column holding it.
   *
   * @access public
   * @since 1.13.0
   */
  public constructor() {
    const destroyRef: DestroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const frame: HTMLDivElement | undefined = this.frameRef()?.nativeElement;
      if (!frame || typeof ResizeObserver !== 'function') return;

      const observer = new ResizeObserver(() => this.refitToViewport());
      observer.observe(frame);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onImageLoad
   * @method onImageLoad
   *
   * @description
   * Resolves the plan's natural size (input override or the loaded image),
   * computes the scale that fits it in the current viewport, and switches
   * the stage from its plain SSR rendering into the interactive one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The `<img>` element's `load` event.
   *
   * @returns {void}
   */
  protected onImageLoad(event: Event): void {
    const image: HTMLImageElement = event.target as HTMLImageElement;
    const content: PlanViewportSize = {
      width: this.naturalWidth() ?? image.naturalWidth,
      height: this.naturalHeight() ?? image.naturalHeight,
    };
    this.contentSize.set(content);

    this.fitScale = this.computeFitScale(content);
    this.hasUserTransform = false;
    this.transform.set({ x: 0, y: 0, scale: this.fitScale });
    this.status.set('loaded');
  }

  /**
   * Method onImageError
   * @method onImageError
   *
   * @description
   * Switches the viewer to its error state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onImageError(): void {
    this.status.set('error');
  }

  /**
   * Method onWheel
   * @method onWheel
   *
   * @description
   * Zooms around the cursor position — but only once the stage holds focus,
   * so a wheel over an unengaged viewer keeps scrolling the page instead of
   * being hijacked into zoom. The stage is focusable (`tabindex="0"`) and a
   * click on it focuses it, so mouse users opt in with a single click; until
   * then the event is left alone (no `preventDefault`).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {WheelEvent} event - The wheel event.
   *
   * @returns {void}
   */
  protected onWheel(event: WheelEvent): void {
    if (this.status() !== 'loaded') return;
    if (document.activeElement !== this.viewportRef()?.nativeElement) return;
    event.preventDefault();

    const pointer: PlanPoint = this.pointerFromEvent(event);
    const factor: number = event.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
    this.zoomAround(pointer, factor);
  }

  /**
   * Method onPointerDown
   * @method onPointerDown
   *
   * @description
   * Starts a drag pan (one pointer) or a pinch zoom (two pointers).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {PointerEvent} event - The pointer-down event.
   *
   * @returns {void}
   */
  protected onPointerDown(event: PointerEvent): void {
    if (this.status() !== 'loaded') return;

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const point: PlanPoint = this.pointerFromEvent(event);
    this.activePointers.set(event.pointerId, point);

    if (this.activePointers.size === 1) {
      this.dragOrigin = { pointer: point, transform: this.transform() };
      this.pinchOrigin = null;
    } else if (this.activePointers.size === 2) {
      const [first, second]: PlanPoint[] = [...this.activePointers.values()];
      this.pinchOrigin = {
        distance: planPointerDistance(first, second),
        midpoint: planPointerMidpoint(first, second),
        transform: this.transform(),
      };
      this.dragOrigin = null;
    }
  }

  /**
   * Method onPointerMove
   * @method onPointerMove
   *
   * @description
   * Advances the active drag pan or pinch zoom, if any.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {PointerEvent} event - The pointer-move event.
   *
   * @returns {void}
   */
  protected onPointerMove(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) return;
    const point: PlanPoint = this.pointerFromEvent(event);
    this.activePointers.set(event.pointerId, point);

    if (this.dragOrigin && this.activePointers.size === 1) {
      const origin: PlanPointerOrigin = this.dragOrigin;
      const next: PlanTransform = {
        ...origin.transform,
        x: origin.transform.x + (point.x - origin.pointer.x),
        y: origin.transform.y + (point.y - origin.pointer.y),
      };
      this.applyTransform(next);
    } else if (this.pinchOrigin && this.activePointers.size === 2) {
      const origin: PlanPinchOrigin = this.pinchOrigin;
      const [first, second]: PlanPoint[] = [...this.activePointers.values()];
      const factor: number = planPointerDistance(first, second) / origin.distance;
      this.applyTransform(
        zoomPlanAtPoint(
          origin.transform,
          origin.midpoint,
          this.currentViewportSize(),
          factor,
          this.effectiveMinZoom(),
          this.maxZoom(),
        ),
      );
    }
  }

  /**
   * Method onPointerUp
   * @method onPointerUp
   *
   * @description
   * Ends a drag or pinch when a pointer is released, cancelled, or leaves the stage.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {PointerEvent} event - The ending pointer event.
   *
   * @returns {void}
   */
  protected onPointerUp(event: PointerEvent): void {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) this.pinchOrigin = null;
    if (this.activePointers.size < 1) this.dragOrigin = null;
  }

  /**
   * Method onKeydown
   * @method onKeydown
   *
   * @description
   * The keyboard enhancement over the always-present buttons: `+`/`-` zoom,
   * `0` resets, and the arrow keys pan — all centered on / anchored to the
   * viewport rather than any pointer position.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - The key event.
   *
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.status() !== 'loaded') return;

    switch (event.key) {
      case '+':
      case '=':
        event.preventDefault();
        this.zoomIn();
        break;
      case '-':
      case '_':
        event.preventDefault();
        this.zoomOut();
        break;
      case '0':
        event.preventDefault();
        this.resetView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.panBy(0, -KEYBOARD_PAN_STEP_PX);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.panBy(0, KEYBOARD_PAN_STEP_PX);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.panBy(-KEYBOARD_PAN_STEP_PX, 0);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.panBy(KEYBOARD_PAN_STEP_PX, 0);
        break;
    }
  }

  /**
   * Method zoomIn
   * @method zoomIn
   *
   * @description
   * Zooms in one step, anchored on the viewport's center.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected zoomIn(): void {
    this.zoomAround(this.viewportCenter(), BUTTON_ZOOM_FACTOR);
  }

  /**
   * Method zoomOut
   * @method zoomOut
   *
   * @description
   * Zooms out one step, anchored on the viewport's center.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected zoomOut(): void {
    this.zoomAround(this.viewportCenter(), 1 / BUTTON_ZOOM_FACTOR);
  }

  /**
   * Method resetView
   * @method resetView
   *
   * @description
   * Restores the transform that fits the whole plan in the viewport.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected resetView(): void {
    this.applyTransform({ x: 0, y: 0, scale: this.fitScale });
    this.hasUserTransform = false;
  }

  /**
   * Method zoomAround
   * @method zoomAround
   *
   * @description
   * Applies a zoom factor anchored on a viewport point, then re-clamps the pan.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {PlanPoint} pointer - The zoom's anchor, viewport-relative.
   * @param {number} factor - The multiplicative zoom change.
   *
   * @returns {void}
   */
  private zoomAround(pointer: PlanPoint, factor: number): void {
    this.applyTransform(
      zoomPlanAtPoint(
        this.transform(),
        pointer,
        this.currentViewportSize(),
        factor,
        this.effectiveMinZoom(),
        this.maxZoom(),
      ),
    );
  }

  /**
   * Method panBy
   * @method panBy
   *
   * @description
   * Translates the transform by a fixed pixel offset, then re-clamps the pan.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {number} dx - The horizontal offset in pixels.
   * @param {number} dy - The vertical offset in pixels.
   *
   * @returns {void}
   */
  private panBy(dx: number, dy: number): void {
    const current: PlanTransform = this.transform();
    this.applyTransform({ ...current, x: current.x + dx, y: current.y + dy });
  }

  /**
   * Method applyTransform
   * @method applyTransform
   *
   * @description
   * Confines a candidate transform's pan to the current content and viewport, and writes it.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {PlanTransform} next - The candidate transform.
   *
   * @returns {void}
   */
  private applyTransform(next: PlanTransform): void {
    const content: PlanViewportSize | null = this.contentSize();
    if (!content) return;

    this.hasUserTransform = true;
    this.transform.set(clampPlanPan(next, this.currentViewportSize(), content, MIN_VISIBLE_PX));
  }

  /**
   * Method computeFitScale
   * @method computeFitScale
   *
   * @description
   * The scale at which the whole plan fits the current viewport.
   * Capped by {@link maxZoom} but deliberately **not** floored by
   * {@link minZoom}: `minZoom` bounds how far a user may zoom *out*, while the
   * fit is by definition the point where the plan is fully visible. Flooring
   * it made a plan larger than its container — a 2400x1600 plan in a 601 px
   * column needs 0.25, below the 0.5 default — render at 0.5 and overflow,
   * with the overflowing part unreachable to both pointer and test.
   *
   * @access private
   * @since 1.13.0
   *
   * @param {PlanViewportSize} content - The plan's natural pixel size.
   *
   * @returns {number} The fitting scale, or `1` when either box is empty.
   */
  private computeFitScale(content: PlanViewportSize): number {
    const viewport: PlanViewportSize = this.currentViewportSize();
    if (content.width <= 0 || content.height <= 0) return 1;
    if (viewport.width <= 0 || viewport.height <= 0) return 1;

    const raw: number = Math.min(viewport.width / content.width, viewport.height / content.height);

    return clampPlanZoom(raw, Math.min(this.minZoom(), raw), this.maxZoom());
  }

  /**
   * Method effectiveMinZoom
   * @method effectiveMinZoom
   *
   * @description
   * The lowest scale a user may zoom out to — never above the fit, so the whole plan stays
   * reachable.
   *
   * @access private
   * @since 1.13.0
   *
   * @returns {number} The effective lower zoom bound.
   */
  private effectiveMinZoom(): number {
    return Math.min(this.minZoom(), this.fitScale);
  }

  /**
   * Method refitToViewport
   * @method refitToViewport
   *
   * @description
   * Recomputes the fit after the container changed size, and re-applies it unless the user has
   * since panned or zoomed.
   *
   * @access private
   * @since 1.13.0
   *
   * @returns {void}
   */
  private refitToViewport(): void {
    const content: PlanViewportSize | null = this.contentSize();
    if (!content || this.status() !== 'loaded') return;

    const next: number = this.computeFitScale(content);
    if (next === this.fitScale) return;

    this.fitScale = next;
    if (this.hasUserTransform) return;

    this.transform.set({ x: 0, y: 0, scale: next });
  }

  /**
   * Method pointerFromEvent
   * @method pointerFromEvent
   *
   * @description
   * A pointer or wheel event's position, relative to the inner frame's top-left.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {PointerEvent | WheelEvent} event - The source event.
   *
   * @returns {PlanPoint} The frame-relative position.
   */
  private pointerFromEvent(event: PointerEvent | WheelEvent): PlanPoint {
    const rect: DOMRect | undefined = this.frameRef()?.nativeElement.getBoundingClientRect();

    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  }

  /**
   * Method viewportCenter
   * @method viewportCenter
   *
   * @description
   * The viewport's center, in its own relative coordinates.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {PlanPoint} The center point.
   */
  private viewportCenter(): PlanPoint {
    const size: PlanViewportSize = this.currentViewportSize();

    return { x: size.width / 2, y: size.height / 2 };
  }

  /**
   * Method currentViewportSize
   * @method currentViewportSize
   *
   * @description
   * The inner frame's current size, read live rather than cached.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {PlanViewportSize} The frame's size.
   */
  private currentViewportSize(): PlanViewportSize {
    const rect: DOMRect | undefined = this.frameRef()?.nativeElement.getBoundingClientRect();

    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  }
  //#endregion
}
