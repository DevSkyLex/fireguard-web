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
 * Opening a row's editor or its delete confirmation replaces the button that
 * was focused to reach it, so a constructor effect moves focus into the
 * fresh edit name input or the destructive confirm button whenever
 * {@link editingId}/{@link confirmingRemoveId} changes ({@link editNameInputRef},
 * {@link confirmDeleteButtonRef}) — otherwise focus silently falls back to
 * the document body.
 *
 * @version 1.1.0
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

  /** The open row's name input, focused whenever {@link editingId} changes. */
  protected readonly editNameInputRef: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('editNameInput');

  /** The open row's destructive confirm button, focused whenever {@link confirmingRemoveId} changes. */
  protected readonly confirmDeleteButtonRef: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('confirmDeleteButton');
  //#endregion

  //#region Constructor
  /**
   * Clears every in-flight draft whenever the dialog closes, and moves focus
   * into the row editor or the destructive confirm button whenever either
   * opens — both replace the button that was focused to reach them.
   */
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

    effect((): void => {
      const editing: string | null = this.editingId();
      const input: ElementRef<HTMLInputElement> | undefined = this.editNameInputRef();

      untracked((): void => {
        if (editing === null) return;

        input?.nativeElement.focus();
      });
    });

    effect((): void => {
      const confirming: string | null = this.confirmingRemoveId();
      const button: ElementRef<HTMLButtonElement> | undefined = this.confirmDeleteButtonRef();

      untracked((): void => {
        if (confirming === null) return;

        button?.nativeElement.focus();
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
   * Method rowAriaLabelOf
   *
   * @description
   * Accessible name for one row action, folding in the label's own name so
   * a screen reader browsing the dialog's control list can tell the
   * otherwise identical Edit/Delete/Save/Cancel entries apart. The `kind`
   * picks the localized verb phrase.
   *
   * @access protected
   * @since 1.1.0
   * @param {'editColor' | 'editName' | 'edit' | 'remove' | 'save' | 'cancelEdit' | 'confirmRemove' | 'keep'} kind - The action named.
   * @param {string} name - The row's label name.
   * @returns {string} The localized accessible name.
   */
  protected rowAriaLabelOf(
    kind:
      | 'editColor'
      | 'editName'
      | 'edit'
      | 'remove'
      | 'save'
      | 'cancelEdit'
      | 'confirmRemove'
      | 'keep',
    name: string,
  ): string {
    switch (kind) {
      case 'editColor':
        return $localize`:@@intervention.labels.manage.colorAria:Color for ${name}:name:`;
      case 'editName':
        return $localize`:@@intervention.labels.manage.nameAria:Name for ${name}:name:`;
      case 'edit':
        return $localize`:@@intervention.labels.manage.editAria:Edit ${name}:name:`;
      case 'remove':
        return $localize`:@@intervention.labels.manage.removeAria:Delete ${name}:name:`;
      case 'save':
        return $localize`:@@intervention.labels.manage.saveAria:Save changes to ${name}:name:`;
      case 'cancelEdit':
        return $localize`:@@intervention.labels.manage.cancelEditAria:Cancel editing ${name}:name:`;
      case 'confirmRemove':
        return $localize`:@@intervention.labels.manage.confirmRemoveAria:Confirm deleting ${name}:name:`;
      case 'keep':
        return $localize`:@@intervention.labels.manage.keepAria:Keep ${name}:name:`;
    }
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

  /**
   * Method colorInputLabelOf
   *
   * @description The open row's color input's accessible name — it carries no visible label of its own.
   * @access protected
   * @since 1.1.0
   * @param {InterventionLabelOutput} label - The row being edited.
   * @returns {string} A localized label naming the row.
   */
  protected colorInputLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.colorInputAria:Color for ${label.name}:name:`;
  }

  /**
   * Method nameInputLabelOf
   *
   * @description The open row's name input's accessible name — it carries no visible label of its own.
   * @access protected
   * @since 1.1.0
   * @param {InterventionLabelOutput} label - The row being edited.
   * @returns {string} A localized label naming the row.
   */
  protected nameInputLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.nameInputAria:Name for ${label.name}:name:`;
  }

  /**
   * Method editActionLabelOf
   *
   * @description A row's Edit button accessible name, naming the row so several rows do not announce identically.
   * @access protected
   * @since 1.1.0
   * @param {InterventionLabelOutput} label - The row the button acts on.
   * @returns {string} A localized action label.
   */
  protected editActionLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.editAria:Edit ${label.name}:name:`;
  }

  /**
   * Method deleteActionLabelOf
   *
   * @description A row's Delete button accessible name, naming the row so several rows do not announce identically.
   * @access protected
   * @since 1.1.0
   * @param {InterventionLabelOutput} label - The row the button acts on.
   * @returns {string} A localized action label.
   */
  protected deleteActionLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.deleteAria:Delete ${label.name}:name:`;
  }

  /**
   * Method saveActionLabelOf
   *
   * @description The open row editor's Save button accessible name, naming the row being saved.
   * @access protected
   * @since 1.1.0
   * @param {InterventionLabelOutput} label - The row being edited.
   * @returns {string} A localized action label.
   */
  protected saveActionLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.saveAria:Save ${label.name}:name:`;
  }

  /**
   * Method cancelEditActionLabelOf
   *
   * @description The open row editor's Cancel button accessible name, naming the row being edited.
   * @access protected
   * @since 1.1.0
   * @param {InterventionLabelOutput} label - The row being edited.
   * @returns {string} A localized action label.
   */
  protected cancelEditActionLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.cancelEditAria:Cancel editing ${label.name}:name:`;
  }

  /**
   * Method confirmDeleteActionLabelOf
   *
   * @description The inline delete confirmation's destructive button accessible name, naming the row it deletes.
   * @access protected
   * @since 1.1.0
   * @param {InterventionLabelOutput} label - The row pending confirmation.
   * @returns {string} A localized action label.
   */
  protected confirmDeleteActionLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.confirmDeleteAria:Confirm deleting ${label.name}:name:`;
  }

  /**
   * Method cancelDeleteActionLabelOf
   *
   * @description The inline delete confirmation's Cancel button accessible name, naming the row it spares.
   * @access protected
   * @since 1.1.0
   * @param {InterventionLabelOutput} label - The row pending confirmation.
   * @returns {string} A localized action label.
   */
  protected cancelDeleteActionLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.cancelDeleteAria:Cancel deleting ${label.name}:name:`;
  }
  //#endregion
}
