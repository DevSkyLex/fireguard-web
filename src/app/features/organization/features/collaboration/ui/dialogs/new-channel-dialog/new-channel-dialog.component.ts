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
import {
  form,
  FormField,
  maxLength,
  minLength,
  required,
  type FieldTree,
} from '@angular/forms/signals';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@shared/ui/button';
import {
  HlmDialog,
  HlmDialogContent,
  HlmDialogHeader,
  HlmDialogPortal,
  HlmDialogTitle,
} from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import type { NewChannelDraft, NewChannelFormDraft } from './models';

/** Matches `CreateChannelInput.name`'s server-side bounds. */
const CHANNEL_NAME_MIN_LENGTH = 2;
const CHANNEL_NAME_MAX_LENGTH = 80;

/** A blank draft. */
const EMPTY_VALUES: NewChannelFormDraft = { name: '', parentChannelId: '' };

/**
 * Component NewChannelDialog
 * @class NewChannelDialog
 *
 * @description
 * Names a new channel and, optionally, nests it under an existing root
 * channel.
 *
 * Presentational: it validates and emits {@link submitted}; the page calls
 * `ChannelsStore.create` and, if a parent was chosen, `setParent`
 * (`ARCHITECTURE.md` §10.5). The parent options are supplied already
 * narrowed to root channels — a channel that already has a parent cannot
 * itself be one, which keeps the hierarchy at the two levels the backend
 * allows without this dialog having to reason about depth itself.
 *
 * Closes the moment the form validates, the way `NewDirectMessageDialog`
 * does: the page's own success event is what actually navigates, and a
 * failure is already surfaced by the app-wide feedback listener
 * (`core/feedback`), so there is nothing this dialog needs to wait for.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-new-channel-dialog
 *   [visible]="createDialogVisible()"
 *   [parentOptions]="rootChannelOptions()"
 *   (submitted)="create($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-new-channel-dialog',
  imports: [
    FormField,
    HlmButton,
    HlmDialog,
    HlmDialogContent,
    HlmDialogHeader,
    HlmDialogPortal,
    HlmDialogTitle,
    HlmInput,
    ...HlmFieldImports,
    ...HlmSelectImports,
  ],
  templateUrl: './new-channel-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewChannelDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the dialog is open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property parentOptions
   * @readonly
   *
   * @description
   * Root channels the new one may be nested under.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<{ readonly value: string; readonly label: string }>>}
   */
  public readonly parentOptions: InputSignal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = input<ReadonlyArray<{ readonly value: string; readonly label: string }>>([]);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a previous submission is still in flight, which locks the
   * submit control against a double press.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   *
   * @description
   * Reports the dialog opening or closing, including a dismissal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the validated name and optional parent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<NewChannelDraft>}
   */
  public readonly submitted: OutputEmitterRef<NewChannelDraft> = output<NewChannelDraft>();
  //#endregion

  //#region Properties
  /** The edited draft. */
  protected readonly model: WritableSignal<NewChannelFormDraft> =
    signal<NewChannelFormDraft>(EMPTY_VALUES);

  /**
   * Property createForm
   * @readonly
   *
   * @description
   * The field tree and its rules, matching `CreateChannelInput.name`'s
   * server-side bounds.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<NewChannelFormDraft>}
   */
  protected readonly createForm: FieldTree<NewChannelFormDraft> = form(this.model, (path): void => {
    required(path.name, {
      message: $localize`:@@channels.newDialog.nameRequired:Give the channel a name`,
    });
    minLength(path.name, CHANNEL_NAME_MIN_LENGTH, {
      message: $localize`:@@channels.newDialog.nameLength:Use between 2 and 80 characters.`,
    });
    maxLength(path.name, CHANNEL_NAME_MAX_LENGTH, {
      message: $localize`:@@channels.newDialog.nameLength:Use between 2 and 80 characters.`,
    });
  });

  /**
   * Property dialogState
   * @readonly
   *
   * @description
   * The overlay's own open/closed state, derived from {@link visible} so the
   * page stays the single owner of whether the dialog is up.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );

  /** Names a picked parent on the closed select trigger. */
  protected readonly parentLabelOf: (value: string) => string = (value) =>
    this.parentOptions().find((option) => option.value === value)?.label ?? '';
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports a dismissal — escape, the backdrop, the close button — back to
   * the page, which owns the flag this is derived from. Clears the draft on
   * close, so the next open starts blank rather than resuming a discarded one.
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

    if (!isOpen) {
      this.model.set(EMPTY_VALUES);
      this.createForm().reset();
    }

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once, then emits and
   * closes once the form is valid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.createForm().markAsTouched();

    if (this.createForm().invalid() || this.pending()) return;

    const draft: NewChannelFormDraft = this.model();

    this.submitted.emit({
      name: draft.name.trim(),
      parentChannelId: draft.parentChannelId === '' ? null : draft.parentChannelId,
    });
    this.model.set(EMPTY_VALUES);
    this.createForm().reset();
    this.visibleChange.emit(false);
  }
  //#endregion
}
