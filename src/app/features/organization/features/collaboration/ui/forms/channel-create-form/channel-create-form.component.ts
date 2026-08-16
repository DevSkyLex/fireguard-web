import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
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
import { HlmButton } from '@shared/ui/button';
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
 * Component ChannelCreateForm
 * @class ChannelCreateForm
 *
 * @description
 * Names a new channel and, optionally, nests it under an existing root
 * channel. Extracted from `NewChannelDialog` so the overlay stays a thin
 * host, the way `OrganizationInviteForm` is extracted from
 * `OrganizationInviteDialog`.
 *
 * Presentational: it validates and emits {@link submitted}; the page calls
 * `ChannelsStore.create` and, if a parent was chosen, `setParent`
 * (`ARCHITECTURE.md` §10.5). The parent options are supplied already
 * narrowed to root channels — a channel that already has a parent cannot
 * itself be one, which keeps the hierarchy at the two levels the backend
 * allows without this form having to reason about depth itself.
 *
 * Resets its own draft the moment it validates and closes: the host
 * dialog's own success event is what actually closes the overlay, and a
 * failure is already surfaced by the app-wide feedback listener
 * (`core/feedback`), so there is nothing this form needs to wait for. It
 * also resets whenever {@link visible} turns false — the host dialog
 * dismissing on escape, the backdrop or Cancel — so a reopened dialog never
 * resumes a discarded draft.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-channel-create-form
 *   [visible]="createDialogVisible()"
 *   [parentOptions]="rootChannelOptions()"
 *   (submitted)="create($event)"
 *   (cancelled)="createDialogVisible.set(false)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channel-create-form',
  imports: [FormField, HlmButton, HlmInput, ...HlmFieldImports, ...HlmSelectImports],
  templateUrl: './channel-create-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelCreateForm {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the hosting overlay is open. Watched only to clear the draft the
   * moment it closes, so a reopened dialog starts blank.
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

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * The operator backed out without creating a channel.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
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

  /** Names a picked parent on the closed select trigger. */
  protected readonly parentLabelOf: (value: string) => string = (value) =>
    this.parentOptions().find((option) => option.value === value)?.label ?? '';
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   *
   * @description
   * Clears the draft the moment {@link visible} turns false, so a reopened
   * dialog never resumes a discarded draft.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      if (this.visible()) return;

      this.model.set(EMPTY_VALUES);
      this.createForm().reset();
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once, then emits and
   * resets once the form is valid.
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
  }
  //#endregion
}
