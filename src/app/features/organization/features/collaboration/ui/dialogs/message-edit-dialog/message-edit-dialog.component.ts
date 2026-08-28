import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, maxLength, required, type FieldTree } from '@angular/forms/signals';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { StoreError } from '@core/request-state';
import type { MessageOutput } from '@features/organization/features/collaboration/models';
import {
  applyMentionMarkers,
  messageBodyToDraft,
} from '@features/organization/features/collaboration/utils';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInputGroup, HlmInputGroupTextarea } from '@shared/ui/input-group';
import { MESSAGE_BODY_MAX_LENGTH } from '../../forms/message-composer/constants';
import type { MessageEditDraft } from './models';

/**
 * Component MessageEditDialog
 * @class MessageEditDialog
 *
 * @description
 * Edits one of the reader's own messages — the only messages the server lets
 * anyone edit.
 *
 * The draft starts from the stored body turned back into composer text:
 * entities decoded and each `@{memberUuid}` marker rewritten to the readable
 * `@Name` form, which `applyMentionMarkers` reverses on submit using the
 * same names inverted. A mention whose member has no resolvable name stays a
 * raw marker in the draft, so it survives the round trip untouched.
 *
 * The dialog stays open and busy-locked until the write settles, surfacing a
 * failure inline; the page closes it on the store's `edited` event.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-message-edit-dialog
 *   [visible]="editTarget() !== null"
 *   [message]="editTarget()"
 *   [pending]="thread.isEditing()"
 *   [error]="editDialogError()"
 *   (visibleChange)="onEditDialogVisibleChange($event)"
 *   (submitted)="submitMessageEdit($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-edit-dialog',
  imports: [
    FormField,
    HlmButton,
    HlmInputGroup,
    HlmInputGroupTextarea,
    ...HlmDialogImports,
    ...HlmFieldImports,
  ],
  templateUrl: './message-edit-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageEditDialog {
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
   * Property message
   * @readonly
   *
   * @description
   * The message being edited — the transport shape, because the draft needs
   * the raw stored body and the mention names, which the rendered view no
   * longer carries.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MessageOutput | null>}
   */
  public readonly message: InputSignal<MessageOutput | null> = input<MessageOutput | null>(null);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the edit write is in flight, busy-locking the footer and
   * blocking Escape/backdrop dismissal.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * The edit write's own error from a submit attempted this session, or
   * `null`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error: InputSignal<StoreError | null> = input<StoreError | null>(null);
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
   * Emits the replacement body with mention markers restored; the page calls
   * the store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly submitted: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /** The edited draft. */
  protected readonly model: WritableSignal<MessageEditDraft> = signal<MessageEditDraft>({
    body: '',
  });

  /**
   * Property editForm
   * @readonly
   *
   * @description
   * The field tree and its rules — the domain's 4000-character ceiling, not
   * the DTO's advertised 40 000.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<MessageEditDraft>}
   */
  protected readonly editForm: FieldTree<MessageEditDraft> = form(this.model, (path): void => {
    required(path.body, {
      message: $localize`:@@messages.editDialog.bodyRequired:A message cannot be empty — delete it instead.`,
    });
    maxLength(path.body, MESSAGE_BODY_MAX_LENGTH, {
      message: $localize`:@@messages.editDialog.bodyTooLong:Messages are capped at 4000 characters.`,
    });
  });

  /**
   * Property dialogState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link visible}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   *
   * @description
   * Reseeds the draft from the targeted message every time the dialog opens,
   * so a previous edit never bleeds into the next.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      if (!this.visible()) return;

      const message: MessageOutput | null = this.message();

      this.model.set({
        body: message === null ? '' : messageBodyToDraft(message.body, message.mentionNames),
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports a dismissal back to the page, which owns the flag this is
   * derived from. Ignored while the edit write is in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (this.pending()) return;

    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once, then emits the
   * body with each `@Name` label rewritten back into its `@{memberUuid}`
   * marker — fed the message's own mention names inverted, since the dialog
   * has no picker of its own and cannot introduce a new mention.
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

    if (this.pending()) return;

    this.editForm().markAsTouched();

    const body: string = this.model().body.trim();

    if (this.editForm().invalid() || body.length === 0) return;

    const message: MessageOutput | null = this.message();
    const labelsToIds = new Map<string, string>(
      Object.entries(message?.mentionNames ?? {}).map(
        ([memberId, name]: [string, string]): [string, string] => [name, memberId],
      ),
    );

    this.submitted.emit(applyMentionMarkers(body, labelsToIds));
  }
  //#endregion
}
