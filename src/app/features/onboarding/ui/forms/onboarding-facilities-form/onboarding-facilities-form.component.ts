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
import { form, FormField, required, type FieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMapPin, lucidePlus, lucideX } from '@ng-icons/lucide';
import { ONBOARDING_FACILITY_TYPE_OPTIONS } from '@features/onboarding/options';
import { OnboardingStepFooter } from '@features/onboarding/ui/components';
import type { SetupCreateFacilityInput, SetupFacilityType } from '@features/organization/setup';
import { serverMessagesOf } from '@shared/form-feedback';
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSelectImports } from '@shared/ui/select';
import type { OnboardingFacilityDraft } from './models';

/** Facilities the setup boundary accepts in one onboarding submission. */
const MAX_FACILITIES = 5;

/** A blank draft row. */
const EMPTY_VALUES: OnboardingFacilityDraft = { type: '', name: '', address: '' };

/** Trims a free-text field, sending `undefined` rather than an empty string. */
function trimmed(value: string): string | undefined {
  const trimmedValue: string = value.trim();

  return trimmedValue === '' ? undefined : trimmedValue;
}

/**
 * Component OnboardingFacilitiesForm
 * @class OnboardingFacilitiesForm
 *
 * @description
 * The `create_first_facility` wizard step. It stages up to
 * {@link MAX_FACILITIES} rows locally and emits the whole batch with
 * {@link submitted} when the operator creates them. The fields always hold
 * the next facility: a valid draft is staged automatically on submit, so the
 * common path — one facility — is "fill the fields, create", with "Add
 * another facility" only for a second row. The batch must not be empty (the
 * backend rejects confirming this step with no facility, and does not let it
 * be skipped), so an empty submit marks the draft touched and lets the two
 * required-field errors name what is missing; there is no separate message.
 *
 * No draft row is ever sent to the API on its own — staging is local state,
 * so it never touches a service (`ARCHITECTURE.md` §10.4). The wizard page
 * creates the batch through `@features/organization/setup` and confirms the
 * step via the store.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-onboarding-facilities-form [pending]="isCreating()" (submitted)="createFacilities($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-facilities-form',
  imports: [
    RequiredMarker,
    FormField,
    HlmButton,
    HlmInput,
    NgIcon,
    OnboardingStepFooter,
    ...HlmFieldImports,
    ...HlmItemImports,
    ...HlmSelectImports,
  ],
  providers: [provideIcons({ lucideMapPin, lucidePlus, lucideX })],
  templateUrl: './onboarding-facilities-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingFacilitiesForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether the batch is being created, which locks the controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the creation request failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /**
   * Property skippable
   * @readonly
   * @description Whether the backend currently lets this step be skipped. The backend never does for facilities, but every step form shares the footer contract.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<boolean>}
   */
  public readonly skippable: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the staged batch — never empty — once the operator continues.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<readonly SetupCreateFacilityInput[]>}
   */
  public readonly submitted: OutputEmitterRef<readonly SetupCreateFacilityInput[]> =
    output<readonly SetupCreateFacilityInput[]>();

  /**
   * Property skipped
   * @readonly
   * @description Relays the footer's skip request to the page.
   * @access public
   * @since 1.1.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly skipped: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The currently-edited row. */
  protected readonly model: WritableSignal<OnboardingFacilityDraft> =
    signal<OnboardingFacilityDraft>(EMPTY_VALUES);

  /** Rows already staged for submission. */
  protected readonly staged: WritableSignal<readonly SetupCreateFacilityInput[]> = signal<
    readonly SetupCreateFacilityInput[]
  >([]);

  /**
   * Property draftForm
   * @readonly
   * @description The field tree and its rules for the row being drafted.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<OnboardingFacilityDraft>}
   */
  protected readonly draftForm: FieldTree<OnboardingFacilityDraft> = form(this.model, (path) => {
    required(path.type, {
      message: $localize`:@@onboarding.facilitiesForm.typeRequired:Facility type is required.`,
    });
    required(path.name, {
      message: $localize`:@@onboarding.facilitiesForm.nameRequired:Name is required.`,
    });
  });

  /** The facility types offered. */
  protected readonly typeOptions: typeof ONBOARDING_FACILITY_TYPE_OPTIONS =
    ONBOARDING_FACILITY_TYPE_OPTIONS;

  /** Whether another row may be staged. */
  protected readonly atCapacity: Signal<boolean> = computed<boolean>(
    () => this.staged().length >= MAX_FACILITIES,
  );

  /**
   * Property serverMessages
   * @readonly
   * @description Everything the API said about the rejected batch, as flat lines above the form.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() =>
    serverMessagesOf(
      this.serverError(),
      [],
      $localize`:@@onboarding.facilitiesForm.createFailed:The facilities could not be created.`,
    ),
  );

  /** Names a facility type on the closed select trigger. */
  protected readonly typeLabelOf: (value: SetupFacilityType | '') => string = (value) =>
    this.typeOptions.find((option) => option.value === value)?.label ?? '';

  /**
   * Property stagedRows
   * @readonly
   * @description The staged batch with a "type · address" summary line per row.
   * @access protected
   * @since 1.1.0
   * @type {Signal<readonly { name: string; summary: string }[]>}
   */
  protected readonly stagedRows: Signal<
    readonly { readonly name: string; readonly summary: string }[]
  > = computed(() =>
    this.staged().map((row) => ({
      name: row.name,
      summary: [this.typeLabelOf(row.type), row.address].filter(Boolean).join(' · '),
    })),
  );

  /**
   * Property submitLabel
   * @readonly
   * @description Counts what a submit would create — the staged rows plus a valid draft — and pluralizes the verb accordingly.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly submitLabel: Signal<string> = computed<string>(() => {
    const total: number = this.staged().length + (this.draftForm().invalid() ? 0 : 1);

    return total >= 2
      ? $localize`:@@onboarding.facilitiesForm.submitMany:Create facilities`
      : $localize`:@@onboarding.facilitiesForm.submitOne:Create facility`;
  });

  /** The footer's label while the batch is being created. */
  protected readonly pendingLabel: string = $localize`:@@onboarding.facilitiesForm.submitting:Saving…`;
  //#endregion

  //#region Methods
  /**
   * Method addFacility
   *
   * @description
   * Stages the current row and resets the draft. Disabled from the template
   * whenever the row is invalid or the batch is already at capacity, so no
   * error state ever needs to be cleared afterward.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected addFacility(): void {
    if (this.draftForm().invalid() || this.atCapacity()) return;

    const draft: OnboardingFacilityDraft = this.model();
    if (draft.type === '') return;

    const type: SetupFacilityType = draft.type;
    const name: string = draft.name.trim();
    const address: string | undefined = trimmed(draft.address);

    this.staged.update((rows) => [...rows, { type, name, address }]);
    this.model.set(EMPTY_VALUES);
  }

  /**
   * Method removeFacilityLabel
   *
   * @description Names one staged row's remove button after the row itself,
   * so several "Remove" buttons stay distinguishable to assistive technology.
   *
   * @access protected
   * @since 1.0.0
   * @param {string} name - The staged row's name.
   * @returns {string} The localized accessible name.
   */
  protected removeFacilityLabel(name: string): string {
    return $localize`:@@onboarding.facilitiesForm.removeNamed:Remove ${name}:name:`;
  }

  /**
   * Method removeFacility
   *
   * @description
   * Drops a staged row before submission.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} index - Position of the row to remove.
   *
   * @returns {void}
   */
  protected removeFacility(index: number): void {
    this.staged.update((rows) => rows.filter((_, i) => i !== index));
  }

  /**
   * Method submit
   *
   * @description
   * Stages the current row first when it is valid, then emits the batch. An
   * empty batch is never emitted — the backend rejects the step without a
   * facility — so with nothing staged the draft is marked touched and its
   * required-field errors name what is missing.
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

    if (!this.draftForm().invalid()) {
      this.addFacility();
    } else if (
      this.staged().length === 0 ||
      this.model().type !== '' ||
      this.model().name.trim() !== ''
    ) {
      this.draftForm().markAsTouched();
      return;
    }

    this.submitted.emit(this.staged());
  }
  //#endregion
}
