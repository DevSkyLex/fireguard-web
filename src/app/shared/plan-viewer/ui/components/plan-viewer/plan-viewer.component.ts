import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
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
 * Whether the plan image is still loading, ready, or failed to load.
 */
type PlanViewerStatus = 'loading' | 'loaded' | 'error';

/**
 * The multiplicative factor a wheel notch applies.
 */
const WHEEL_ZOOM_FACTOR = 1.1;

/**
 * The multiplicative factor the zoom in/out buttons and +/- keys apply.
 */
const BUTTON_ZOOM_FACTOR = 1.25;

/**
 * How many pixels an arrow-key press pans by.
 */
const KEYBOARD_PAN_STEP_PX = 48;

/**
 * The minimum sliver of the plan, in pixels, that panning must always leave visible.
 */
const MIN_VISIBLE_PX = 48;

/**
 * The state shared by pointer-driven interactions in progress.
 */
interface PlanPointerOrigin {
  readonly pointer: PlanPoint;
  readonly transform: PlanTransform;
}

/**
 * The state shared by a two-pointer pinch in progress.
 */
interface PlanPinchOrigin {
  readonly distance: number;
  readonly midpoint: PlanPoint;
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
 * equipment-pin layer (Phase 4) needs to counter-scale itself.
 *
 * SSR-safe: before the image loads, the stage carries no inline size or
 * transform, so it renders as a plain `object-contain` `<img>` — no
 * `window`/`document` access happens before that first `load` event, which
 * only ever fires in the browser.
 *
 * @version 1.0.0
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
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
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
   * @description The plan image's URL.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly src: InputSignal<string> = input.required<string>();

  /**
   * Property alt
   * @readonly
   * @description The accessible description of what the plan shows; also the stage's `aria-label`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly alt: InputSignal<string> = input.required<string>();

  /**
   * Property naturalWidth
   * @readonly
   * @description The image's pixel width, when the caller already knows it; else read from the loaded image.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number | null>}
   */
  public readonly naturalWidth: InputSignal<number | null> = input<number | null>(null);

  /**
   * Property naturalHeight
   * @readonly
   * @description The image's pixel height, when the caller already knows it; else read from the loaded image.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number | null>}
   */
  public readonly naturalHeight: InputSignal<number | null> = input<number | null>(null);

  /**
   * Property minZoom
   * @readonly
   * @description The lowest allowed scale.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly minZoom: InputSignal<number> = input<number>(0.5);

  /**
   * Property maxZoom
   * @readonly
   * @description The highest allowed scale.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly maxZoom: InputSignal<number> = input<number>(8);

  /**
   * Property overlayTemplate
   * @readonly
   * @description Optional content rendered inside the transformed stage; see the class doc.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<TemplateRef<PlanViewerOverlayContext> | null>}
   */
  public readonly overlayTemplate: InputSignal<TemplateRef<PlanViewerOverlayContext> | null> =
    input<TemplateRef<PlanViewerOverlayContext> | null>(null);
  //#endregion

  //#region Properties
  /** The interactive surface pointer, wheel and keyboard events are read against. */
  private readonly viewportRef: Signal<ElementRef<HTMLDivElement> | undefined> =
    viewChild<ElementRef<HTMLDivElement>>('viewport');

  /** Pointers currently down on the stage, keyed by `pointerId`. */
  private readonly activePointers = new Map<number, PlanPoint>();

  /** The single-pointer drag in progress, if any. */
  private dragOrigin: PlanPointerOrigin | null = null;

  /** The two-pointer pinch in progress, if any. */
  private pinchOrigin: PlanPinchOrigin | null = null;

  /** Loading / loaded / error. */
  protected readonly status: WritableSignal<PlanViewerStatus> = signal<PlanViewerStatus>('loading');

  /** The image's natural pixel size, resolved once loaded. */
  protected readonly contentSize: WritableSignal<PlanViewportSize | null> =
    signal<PlanViewportSize | null>(null);

  /** The current pan/zoom transform. */
  protected readonly transform: WritableSignal<PlanTransform> = signal<PlanTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });

  /** The scale that fits the whole plan in the viewport, restored by {@link resetView}. */
  private fitScale = 1;

  /** The stage's CSS transform, or `null` before the image has loaded. */
  protected readonly stageTransform: Signal<string | null> = computed<string | null>(() => {
    if (this.status() !== 'loaded') return null;
    const t: PlanTransform = this.transform();

    return `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
  });

  /** The context handed to the projected overlay template. */
  protected readonly overlayContext: Signal<PlanViewerOverlayContext> =
    computed<PlanViewerOverlayContext>(() => ({ scale: this.transform().scale }));
  //#endregion

  //#region Methods
  /**
   * Method onImageLoad
   *
   * @description
   * Resolves the plan's natural size (input override or the loaded image),
   * computes the scale that fits it in the current viewport, and switches
   * the stage from its plain SSR rendering into the interactive one.
   *
   * @access protected
   * @since 1.0.0
   * @param {Event} event - The `<img>` element's `load` event.
   * @returns {void}
   */
  protected onImageLoad(event: Event): void {
    const image: HTMLImageElement = event.target as HTMLImageElement;
    const content: PlanViewportSize = {
      width: this.naturalWidth() ?? image.naturalWidth,
      height: this.naturalHeight() ?? image.naturalHeight,
    };
    this.contentSize.set(content);

    const viewport: PlanViewportSize = this.currentViewportSize();
    this.fitScale =
      content.width > 0 && content.height > 0 && viewport.width > 0 && viewport.height > 0
        ? clampPlanZoom(
            Math.min(viewport.width / content.width, viewport.height / content.height),
            this.minZoom(),
            this.maxZoom(),
          )
        : 1;

    this.transform.set({ x: 0, y: 0, scale: this.fitScale });
    this.status.set('loaded');
  }

  /**
   * Method onImageError
   * @description Switches the viewer to its error state.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onImageError(): void {
    this.status.set('error');
  }

  /**
   * Method onWheel
   * @description Zooms around the cursor position; the browser's own page-scroll is suppressed.
   * @access protected
   * @since 1.0.0
   * @param {WheelEvent} event - The wheel event.
   * @returns {void}
   */
  protected onWheel(event: WheelEvent): void {
    if (this.status() !== 'loaded') return;
    event.preventDefault();

    const pointer: PlanPoint = this.pointerFromEvent(event);
    const factor: number = event.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
    this.zoomAround(pointer, factor);
  }

  /**
   * Method onPointerDown
   * @description Starts a drag pan (one pointer) or a pinch zoom (two pointers).
   * @access protected
   * @since 1.0.0
   * @param {PointerEvent} event - The pointer-down event.
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
   * @description Advances the active drag pan or pinch zoom, if any.
   * @access protected
   * @since 1.0.0
   * @param {PointerEvent} event - The pointer-move event.
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
          this.minZoom(),
          this.maxZoom(),
        ),
      );
    }
  }

  /**
   * Method onPointerUp
   * @description Ends a drag or pinch when a pointer is released, cancelled, or leaves the stage.
   * @access protected
   * @since 1.0.0
   * @param {PointerEvent} event - The ending pointer event.
   * @returns {void}
   */
  protected onPointerUp(event: PointerEvent): void {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) this.pinchOrigin = null;
    if (this.activePointers.size < 1) this.dragOrigin = null;
  }

  /**
   * Method onKeydown
   *
   * @description
   * The keyboard enhancement over the always-present buttons: `+`/`-` zoom,
   * `0` resets, and the arrow keys pan — all centered on / anchored to the
   * viewport rather than any pointer position.
   *
   * @access protected
   * @since 1.0.0
   * @param {KeyboardEvent} event - The key event.
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
   * @description Zooms in one step, anchored on the viewport's center.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected zoomIn(): void {
    this.zoomAround(this.viewportCenter(), BUTTON_ZOOM_FACTOR);
  }

  /**
   * Method zoomOut
   * @description Zooms out one step, anchored on the viewport's center.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected zoomOut(): void {
    this.zoomAround(this.viewportCenter(), 1 / BUTTON_ZOOM_FACTOR);
  }

  /**
   * Method resetView
   * @description Restores the transform that fits the whole plan in the viewport.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected resetView(): void {
    this.applyTransform({ x: 0, y: 0, scale: this.fitScale });
  }

  /**
   * Method zoomAround
   * @description Applies a zoom factor anchored on a viewport point, then re-clamps the pan.
   * @access private
   * @since 1.0.0
   * @param {PlanPoint} pointer - The zoom's anchor, viewport-relative.
   * @param {number} factor - The multiplicative zoom change.
   * @returns {void}
   */
  private zoomAround(pointer: PlanPoint, factor: number): void {
    this.applyTransform(
      zoomPlanAtPoint(
        this.transform(),
        pointer,
        this.currentViewportSize(),
        factor,
        this.minZoom(),
        this.maxZoom(),
      ),
    );
  }

  /**
   * Method panBy
   * @description Translates the transform by a fixed pixel offset, then re-clamps the pan.
   * @access private
   * @since 1.0.0
   * @param {number} dx - The horizontal offset in pixels.
   * @param {number} dy - The vertical offset in pixels.
   * @returns {void}
   */
  private panBy(dx: number, dy: number): void {
    const current: PlanTransform = this.transform();
    this.applyTransform({ ...current, x: current.x + dx, y: current.y + dy });
  }

  /**
   * Method applyTransform
   * @description Confines a candidate transform's pan to the current content and viewport, and writes it.
   * @access private
   * @since 1.0.0
   * @param {PlanTransform} next - The candidate transform.
   * @returns {void}
   */
  private applyTransform(next: PlanTransform): void {
    const content: PlanViewportSize | null = this.contentSize();
    if (!content) return;

    this.transform.set(clampPlanPan(next, this.currentViewportSize(), content, MIN_VISIBLE_PX));
  }

  /**
   * Method pointerFromEvent
   * @description A pointer or wheel event's position, relative to the viewport's top-left.
   * @access private
   * @since 1.0.0
   * @param {PointerEvent | WheelEvent} event - The source event.
   * @returns {PlanPoint} The viewport-relative position.
   */
  private pointerFromEvent(event: PointerEvent | WheelEvent): PlanPoint {
    const rect: DOMRect | undefined = this.viewportRef()?.nativeElement.getBoundingClientRect();

    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  }

  /**
   * Method viewportCenter
   * @description The viewport's center, in its own relative coordinates.
   * @access private
   * @since 1.0.0
   * @returns {PlanPoint} The center point.
   */
  private viewportCenter(): PlanPoint {
    const size: PlanViewportSize = this.currentViewportSize();

    return { x: size.width / 2, y: size.height / 2 };
  }

  /**
   * Method currentViewportSize
   * @description The viewport element's current size, read live rather than cached.
   * @access private
   * @since 1.0.0
   * @returns {PlanViewportSize} The viewport's size.
   */
  private currentViewportSize(): PlanViewportSize {
    const rect: DOMRect | undefined = this.viewportRef()?.nativeElement.getBoundingClientRect();

    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  }
  //#endregion
}
