import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';

/**
 * Component InterventionSignatureDialog
 * @class InterventionSignatureDialog
 *
 * @description
 * A minimal, hand-rolled canvas signature pad hosted in an `hlm-dialog`
 * (`ARCHITECTURE.md` §8.5 vendored-code exception — the spartan/ui catalog
 * has no signature or freehand-canvas primitive; see `FEATURE.md`). Captures
 * one stroke-tracked drawing through Pointer Events (mouse, touch and pen
 * alike) and hands the caller a PNG `Blob` on confirm; it performs no upload
 * of its own.
 *
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store. Canvas
 * work only ever runs from a user gesture — opening the dialog (already a
 * click) or a pointer stroke — so there is nothing to guard for SSR; the
 * dialog's own content is not in the DOM until {@link visible} is `true`.
 * The pad is inherently pointer-driven and offers no keyboard drawing
 * simulation; the dialog copy states its purpose and the surrounding
 * `hlm-dialog` still gives it a focus trap and Escape-to-dismiss, blocked
 * only while {@link busy} — the confirmed signature's upload — is in flight.
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-intervention-signature-dialog
 *   [visible]="signatureDialogVisible()"
 *   [busy]="signatureUploading()"
 *   (signed)="onSignatureCaptured($event)"
 *   (dismissed)="onSignatureDismissed()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-signature-dialog',
  imports: [HlmButton, ...HlmDialogImports],
  templateUrl: './intervention-signature-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionSignatureDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property busy
   * @readonly
   * @description Whether the caller's upload of the confirmed signature is in flight, which disables confirming again.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly busy: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property signed
   * @readonly
   * @description The captured signature, encoded as a PNG `Blob`.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<Blob>}
   */
  public readonly signed: OutputEmitterRef<Blob> = output<Blob>();

  /**
   * Property dismissed
   * @readonly
   * @description The dialog was closed without signing — Escape, the backdrop, or Skip.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Constructor
  constructor() {
    effect((): void => {
      const visible: boolean = this.visible();
      const canvas: HTMLCanvasElement | undefined = this.canvasRef()?.nativeElement;

      untracked((): void => {
        this.hasStrokes.set(false);
        this.drawing = false;
        this.context = visible && canvas ? this.sizeCanvas(canvas) : null;
      });
    });
  }
  //#endregion

  //#region Properties
  /** The pad's backing canvas element, present only while {@link visible}. */
  protected readonly canvasRef: Signal<ElementRef<HTMLCanvasElement> | undefined> =
    viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  /** Whether at least one stroke has been drawn since the pad last opened or cleared. */
  protected readonly hasStrokes: WritableSignal<boolean> = signal<boolean>(false);

  /** The sized 2D context, or `null` until the canvas has rendered. */
  private context: CanvasRenderingContext2D | null = null;

  /** Whether a pointer is currently down and drawing. */
  private drawing: boolean = false;

  /** Whether Confirm is currently usable: at least one stroke, and no upload already in flight. */
  protected readonly canConfirm: Signal<boolean> = computed<boolean>(
    () => this.hasStrokes() && !this.busy(),
  );
  //#endregion

  //#region Methods
  /**
   * Method onDialogStateChanged
   *
   * @description
   * Relays a dismissal — Escape or the backdrop — as {@link dismissed}. The
   * `open` transition is only ever the caller setting {@link visible}, so it
   * is ignored here.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The dialog's new state.
   *
   * @returns {void}
   */
  protected onDialogStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.dismissed.emit();
  }

  /**
   * Method onPointerDown
   * @description Starts a new stroke at the pointer's canvas-local position.
   * @access protected
   * @since 1.0.0
   * @param {PointerEvent} event - The pointer's `pointerdown` event.
   * @returns {void}
   */
  protected onPointerDown(event: PointerEvent): void {
    const canvas: HTMLCanvasElement | undefined = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    this.drawing = true;

    const point = this.localPoint(canvas, event);
    this.context?.beginPath();
    this.context?.moveTo(point.x, point.y);
  }

  /**
   * Method onPointerMove
   * @description Extends the current stroke while a pointer is down.
   * @access protected
   * @since 1.0.0
   * @param {PointerEvent} event - The pointer's `pointermove` event.
   * @returns {void}
   */
  protected onPointerMove(event: PointerEvent): void {
    if (!this.drawing) return;
    const canvas: HTMLCanvasElement | undefined = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const point = this.localPoint(canvas, event);
    this.context?.lineTo(point.x, point.y);
    this.context?.stroke();
    if (!this.hasStrokes()) this.hasStrokes.set(true);
  }

  /**
   * Method onPointerUp
   * @description Ends the current stroke.
   * @access protected
   * @since 1.0.0
   * @param {PointerEvent} event - The pointer's `pointerup`/`pointercancel` event.
   * @returns {void}
   */
  protected onPointerUp(event: PointerEvent): void {
    if (!this.drawing) return;

    this.drawing = false;
    this.canvasRef()?.nativeElement.releasePointerCapture(event.pointerId);
  }

  /**
   * Method clear
   * @description Wipes the pad and re-arms Confirm as disabled.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected clear(): void {
    const canvas: HTMLCanvasElement | undefined = this.canvasRef()?.nativeElement;
    if (canvas && this.context) this.context.clearRect(0, 0, canvas.width, canvas.height);

    this.hasStrokes.set(false);
  }

  /**
   * Method confirm
   *
   * @description
   * Encodes the drawn pad as a PNG and emits {@link signed}. A no-op while
   * empty or busy — the template keeps the button disabled for the same
   * condition, this is the defensive second gate.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirm(): void {
    const canvas: HTMLCanvasElement | undefined = this.canvasRef()?.nativeElement;
    if (!canvas || !this.hasStrokes() || this.busy()) return;

    canvas.toBlob((blob: Blob | null): void => {
      if (blob) this.signed.emit(blob);
    }, 'image/png');
  }

  /**
   * Method sizeCanvas
   *
   * @description
   * Sizes the canvas's backing store to its rendered CSS box times the
   * device pixel ratio, so a stroke stays crisp on a high-DPI screen, then
   * derives the ink colour from the canvas's own resolved `color` (its
   * `text-foreground` class) so the pad follows dark mode without a second
   * palette.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {HTMLCanvasElement} canvas - The freshly rendered canvas element.
   *
   * @returns {CanvasRenderingContext2D | null} The sized, ready-to-draw context.
   */
  private sizeCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
    const ratio: number = globalThis.devicePixelRatio || 1;
    const rect: DOMRect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const context: CanvasRenderingContext2D | null = canvas.getContext('2d');
    if (!context) return null;

    context.scale(ratio, ratio);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 2;
    context.strokeStyle = globalThis.getComputedStyle(canvas).color || '#000000';

    return context;
  }

  /**
   * Method localPoint
   * @description The pointer event's position relative to the canvas's own box.
   * @access private
   * @since 1.0.0
   * @param {HTMLCanvasElement} canvas - The canvas the point is relative to.
   * @param {PointerEvent} event - The source pointer event.
   * @returns {{ x: number; y: number }} The canvas-local coordinates.
   */
  private localPoint(canvas: HTMLCanvasElement, event: PointerEvent): { x: number; y: number } {
    const rect: DOMRect = canvas.getBoundingClientRect();

    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  //#endregion
}
