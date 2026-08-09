import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@shared/ui/button';
import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogFooter,
  HlmDialogHeader,
  HlmDialogPortal,
  HlmDialogTitle,
} from '@shared/ui/dialog';
import { HlmInput } from '@shared/ui/input';
import { HlmLabel } from '@shared/ui/label';

/**
 * Maximum length of a saved view's name — a view bar entry, not a sentence.
 */
const VIEW_NAME_MAX_LENGTH = 40;

/**
 * Component InterventionViewSaveDialog
 * @class InterventionViewSaveDialog
 *
 * @description
 * Names the current narrowing and ordering as a saved view. One trimmed,
 * length-capped text field; Save emits the name and the page owns building
 * and persisting the view. Presentational — no store, no cookie access.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-view-save-dialog
 *   [visible]="saveViewVisible()"
 *   (visibleChange)="saveViewVisible.set($event)"
 *   (saved)="saveCurrentView($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-view-save-dialog',
  imports: [
    HlmButton,
    HlmDialog,
    HlmDialogContent,
    HlmDialogFooter,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
    HlmInput,
    HlmLabel,
  ],
  templateUrl: './intervention-view-save-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionViewSaveDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open; the page owns the flag.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description Mirrors the overlay's open state back to the page.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property saved
   * @readonly
   * @description Emits the trimmed view name; the page builds and stores the view.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly saved: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /** The name being typed. */
  protected readonly draftName: WritableSignal<string> = signal<string>('');

  /** Maximum name length, exposed for the input's own cap. */
  protected readonly maxLength: number = VIEW_NAME_MAX_LENGTH;

  /** Whether the trimmed draft can be saved. */
  protected readonly canSave: Signal<boolean> = computed<boolean>(() => {
    const trimmed: string = this.draftName().trim();

    return trimmed.length > 0 && trimmed.length <= VIEW_NAME_MAX_LENGTH;
  });

  /** The overlay's own open/closed state, derived from {@link visible}. */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   *
   * @description
   * Mirrors an overlay-initiated close (Escape, backdrop) back to the page and
   * drops the draft, so the next opening starts blank.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';
    if (isOpen === this.visible()) return;

    if (!isOpen) this.draftName.set('');
    this.visibleChange.emit(isOpen);
  }

  /**
   * Method onNameInput
   *
   * @description
   * Records a keystroke into the draft.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The input event.
   *
   * @returns {void}
   */
  protected onNameInput(event: Event): void {
    this.draftName.set((event.target as HTMLInputElement).value);
  }

  /**
   * Method save
   *
   * @description
   * Emits the trimmed name, closes and resets the draft.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected save(): void {
    if (!this.canSave()) return;

    this.saved.emit(this.draftName().trim());
    this.draftName.set('');
    this.visibleChange.emit(false);
  }

  /**
   * Method cancel
   *
   * @description
   * Closes without saving and drops the draft.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected cancel(): void {
    this.draftName.set('');
    this.visibleChange.emit(false);
  }
  //#endregion
}
