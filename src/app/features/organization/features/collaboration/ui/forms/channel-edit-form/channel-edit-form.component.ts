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
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import type { ChannelEditDraft, EditChannelFormDraft } from './models';

/** Matches `UpdateChannelInput`'s underlying `ChannelResource.name` bounds. */
const CHANNEL_NAME_MIN_LENGTH = 2;
const CHANNEL_NAME_MAX_LENGTH = 80;

/**
 * Component ChannelEditForm
 * @class ChannelEditForm
 *
 * @description
 * Renames a channel and, optionally, moves it under a different root
 * channel — or detaches it back to the top level. Extracted from
 * `ChannelEditDialog` so the overlay stays a thin host, the way
 * `OrganizationInviteForm` is extracted from `OrganizationInviteDialog`.
 *
 * Presentational: it seeds its draft from {@link name} and
 * {@link parentChannelId} every time {@link visible} turns true, validates,
 * and emits {@link submitted}; the page decides which of
 * `ChannelsStore.update` and `.setParent` to call, since only a genuinely
 * changed value is worth a request (`ARCHITECTURE.md` §10.5). The parent
 * options are supplied already narrowed to root channels other than this
 * one — nesting under a channel that already has a parent, or under itself,
 * is not offered rather than refused after the fact.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-channel-edit-form
 *   [visible]="editDialogVisible()"
 *   [name]="channel()?.name ?? ''"
 *   [parentChannelId]="currentParentId()"
 *   [parentOptions]="rootChannelOptions()"
 *   (submitted)="submitEdit($event)"
 *   (cancelled)="editDialogVisible.set(false)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channel-edit-form',
  imports: [
    RequiredMarker,
    FormField,
    HlmButton,
    HlmInput,
    ...HlmFieldImports,
    ...HlmSelectImports,
  ],
  templateUrl: './channel-edit-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelEditForm {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the hosting overlay is open. Watched to reseed the draft from
   * {@link name} and {@link parentChannelId} every time it opens.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property name
   * @readonly
   *
   * @description
   * The channel's current name, seeding the draft on every open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly name: InputSignal<string> = input<string>('');

  /**
   * Property parentChannelId
   * @readonly
   *
   * @description
   * The channel's current parent, or `null` at the top level.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly parentChannelId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property parentOptions
   * @readonly
   *
   * @description
   * Root channels other than this one, offered as candidate parents.
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
   * Whether a write this form's submit triggered — a rename or a move — is
   * still in flight, disabling Cancel and Save against a stray resubmission.
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
   * Emits the validated name and parent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<ChannelEditDraft>}
   */
  public readonly submitted: OutputEmitterRef<ChannelEditDraft> = output<ChannelEditDraft>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * The operator backed out without saving anything.
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
  protected readonly model: WritableSignal<EditChannelFormDraft> = signal<EditChannelFormDraft>({
    name: '',
    parentChannelId: '',
  });

  /**
   * Property editForm
   * @readonly
   *
   * @description
   * The field tree and its rules, matching the channel name's server-side
   * bounds.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<EditChannelFormDraft>}
   */
  protected readonly editForm: FieldTree<EditChannelFormDraft> = form(this.model, (path): void => {
    required(path.name, {
      message: $localize`:@@channels.editDialog.nameRequired:Give the channel a name`,
    });
    minLength(path.name, CHANNEL_NAME_MIN_LENGTH, {
      message: $localize`:@@channels.editDialog.nameLength:Use between 2 and 80 characters.`,
    });
    maxLength(path.name, CHANNEL_NAME_MAX_LENGTH, {
      message: $localize`:@@channels.editDialog.nameLength:Use between 2 and 80 characters.`,
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
   * Reseeds the draft from {@link name} and {@link parentChannelId} every
   * time the hosting overlay opens, so a previous edit — this channel's or
   * another one's, since the host dialog may be reused across channels —
   * never bleeds into the next.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      if (!this.visible()) return;

      const name: string = this.name();
      const parentChannelId: string | null = this.parentChannelId();

      this.model.set({ name, parentChannelId: parentChannelId ?? '' });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once, then emits
   * once the form is valid.
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

    this.editForm().markAsTouched();

    if (this.editForm().invalid()) return;

    const draft: EditChannelFormDraft = this.model();

    this.submitted.emit({
      name: draft.name.trim(),
      parentChannelId: draft.parentChannelId === '' ? null : draft.parentChannelId,
    });
  }
  //#endregion
}
