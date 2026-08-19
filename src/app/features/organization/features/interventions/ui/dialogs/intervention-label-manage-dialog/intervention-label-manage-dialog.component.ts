import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { InterventionLabelOutput } from '@features/organization/features/interventions/models';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSeparator } from '@shared/ui/separator';

/** A rename/recolor draft submitted for one existing label. */
export interface InterventionLabelUpdateSubmittedEvent {
  readonly labelId: string;
  readonly name: string;
  readonly color: string;
}

/** A `{ name, color }` draft submitted for a new label. */
export interface InterventionLabelCreateSubmittedEvent {
  readonly name: string;
  readonly color: string;
}

/** The default swatch offered to a brand-new label. */
const DEFAULT_LABEL_COLOR = '#3b82f6';

/**
 * Component InterventionLabelManageDialog
 * @class InterventionLabelManageDialog
 *
 * @description
 * The organization's intervention label catalog, opened from wherever a
 * label is picked (`app-intervention-properties-grid`'s labels field today).
 * Lists every label with an inline rename/recolor editor and an inline
 * delete confirmation, plus a small "New label" form at the top.
 *
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store and
 * takes its open state from {@link open}. Each row's edit draft and the
 * create form's draft are this dialog's own state; the caller owns every
 * write and decides what to dispatch from {@link created}/{@link updated}/
 * {@link removed}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-label-manage-dialog',
  imports: [HlmButton, HlmInput, HlmSeparator, ...HlmDialogImports, ...HlmFieldImports],
  templateUrl: './intervention-label-manage-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionLabelManageDialog {
  //#region Inputs
  /** Whether the dialog is open. Owned by the caller. */
  public readonly open: InputSignal<boolean> = input<boolean>(false);

  /** The organization's label catalog, newest edits included. */
  public readonly labels: InputSignal<readonly InterventionLabelOutput[]> = input<
    readonly InterventionLabelOutput[]
  >([]);

  /** Whether the catalog is still loading. */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /** Whether the create form's submit is in flight. */
  public readonly creating: InputSignal<boolean> = input<boolean>(false);

  /** Id of the label whose rename/recolor write is in flight, if any. */
  public readonly savingId: InputSignal<string | null> = input<string | null>(null);

  /** Id of the label whose delete write is in flight, if any. */
  public readonly removingId: InputSignal<string | null> = input<string | null>(null);

  /** The create form's last failure message, if any. */
  public readonly createError: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /** The dialog was closed — Escape, the backdrop, or the close button. */
  public readonly closed: OutputEmitterRef<void> = output<void>();

  /** A new label was submitted. */
  public readonly created: OutputEmitterRef<InterventionLabelCreateSubmittedEvent> =
    output<InterventionLabelCreateSubmittedEvent>();

  /** An existing label's rename/recolor was submitted. */
  public readonly updated: OutputEmitterRef<InterventionLabelUpdateSubmittedEvent> =
    output<InterventionLabelUpdateSubmittedEvent>();

  /** A label's deletion was confirmed. */
  public readonly removed: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /** The dialog state, derived from {@link open}. */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.open() ? 'open' : 'closed',
  );

  /** The create form's drafted name. */
  protected readonly draftName: WritableSignal<string> = signal<string>('');

  /** The create form's drafted color. */
  protected readonly draftColor: WritableSignal<string> = signal<string>(DEFAULT_LABEL_COLOR);

  /** The row currently open for edit, or null. */
  protected readonly editingId: WritableSignal<string | null> = signal<string | null>(null);

  /** The row currently pending a delete confirmation, or null. */
  protected readonly confirmingRemoveId: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /** The open row's drafted name. */
  protected readonly editName: WritableSignal<string> = signal<string>('');

  /** The open row's drafted color. */
  protected readonly editColor: WritableSignal<string> = signal<string>(DEFAULT_LABEL_COLOR);

  /** Whether the create form may submit. */
  protected readonly canCreate: Signal<boolean> = computed<boolean>(
    () => !this.creating() && this.draftName().trim().length > 0,
  );
  //#endregion

  //#region Constructor
  /** Clears every in-flight draft whenever the dialog closes. */
  public constructor() {
    effect((): void => {
      const isOpen: boolean = this.open();

      untracked((): void => {
        if (isOpen) return;

        this.draftName.set('');
        this.draftColor.set(DEFAULT_LABEL_COLOR);
        this.editingId.set(null);
        this.confirmingRemoveId.set(null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   *
   * @description Relays a dismissal — Escape or the backdrop.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The dialog's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.closed.emit();
  }

  /**
   * Method submitCreate
   *
   * @description Emits {@link created} for the drafted name/color, then clears the form.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected submitCreate(): void {
    const name: string = this.draftName().trim();
    if (!name) return;

    this.created.emit({ name, color: this.draftColor() });
    this.draftName.set('');
    this.draftColor.set(DEFAULT_LABEL_COLOR);
  }

  /**
   * Method startEdit
   *
   * @description Opens a row's inline editor, seeded from its stored values.
   * @access protected
   * @since 1.0.0
   * @param {InterventionLabelOutput} label - The row to edit.
   * @returns {void}
   */
  protected startEdit(label: InterventionLabelOutput): void {
    this.confirmingRemoveId.set(null);
    this.editingId.set(label.id);
    this.editName.set(label.name);
    this.editColor.set(label.color);
  }

  /**
   * Method cancelEdit
   *
   * @description Closes the open row editor without submitting.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  /**
   * Method submitEdit
   *
   * @description Emits {@link updated} for the open row's draft, then closes its editor.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected submitEdit(): void {
    const labelId: string | null = this.editingId();
    const name: string = this.editName().trim();
    if (!labelId || !name) return;

    this.updated.emit({ labelId, name, color: this.editColor() });
    this.editingId.set(null);
  }

  /**
   * Method requestRemove
   *
   * @description Opens a row's inline delete confirmation.
   * @access protected
   * @since 1.0.0
   * @param {string} labelId - The row to confirm.
   * @returns {void}
   */
  protected requestRemove(labelId: string): void {
    this.editingId.set(null);
    this.confirmingRemoveId.set(labelId);
  }

  /**
   * Method confirmRemove
   *
   * @description Emits {@link removed} for the confirmed row, then closes the confirmation.
   * @access protected
   * @since 1.0.0
   * @param {string} labelId - The confirmed row.
   * @returns {void}
   */
  protected confirmRemove(labelId: string): void {
    this.confirmingRemoveId.set(null);
    this.removed.emit(labelId);
  }
  //#endregion
}
