import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { disabled, form, FormField, required, type FieldTree } from '@angular/forms/signals';
import type { CallState } from '@core/request-state';
import { idleCallState } from '@core/request-state';
import type {
  CreateEquipmentInput,
  EquipmentOutput,
  ReplacementEquipmentInput,
} from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import { buildEquipmentTitle } from '@features/organization/features/equipments/utils';
import { sheetSide } from '@shared/sheet-side';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSheet, HlmSheetImports } from '@shared/ui/sheet';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import { EquipmentCreateForm } from '../../forms/equipment-create-form';

/**
 * Class EquipmentReplacementSheet
 * @class EquipmentReplacementSheet
 *
 * @description
 * Confirms a terminal equipment replacement using a reserve item or a newly registered successor.
 */
@Component({
  selector: 'app-equipment-replacement-sheet',
  imports: [
    FormField,
    HlmButton,
    EquipmentCreateForm,
    UnsavedChangesDialog,
    ...HlmComboboxImports,
    ...HlmFieldImports,
    ...HlmSheetImports,
    ...HlmToggleGroupImports,
  ],
  templateUrl: './equipment-replacement-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentReplacementSheet {
  //#region Properties
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the owning page displays the replacement sheet.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input(false);

  /**
   * Property equipmentName
   * @readonly
   *
   * @description
   * Historical equipment title included in the confirmation.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly equipmentName: InputSignal<string> = input('');

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Locks dismissal while the replacement transaction is pending.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property uncertain
   * @readonly
   *
   * @description
   * Locks editing when a request may already have been accepted.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly uncertain: InputSignal<boolean> = input(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Last recoverable command rejection shown without dropping the draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property candidates
   * @readonly
   *
   * @description
   * Server page of eligible reserve equipment.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly EquipmentOutput[]>}
   */
  public readonly candidates: InputSignal<readonly EquipmentOutput[]> = input<
    readonly EquipmentOutput[]
  >([]);

  /**
   * Property candidateCallState
   * @readonly
   *
   * @description
   * Candidate loading and retry state.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CallState>}
   */
  public readonly candidateCallState: InputSignal<CallState> = input<CallState>(idleCallState());

  /**
   * Property page
   * @readonly
   *
   * @description
   * Displayed server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly page: InputSignal<number> = input(1);

  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * Total candidate pages.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly pageCount: InputSignal<number> = input(1);

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Active server catalog for the new successor.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<typeof EQUIPMENT_TYPE_OPTIONS>}
   */
  public readonly typeOptions: InputSignal<typeof EQUIPMENT_TYPE_OPTIONS> = input<
    typeof EQUIPMENT_TYPE_OPTIONS
  >([]);

  /**
   * Property visibleChange
   * @readonly
   *
   * @description
   * Requests sheet dismissal.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property existingSelected
   * @readonly
   *
   * @description
   * Confirmed reserve successor identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly existingSelected: OutputEmitterRef<string> = output<string>();

  /**
   * Property newSubmitted
   * @readonly
   *
   * @description
   * Confirmed new successor identity created in the replacement transaction.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<ReplacementEquipmentInput>}
   */
  public readonly newSubmitted: OutputEmitterRef<ReplacementEquipmentInput> =
    output<ReplacementEquipmentInput>();

  /**
   * Property retried
   * @readonly
   *
   * @description
   * Replays the retained immutable command after a network uncertainty.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retried: OutputEmitterRef<void> = output<void>();

  /**
   * Property searchChanged
   * @readonly
   *
   * @description
   * Server candidate search request.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly searchChanged: OutputEmitterRef<string> = output<string>();

  /**
   * Property pageChanged
   * @readonly
   *
   * @description
   * Candidate page request.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property side
   * @readonly
   *
   * @description
   * Adaptive sheet orientation from interaction capabilities.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property mode
   * @readonly
   *
   * @description
   * Choice between reserve equipment and a new successor.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly mode: WritableSignal<string> = signal('existing');

  /**
   * Property newDraftDirty
   * @readonly
   *
   * @description
   * Preserves the new successor's unsaved-change state across mode changes.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly newDraftDirty: WritableSignal<boolean> = signal(false);

  /**
   * Property unsavedState
   * @readonly
   *
   * @description
   * Discard confirmation for unsaved replacement drafts.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<'open' | 'closed'>}
   */
  protected readonly unsavedState: WritableSignal<'open' | 'closed'> = signal<'open' | 'closed'>(
    'closed',
  );

  /**
   * Property sheetRef
   * @readonly
   *
   * @description
   * Native sheet reference used to undo an accidental draft dismissal.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<HlmSheet | undefined>}
   */
  protected readonly sheetRef: Signal<HlmSheet | undefined> = viewChild(HlmSheet);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Selected reserve identity.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<{ successorEquipmentId: string }>}
   */
  protected readonly model: WritableSignal<{ successorEquipmentId: string }> = signal({
    successorEquipmentId: '',
  });

  /**
   * Property selectionForm
   * @readonly
   *
   * @description
   * Required stable successor identity for reserve replacements.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<{ successorEquipmentId: string }>}
   */
  protected readonly selectionForm: FieldTree<{ successorEquipmentId: string }> = form(
    this.model,
    (path) => {
      required(path.successorEquipmentId, {
        message: $localize`:@@equipment.replacement.required:Select the successor equipment.`,
      });
      disabled(path, { when: () => this.pending() || this.uncertain() });
    },
  );

  /**
   * Property selectedLabels
   * @readonly
   *
   * @description
   * Resolves the selected candidate label outside the current server page.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Map<string, string>}
   */
  protected readonly selectedLabels: Map<string, string> = new Map<string, string>();

  /**
   * Property labelOf
   * @readonly
   *
   * @description
   * Equipment identity displayed by the native combobox.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly labelOf: (value: string) => string = (value) => {
    const candidate = this.candidates().find((item) => item.id === value);
    return this.selectedLabels.get(value) ?? (candidate ? buildEquipmentTitle(candidate) : value);
  };

  /**
   * Property remoteFilter
   * @readonly
   *
   * @description
   * Candidate filtering is performed by the server.
   *
   * @access protected
   * @since unreleased
   *
   * @type {() => boolean}
   */
  protected readonly remoteFilter: () => boolean = () => true;
  //#endregion

  //#region Methods
  /**
   * Method close
   * @method close
   *
   * @description
   * Confirms dismissal before discarding either replacement draft.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result of the operation.
   */
  protected close(): void {
    if (this.pending()) return;
    if (!this.uncertain() && (this.newDraftDirty() || this.selectionForm().dirty())) {
      this.unsavedState.set('open');
      return;
    }
    this.visibleChange.emit(false);
  }

  /**
   * Method stateChanged
   * @method stateChanged
   *
   * @description
   * Preserves native focus and Escape behavior while protecting the draft.
   *
   * @access protected
   * @since unreleased
   *
   * @param {'open' | 'closed'} state - state.
   *
   * @returns {void} Result of the operation.
   */
  protected stateChanged(state: 'open' | 'closed'): void {
    if (state === 'open' || !this.visible()) return;
    if (!this.uncertain() && (this.newDraftDirty() || this.selectionForm().dirty()))
      this.sheetRef()?.open();
    this.close();
  }

  /**
   * Method discard
   * @method discard
   *
   * @description
   * Closes the draft after the operator explicitly accepted its loss.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result of the operation.
   */
  protected discard(): void {
    this.unsavedState.set('closed');
    this.visibleChange.emit(false);
  }
  /**
   * Method pick
   * @method pick
   *
   * @description
   * Keeps the selected label visible while changing search pages.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string | null | undefined} value - value.
   *
   * @returns {void} Result of the operation.
   */
  protected pick(value: string | null | undefined): void {
    if (!value) return;
    const candidate = this.candidates().find((item) => item.id === value);
    if (candidate) this.selectedLabels.set(value, buildEquipmentTitle(candidate));
  }

  /**
   * Method submitExisting
   * @method submitExisting
   *
   * @description
   * Confirms the terminal replacement only after successor selection.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - event.
   *
   * @returns {void} Result of the operation.
   */
  protected submitExisting(event: Event): void {
    event.preventDefault();
    this.selectionForm().markAsTouched();
    if (this.pending() || this.uncertain() || this.selectionForm().invalid()) return;
    this.existingSelected.emit(this.model().successorEquipmentId);
  }

  /**
   * Method submitNew
   * @method submitNew
   *
   * @description
   * Drops contextual relations; the server inherits placement from the old equipment.
   *
   * @access protected
   * @since unreleased
   *
   * @param {CreateEquipmentInput} payload - New successor identity supplied by the form.
   *
   * @returns {void} Result of the operation.
   */
  protected submitNew(payload: CreateEquipmentInput): void {
    const { type, name, assetCode, subType, brand, model, serialNumber, locationLabel } = payload;
    this.newSubmitted.emit({
      type,
      name,
      assetCode,
      subType,
      brand,
      model,
      serialNumber,
      locationLabel,
    });
  }
  //#endregion
}
