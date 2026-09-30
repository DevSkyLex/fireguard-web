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
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucidePencil,
  lucidePlus,
  lucideTag,
  lucideTrash2,
  lucideX,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { InterventionLabelOutput } from '@features/organization/features/interventions/models';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSeparator } from '@shared/ui/separator';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Interface InterventionLabelUpdateSubmittedEvent
 * @interface InterventionLabelUpdateSubmittedEvent
 *
 * @description
 * Carries the edited identifier, name, and color emitted for an intervention label.
 */
export interface InterventionLabelUpdateSubmittedEvent {
  /**
   * Property labelId
   * @readonly
   *
   * @description
   * Identifies the label associated with this intervention label update submitted event.
   *
   * @access public
   *
   * @type {string}
   */
  readonly labelId: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Provides the display name of this intervention label update submitted event.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property color
   * @readonly
   *
   * @description
   * Provides the label color selected in the form.
   *
   * @access public
   *
   * @type {string}
   */
  readonly color: string;
}

/**
 * Interface InterventionLabelCreateSubmittedEvent
 * @interface InterventionLabelCreateSubmittedEvent
 *
 * @description
 * Carries the name and color emitted when a new intervention label is submitted.
 */
export interface InterventionLabelCreateSubmittedEvent {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Provides the display name of this intervention label create submitted event.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property color
   * @readonly
   *
   * @description
   * Provides the label color selected in the form.
   *
   * @access public
   *
   * @type {string}
   */
  readonly color: string;
}

/**
 * Constant DEFAULT_LABEL_COLOR
 *
 * @description
 * A literal hex because a label's colour is the operator's data, not a theme
 * token: the API stores whatever they pick and the picker is a native
 * `<input type="color">`, which cannot be seeded from a CSS variable. It is
 * therefore not a chromatic accent re-entering the interface, and it is not a
 * chart slot being borrowed — it is a starting value the operator overwrites.
 */
const DEFAULT_LABEL_COLOR = '#3b82f6';

/**
 * Class InterventionLabelManageDialog
 * @class InterventionLabelManageDialog
 *
 * @description
 * The organization's intervention label catalog, opened from wherever a
 * label is picked (`app-intervention-properties-grid`'s labels field today).
 * A Spartan field set creates labels, while a scrollable item group lists
 * each existing label with inline rename/recolor and delete confirmation
 * states. The dialog stays usable within the viewport as the catalog grows.
 * Purely presentational (`ARCHITECTURE.md` §10.5): it owns no store and
 * takes its open state from {@link open}. Each row's edit draft and the
 * create form's draft are this dialog's own state; the caller owns every
 * write and decides what to dispatch from {@link created}/{@link updated}/
 * {@link removed}.
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
  imports: [
    NgIcon,
    HlmButton,
    ...HlmDialogImports,
    ...HlmEmptyImports,
    ...HlmFieldImports,
    HlmInput,
    ...HlmItemImports,
    HlmSeparator,
    HlmSpinner,
  ],
  providers: [
    provideIcons({ lucideCheck, lucidePencil, lucidePlus, lucideTag, lucideTrash2, lucideX }),
  ],
  templateUrl: './intervention-label-manage-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionLabelManageDialog {
  //#region Inputs
  /**
   * Property open
   * @readonly
   *
   * @description
   * Controls whether the label manager is visible.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly open: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property labels
   * @readonly
   *
   * @description
   * Supplies the labels currently available for the intervention.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly InterventionLabelOutput[]>}
   */
  public readonly labels: InputSignal<readonly InterventionLabelOutput[]> = input<
    readonly InterventionLabelOutput[]
  >([]);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Indicates whether the label collection is loading.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property creating
   * @readonly
   *
   * @description
   * Indicates whether a new label is being created.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly creating: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property savingId
   * @readonly
   *
   * @description
   * Identifies the label currently being saved.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly savingId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property removingId
   * @readonly
   *
   * @description
   * Identifies the label currently being removed.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly removingId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property createError
   * @readonly
   *
   * @description
   * Holds the latest error returned while creating a label.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly createError: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property closed
   * @readonly
   *
   * @description
   * Emits when the label manager closes.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly closed: OutputEmitterRef<void> = output<void>();

  /**
   * Property created
   * @readonly
   *
   * @description
   * Emits the submitted name and color for a new label.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<InterventionLabelCreateSubmittedEvent>}
   */
  public readonly created: OutputEmitterRef<InterventionLabelCreateSubmittedEvent> =
    output<InterventionLabelCreateSubmittedEvent>();

  /**
   * Property updated
   * @readonly
   *
   * @description
   * Emits the submitted changes for an existing label.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<InterventionLabelUpdateSubmittedEvent>}
   */
  public readonly updated: OutputEmitterRef<InterventionLabelUpdateSubmittedEvent> =
    output<InterventionLabelUpdateSubmittedEvent>();

  /**
   * Property removed
   * @readonly
   *
   * @description
   * Emits the identifier of the label confirmed for removal.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly removed: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property dialogState
   * @readonly
   *
   * @description
   * Reflects the open input as the native dialog state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.open() ? 'open' : 'closed',
  );

  /**
   * Property draftName
   * @readonly
   *
   * @description
   * Holds the unsaved name for a new label.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly draftName: WritableSignal<string> = signal<string>('');

  /**
   * Property draftColor
   * @readonly
   *
   * @description
   * Holds the selected color for a new label.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly draftColor: WritableSignal<string> = signal<string>(DEFAULT_LABEL_COLOR);

  /**
   * Property editingId
   * @readonly
   *
   * @description
   * Identifies the label whose inline editor is open.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly editingId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property confirmingRemoveId
   * @readonly
   *
   * @description
   * Identifies the label awaiting explicit removal confirmation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly confirmingRemoveId: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /**
   * Property editName
   * @readonly
   *
   * @description
   * Holds the edited name for the active label.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly editName: WritableSignal<string> = signal<string>('');

  /**
   * Property editColor
   * @readonly
   *
   * @description
   * Holds the edited color for the active label.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly editColor: WritableSignal<string> = signal<string>(DEFAULT_LABEL_COLOR);

  /**
   * Property canCreate
   * @readonly
   *
   * @description
   * Enables creation only when a nonblank name is present and no create is running.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canCreate: Signal<boolean> = computed<boolean>(
    () => !this.creating() && this.draftName().trim().length > 0,
  );

  /**
   * Property editNameInputRef
   * @readonly
   *
   * @description
   * References the active inline name input for focus restoration.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ElementRef<HTMLInputElement> | undefined>}
   */
  protected readonly editNameInputRef: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('editNameInput');

  /**
   * Property confirmDeleteButtonRef
   * @readonly
   *
   * @description
   * References the destructive confirmation button for focus management.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  protected readonly confirmDeleteButtonRef: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('confirmDeleteButton');
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * into the row editor or the destructive confirm button whenever either
   * opens — both replace the button that was focused to reach them.
   *
   * @access public
   * @since unreleased
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
      const nameInput: ElementRef<HTMLInputElement> | undefined = this.editNameInputRef();

      untracked((): void => {
        if (editing === null) return;

        nameInput?.nativeElement.focus();
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
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal — Escape or the backdrop.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The dialog's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.closed.emit();
  }

  /**
   * Method rowAriaLabelOf
   * @method rowAriaLabelOf
   *
   * @description
   * Accessible name for one row action, folding in the label's own name so
   * a screen reader browsing the dialog's control list can tell the
   * otherwise identical Edit/Delete/Save/Cancel entries apart. The `kind`
   * picks the localized verb phrase.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {'editColor'
   *   | 'editName'
   *   | 'edit'
   *   | 'remove'
   *   | 'save'
   *   | 'cancelEdit'
   *   | 'confirmRemove'
   *   | 'keep'} kind
   *   - The action named.
   * @param {string} name - The row's label name.
   *
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
   * @method submitCreate
   *
   * @description
   * Emits {@link created} for the drafted name/color, then clears the form.
   *
   * @access protected
   * @since 1.0.0
   *
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
   * @method startEdit
   *
   * @description
   * Opens a row's inline editor, seeded from its stored values.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionLabelOutput} label - The row to edit.
   *
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
   * @method cancelEdit
   *
   * @description
   * Closes the open row editor without submitting.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected cancelEdit(): void {
    this.editingId.set(null);
  }

  /**
   * Method submitEdit
   * @method submitEdit
   *
   * @description
   * Emits {@link updated} for the open row's draft, then closes its editor.
   *
   * @access protected
   * @since 1.0.0
   *
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
   * @method requestRemove
   *
   * @description
   * Opens a row's inline delete confirmation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} labelId - The row to confirm.
   *
   * @returns {void}
   */
  protected requestRemove(labelId: string): void {
    this.editingId.set(null);
    this.confirmingRemoveId.set(labelId);
  }

  /**
   * Method confirmRemove
   * @method confirmRemove
   *
   * @description
   * Emits {@link removed} for the confirmed row, then closes the confirmation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} labelId - The confirmed row.
   *
   * @returns {void}
   */
  protected confirmRemove(labelId: string): void {
    this.confirmingRemoveId.set(null);
    this.removed.emit(labelId);
  }

  /**
   * Method colorInputLabelOf
   * @method colorInputLabelOf
   *
   * @description
   * The open row's color input's accessible name — it carries no visible label of its own.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InterventionLabelOutput} label - The row being edited.
   *
   * @returns {string} A localized label naming the row.
   */
  protected colorInputLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.colorInputAria:Color for ${label.name}:name:`;
  }

  /**
   * Method nameInputLabelOf
   * @method nameInputLabelOf
   *
   * @description
   * The open row's name input's accessible name — it carries no visible label of its own.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InterventionLabelOutput} label - The row being edited.
   *
   * @returns {string} A localized label naming the row.
   */
  protected nameInputLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.nameInputAria:Name for ${label.name}:name:`;
  }

  /**
   * Method editActionLabelOf
   * @method editActionLabelOf
   *
   * @description
   * A row's Edit button accessible name, naming the row so several rows do not announce
   * identically.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InterventionLabelOutput} label - The row the button acts on.
   *
   * @returns {string} A localized action label.
   */
  protected editActionLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.editAria:Edit ${label.name}:name:`;
  }

  /**
   * Method deleteActionLabelOf
   * @method deleteActionLabelOf
   *
   * @description
   * A row's Delete button accessible name, naming the row so several rows do not announce
   * identically.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InterventionLabelOutput} label - The row the button acts on.
   *
   * @returns {string} A localized action label.
   */
  protected deleteActionLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.deleteAria:Delete ${label.name}:name:`;
  }

  /**
   * Method saveActionLabelOf
   * @method saveActionLabelOf
   *
   * @description
   * The open row editor's Save button accessible name, naming the row being saved.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InterventionLabelOutput} label - The row being edited.
   *
   * @returns {string} A localized action label.
   */
  protected saveActionLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.saveAria:Save changes to ${label.name}:name:`;
  }

  /**
   * Method cancelEditActionLabelOf
   * @method cancelEditActionLabelOf
   *
   * @description
   * The open row editor's Cancel button accessible name, naming the row being edited.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InterventionLabelOutput} label - The row being edited.
   *
   * @returns {string} A localized action label.
   */
  protected cancelEditActionLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.cancelEditAria:Cancel editing ${label.name}:name:`;
  }

  /**
   * Method confirmDeleteActionLabelOf
   * @method confirmDeleteActionLabelOf
   *
   * @description
   * The inline delete confirmation's destructive button accessible name, naming the row it deletes.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InterventionLabelOutput} label - The row pending confirmation.
   *
   * @returns {string} A localized action label.
   */
  protected confirmDeleteActionLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.confirmDeleteAria:Confirm deleting ${label.name}:name:`;
  }

  /**
   * Method cancelDeleteActionLabelOf
   * @method cancelDeleteActionLabelOf
   *
   * @description
   * The inline delete confirmation's Cancel button accessible name, naming the row it spares.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {InterventionLabelOutput} label - The row pending confirmation.
   *
   * @returns {string} A localized action label.
   */
  protected cancelDeleteActionLabelOf(label: InterventionLabelOutput): string {
    return $localize`:@@intervention.labels.manage.cancelDeleteAria:Cancel deleting ${label.name}:name:`;
  }
  //#endregion
}
