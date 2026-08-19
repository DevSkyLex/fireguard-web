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
import type { StoreError } from '@core/request-state';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments';
import type { GenerateMaintenanceCampaignInput } from '@features/organization/features/maintenance-schedules/models';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import type { MaintenanceCampaignDraft } from './models';

/** The select's value for "every facility"/"every equipment type" — no narrowing. */
const NO_SCOPE_VALUE: string = '';

/** A blank draft. */
const EMPTY_DRAFT: MaintenanceCampaignDraft = {
  name: '',
  dueBefore: '',
  facility: NO_SCOPE_VALUE,
  equipmentType: NO_SCOPE_VALUE,
};

/** How long a campaign name may be, mirroring the backend's `Assert\Length` constraint. */
const NAME_MAX_LENGTH: number = 160;

/**
 * Component MaintenanceCampaignDialog
 * @class MaintenanceCampaignDialog
 *
 * @description
 * The spartan dialog that generates an inspection campaign from the
 * schedules currently due: a name, a required `dueBefore` date, and optional
 * facility/equipment-type scoping. The backend's documented 422 — the scope
 * matched zero due schedules — is rendered inline from {@link serverError}
 * rather than as a generic toast (`ARCHITECTURE.md` API contract), keeping
 * the dialog open so the operator can widen the scope and retry.
 *
 * Owns the overlay and the Signal Forms draft only; the page keeps the store
 * call, the success toast/navigation and the organization IRI, which this
 * dialog never needs to know (`ARCHITECTURE.md` §10.5).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-maintenance-campaign-dialog',
  imports: [
    FormField,
    HlmButton,
    HlmInput,
    ...HlmDialogImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
  ],
  templateUrl: './maintenance-campaign-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceCampaignDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether the campaign-generation request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the last generation attempt failed with, including the documented no-match 422.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property facilityOptions
   * @readonly
   * @description The organization's facilities, offered as the optional scoping choice.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<{ readonly label: string; readonly value: string }>>}
   */
  public readonly facilityOptions: InputSignal<
    ReadonlyArray<{ readonly label: string; readonly value: string }>
  > = input<ReadonlyArray<{ readonly label: string; readonly value: string }>>([]);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description The dialog wants to open or close.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   * @description The validated scope, minus the organization IRI the page folds in.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<Omit<GenerateMaintenanceCampaignInput, 'organization'>>}
   */
  public readonly submitted: OutputEmitterRef<
    Omit<GenerateMaintenanceCampaignInput, 'organization'>
  > = output<Omit<GenerateMaintenanceCampaignInput, 'organization'>>();
  //#endregion

  //#region Properties
  /** The equipment-type choices offered, reused from the equipments feature's public catalog. */
  protected readonly equipmentTypeOptions: typeof EQUIPMENT_TYPE_OPTIONS = EQUIPMENT_TYPE_OPTIONS;

  /** The sentinel value representing "no facility/equipment-type narrowing". */
  protected readonly noScopeValue: string = NO_SCOPE_VALUE;

  /** The edited draft. */
  protected readonly model: WritableSignal<MaintenanceCampaignDraft> =
    signal<MaintenanceCampaignDraft>(EMPTY_DRAFT);

  /**
   * Property campaignForm
   * @readonly
   * @description The field tree and its rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<MaintenanceCampaignDraft>}
   */
  protected readonly campaignForm: FieldTree<MaintenanceCampaignDraft> = form(
    this.model,
    (path) => {
      required(path.name, {
        message: $localize`:@@maintenance.campaignDialog.nameRequired:Name is required.`,
      });
      minLength(path.name, 2, {
        message: $localize`:@@maintenance.campaignDialog.nameTooShort:Enter at least 2 characters.`,
      });
      maxLength(path.name, NAME_MAX_LENGTH, {
        message: $localize`:@@maintenance.campaignDialog.nameTooLong:This name is too long.`,
      });
      required(path.dueBefore, {
        message: $localize`:@@maintenance.campaignDialog.dueBeforeRequired:A due-before date is required.`,
      });
    },
  );

  /**
   * Property dialogState
   * @readonly
   * @description The overlay state, derived from {@link visible} so there is no second copy of the truth.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property serverMessage
   * @readonly
   * @description The last failed attempt's message, including the documented no-match 422 — `null` when there is nothing to show.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string | null>}
   */
  protected readonly serverMessage: Signal<string | null> = computed<string | null>(() => {
    const error: StoreError | null = this.serverError();

    return (
      error?.message ??
      (error
        ? $localize`:@@maintenance.campaignDialog.genericError:The campaign could not be generated.`
        : null)
    );
  });
  //#endregion

  //#region Methods
  /**
   * Method facilityLabelOf
   * @description Names a facility value on the closed select trigger, including the sentinel "every facility" entry.
   * @access protected
   * @since 1.0.0
   * @param {string} value - The select's current value.
   * @returns {string} The localized label.
   */
  protected facilityLabelOf = (value: string): string => {
    if (value === NO_SCOPE_VALUE) {
      return $localize`:@@maintenance.campaignDialog.everyFacility:Every facility`;
    }

    return this.facilityOptions().find((option) => option.value === value)?.label ?? value;
  };

  /**
   * Method equipmentTypeLabelOf
   * @description Names an equipment-type value on the closed select trigger, including the sentinel "every type" entry.
   * @access protected
   * @since 1.0.0
   * @param {string} value - The select's current value.
   * @returns {string} The localized label.
   */
  protected equipmentTypeLabelOf = (value: string): string => {
    if (value === NO_SCOPE_VALUE) {
      return $localize`:@@maintenance.campaignDialog.everyType:Every type`;
    }

    return this.equipmentTypeOptions.find((option) => option.value === value)?.label ?? value;
  };

  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal — escape, the backdrop, the close button — ignoring
   * the echo of a change the page already made.
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
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once, then emits the
   * API-shaped scope once the form is valid, converting the picked date to
   * an ISO-8601 datetime at end of the selected local day and the sentinel
   * empty strings to `undefined`.
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

    this.campaignForm().markAsTouched();

    if (this.campaignForm().invalid()) return;

    const draft: MaintenanceCampaignDraft = this.model();

    this.submitted.emit({
      name: draft.name.trim(),
      dueBefore: new Date(`${draft.dueBefore}T23:59:59`).toISOString(),
      facility: draft.facility === NO_SCOPE_VALUE ? undefined : draft.facility,
      equipmentType: draft.equipmentType === NO_SCOPE_VALUE ? undefined : draft.equipmentType,
    });
  }
  //#endregion
}
