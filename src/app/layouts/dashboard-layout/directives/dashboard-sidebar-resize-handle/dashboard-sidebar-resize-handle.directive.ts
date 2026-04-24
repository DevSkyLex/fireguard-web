import { DOCUMENT } from '@angular/common';
import { Directive, DestroyRef, ElementRef, inject } from '@angular/core';
import { DashboardSidebarService } from '@layouts/dashboard-layout/services';

/**
 * Directive DashboardSidebarResizeHandleDirective
 * @class DashboardSidebarResizeHandleDirective
 *
 * @description
 * This directive is responsible for handling the resizing of the dashboard sidebar
 * by dragging a resize handle. It listens to pointer events to adjust the width of
 * the sidebar and also supports keyboard interactions for accessibility.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <div appDashboardSidebarResizeHandle class="resize-handle"></div>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Directive({
  selector: '[appDashboardSidebarResizeHandle]',
  standalone: true,
  host: {
    'style.touch-action': 'none',
    '(pointerdown)': 'onResizeStart($event)',
    '(keydown)': 'onResizeKeydown($event)',
  },
})
export class DashboardSidebarResizeHandleDirective {
  //#region Properties
  /**
   * Property KEYBOARD_RESIZE_STEP
   * @readonly
   * @static
   *
   * @description
   * The amount of pixels the sidebar width is adjusted
   * when using the keyboard without shift.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {number}
   */
  private static readonly KEYBOARD_RESIZE_STEP: number = 16;

  /**
   * Property KEYBOARD_RESIZE_FAST_STEP
   * @readonly
   * @static
   *
   * @description
   * The amount of pixels the sidebar width is adjusted
   * when using the keyboard with shift.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {number}
   */
  private static readonly KEYBOARD_RESIZE_FAST_STEP: number = 32;

  /**
   * Property document
   * @readonly
   *
   * @description
   * The document object.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * The destroy reference used to clean up resources
   * when the directive is destroyed.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);

  /**
   * Property elementRef
   * @readonly
   *
   * @description
   * The element reference of the resize handle.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ElementRef<HTMLElement>}
   */
  private readonly elementRef: ElementRef<HTMLElement> =
    inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Property sidebarService
   * @readonly
   *
   * @description
   * The dashboard sidebar service used to adjust
   * the sidebar width.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DashboardSidebarService}
   */
  private readonly sidebarService: DashboardSidebarService =
    inject<DashboardSidebarService>(DashboardSidebarService);

  /**
   * Property activePointerId
   *
   * @description
   * The pointer ID of the active pointer when resizing
   * with pointer events.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {number | null}
   */
  private activePointerId: number | null = null;

  /**
   * Property releaseResizeListeners
   *
   * @description
   * A function that releases the event listeners added
   * during the resize operation. It is set when a resize
   * operation is active and is null otherwise.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {(() => void) | null}
   */
  private releaseResizeListeners: (() => void) | null = null;

  /**
   * Property hasMoved
   *
   * @description
   * Whether the pointer moved beyond the movement threshold during the
   * current resize gesture. Used to distinguish a click (no movement)
   * from a drag, so that clicking the handle while the sidebar is
   * collapsed triggers `expand()` instead of starting a resize.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {boolean}
   */
  private hasMoved: boolean = false;

  /**
   * Property startClientX
   *
   * @description
   * The clientX position at the start of the current pointer gesture.
   * Used together with `hasMoved` to detect significant horizontal
   * movement.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {number}
   */
  private startClientX: number = 0;
  //endregion

  //region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Initializes the directive and sets up a destroy hook
   * to clean up resources when the directive is destroyed.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    this.destroyRef.onDestroy(() => this.stopResize());
  }
  //endregion

  //region Methods
  /**
   * Method onResizeStart
   * @method onResizeStart
   *
   * @description
   * Handles the pointerdown event on the resize handle. It
   * initiates the resize operation by adding event listeners
   * for pointermove and pointerup events on the document.
   *
   * It also sets the appropriate cursor and user-select styles on
   * the document body to provide visual feedback during the resize
   * operation. The resize operation can be stopped by releasing the pointer
   * or by the window losing focus.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {PointerEvent} event - The pointerdown event object.
   *
   * @returns {void} - This method does not return anything.
   */
  protected onResizeStart(event: PointerEvent): void {
    if (event.button !== 0 && event.pointerType === 'mouse') {
      return;
    }

    event.preventDefault();
    this.stopResize();

    const doc: Document = this.document;
    const view: Window | null = doc.defaultView;
    const handle: HTMLElement = this.elementRef.nativeElement;
    const sidebarElement: Element | null = handle.closest('aside') ?? handle.parentElement;
    this.activePointerId = event.pointerId;
    this.hasMoved = false;
    this.startClientX = event.clientX;
    handle.setPointerCapture?.(event.pointerId);
    this.sidebarService.startResize();

    const onPointerMove = (moveEvent: PointerEvent): void => {
      if (this.activePointerId !== moveEvent.pointerId) {
        return;
      }

      if (Math.abs(moveEvent.clientX - this.startClientX) > 3) {
        this.hasMoved = true;
      }

      const sidebarLeft: number = sidebarElement?.getBoundingClientRect().left ?? 0;
      const rawWidth: number = moveEvent.clientX - sidebarLeft;

      if (rawWidth < DashboardSidebarService.COLLAPSE_THRESHOLD) {
        this.sidebarService.collapse();
      } else {
        this.sidebarService.setWidth(rawWidth);
      }
    };

    const onStopResize = (stopEvent?: Event): void => {
      if (
        stopEvent &&
        'pointerId' in stopEvent &&
        typeof stopEvent.pointerId === 'number' &&
        stopEvent.pointerId !== this.activePointerId
      ) {
        return;
      }

      if (!this.hasMoved && this.sidebarService.isCollapsed()) {
        this.sidebarService.expand();
      }

      this.stopResize();
    };

    doc.body.style.cursor = 'col-resize';
    doc.body.style.userSelect = 'none';
    doc.addEventListener('pointermove', onPointerMove);
    doc.addEventListener('pointerup', onStopResize);
    doc.addEventListener('pointercancel', onStopResize);
    view?.addEventListener('blur', onStopResize);

    this.releaseResizeListeners = (): void => {
      doc.removeEventListener('pointermove', onPointerMove);
      doc.removeEventListener('pointerup', onStopResize);
      doc.removeEventListener('pointercancel', onStopResize);
      view?.removeEventListener('blur', onStopResize);
    };
  }

  /**
   * Method onResizeKeydown
   * @method onResizeKeydown
   *
   * @description
   * Handles the keydown event on the resize handle.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - The keydown event object.
   *
   * @returns {void} - This method does not return anything.
   */
  protected onResizeKeydown(event: KeyboardEvent): void {
    if (
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }

    event.preventDefault();

    if (event.key === 'Home') {
      this.sidebarService.setWidth(this.sidebarService.minWidth());
      return;
    }

    if (event.key === 'End') {
      this.sidebarService.setWidth(this.sidebarService.maxWidth());
      return;
    }

    const step: number = event.shiftKey
      ? DashboardSidebarResizeHandleDirective.KEYBOARD_RESIZE_FAST_STEP
      : DashboardSidebarResizeHandleDirective.KEYBOARD_RESIZE_STEP;

    if (event.key === 'ArrowLeft') {
      this.sidebarService.adjustWidth(-step);
      return;
    }

    this.sidebarService.adjustWidth(step);
  }

  /**
   * Method stopResize
   * @method stopResize
   *
   * @description
   * Stops the resize operation by releasing event listeners and resetting
   * styles and state related to the resize operation.
   *
   * @access private
   * @since 1.0.0
   *
   * @return {void} - This method does not return anything.
   */
  private stopResize(): void {
    this.releaseResizeListeners?.();
    this.releaseResizeListeners = null;
    this.activePointerId = null;
    this.hasMoved = false;
    this.document.body.style.cursor = '';
    this.document.body.style.userSelect = '';
    this.sidebarService.endResize();
  }
  //endregion
}
