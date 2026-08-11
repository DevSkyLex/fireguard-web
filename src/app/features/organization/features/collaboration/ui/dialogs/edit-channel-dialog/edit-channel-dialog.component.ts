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
import type { EditChannelDraft, EditChannelFormDraft } from './models';

/** Matches `UpdateChannelInput`'s underlying `ChannelResource.name` bounds. */
const CHANNEL_NAME_MIN_LENGTH = 2;
const CHANNEL_NAME_MAX_LENGTH = 80;

/**
 * Component EditChannelDialog
 * @class EditChannelDialog
 *
 * @description
 * Renames a channel and, optionally, moves it under a different root
 * channel — or detaches it back to the top level.
 *
 * Presentational: it seeds its draft from {@link name} and
 * {@link parentChannelId} every time it opens, validates, and emits
 * {@link submitted}; the page decides which of `ChannelsStore.update` and
 * `.setParent` to call, since only a genuinely changed value is worth a
 * request (`ARCHITECTURE.md` §10.5). The parent options are supplied already
 * narrowed to root channels other than this one — nesting under a channel
 * that already has a parent, or under itself, is not offered rather than
 * refused after the fact.
 *
 * Closes the moment the form validates: the entity updates in place through
 * the shared `ChannelsStore`, so the header and the list both pick up the
 * change reactively without this dialog waiting on the request.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-edit-channel-dialog
 *   [visible]="editDialogVisible()"
 *   [name]="channel()?.name ?? ''"
 *   [parentChannelId]="currentParentId()"
 *   [parentOptions]="rootChannelOptions()"
 *   (submitted)="submitEdit($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-edit-channel-dialog',
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
  templateUrl: './edit-channel-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditChannelDialog {
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
   * Emits the validated name and parent.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<EditChannelDraft>}
   */
  public readonly submitted: OutputEmitterRef<EditChannelDraft> = output<EditChannelDraft>();
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

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   *
   * @description
   * Reseeds the draft from {@link name} and {@link parentChannelId} every
   * time the dialog opens, so a previous edit — this channel's or another
   * one's, since the page may reuse this dialog across channels — never
   * bleeds into the next.
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
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Reports a dismissal — escape, the backdrop, the close button — back to
   * the page, which owns the flag this is derived from.
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

    this.editForm().markAsTouched();

    if (this.editForm().invalid()) return;

    const draft: EditChannelFormDraft = this.model();

    this.submitted.emit({
      name: draft.name.trim(),
      parentChannelId: draft.parentChannelId === '' ? null : draft.parentChannelId,
    });
    this.visibleChange.emit(false);
  }
  //#endregion
}
