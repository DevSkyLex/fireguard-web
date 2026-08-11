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
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import { ONBOARDING_FACILITY_TYPE_OPTIONS } from '@features/onboarding/options';
import type { SetupCreateFacilityInput, SetupFacilityType } from '@features/organization/setup';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
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
 * The `create_first_facility` wizard step. Unlike the single-resource steps,
 * it stages up to {@link MAX_FACILITIES} rows locally — one small form adds a
 * row at a time — and emits the whole batch with {@link submitted} only when
 * the operator continues, matching the step's own copy ("up to 5 at once").
 * The list may also be empty: the step is skippable, and continuing with
 * nothing staged submits an empty batch rather than requiring a separate
 * skip affordance in the form itself.
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
  imports: [FormField, HlmButton, HlmInput, ...HlmFieldImports, ...HlmSelectImports],
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
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the staged batch — possibly empty — once the operator continues.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<readonly SetupCreateFacilityInput[]>}
   */
  public readonly submitted: OutputEmitterRef<readonly SetupCreateFacilityInput[]> =
    output<readonly SetupCreateFacilityInput[]>();
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
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const error: unknown = this.serverError();

    if (error === null || error === undefined) return [];

    const combined: readonly string[] = [
      ...new Set([
        ...Object.values(toServerFieldErrors(error)),
        ...toUnmatchedViolations(error, []).map((v: Violation): string => v.message),
      ]),
    ];

    return combined.length > 0
      ? combined
      : [$localize`:@@onboarding.facilitiesForm.createFailed:The facilities could not be created.`];
  });

  /** Names a facility type on the closed select trigger. */
  protected readonly typeLabelOf: (value: SetupFacilityType | '') => string = (value) =>
    this.typeOptions.find((option) => option.value === value)?.label ?? '';
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
   * Emits the staged batch as-is — an empty batch is a valid continue, since
   * this step is skippable.
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

    this.submitted.emit(this.staged());
  }
  //#endregion
}
