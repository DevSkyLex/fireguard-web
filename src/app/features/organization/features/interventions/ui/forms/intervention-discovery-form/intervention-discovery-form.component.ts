import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormGroup,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { map } from 'rxjs';
import type { InspectionResult } from '@features/organization/features/inspections/models';
import type {
  InterventionWorkItemAction,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { toServerFieldErrors, toUnmatchedViolations, type ServerFieldErrors } from '@shared/utils';
import { InterventionOption } from '../../components/intervention-option';
import type { InterventionDiscoveryFormData, InterventionDiscoveryFormValues } from './models';

/**
 * Component InterventionDiscoveryForm
 * @class InterventionDiscoveryForm
 *
 * @description
 * Presentational form used to record work discovered in the field.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-discovery-form',
  imports: [
    ButtonModule,
    InputTextModule,
    InterventionOption,
    MessageModule,
    ReactiveFormsModule,
    SelectModule,
  ],
  templateUrl: './intervention-discovery-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionDiscoveryForm {
  //#region Inputs
  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether a discovery submission is in flight; disables all form controls.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input serverError
   * @input
   *
   * @description
   * Last rejection from the parent page, as held by the store's call state.
   *
   * A 422 names the field the server refused; projecting it tells the user which
   * one to fix instead of leaving them with a generic toast.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);

  /** Server message per field, projected from the last 422. */
  protected readonly serverFieldErrors: Signal<ServerFieldErrors> = computed(() =>
    toServerFieldErrors(this.serverError()),
  );

  /** Message of the first violation naming no field of this form. */
  protected readonly unmatchedViolation: Signal<string | null> = computed(
    () =>
      toUnmatchedViolations(this.serverError(), ['action', 'target', 'result'])[0]?.message ?? null,
  );

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether discovery entry is forbidden for the current user or context.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property equipmentTypeOptions
   * @readonly
   *
   * @description
   * Valid equipment type choices (from the backend) offered when recording an
   * `inventory` discovery, so the submitted value is always an accepted choice.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly equipmentTypeOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits validated, normalized discovery values when the form is
   * submitted successfully.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionDiscoveryFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionDiscoveryFormValues> =
    output<InterventionDiscoveryFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property formBuilder
   * @readonly
   *
   * @description
   * Builds the typed reactive form controls.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {NonNullableFormBuilder}
   */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /**
   * Property form
   * @readonly
   *
   * @description
   * Reactive form group holding all field discovery controls.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<InterventionDiscoveryFormData>}
   */
  protected readonly form: FormGroup<InterventionDiscoveryFormData> =
    this.formBuilder.group<InterventionDiscoveryFormData>({
      action: this.formBuilder.control<InterventionWorkItemAction>('inventory'),
      target: this.formBuilder.control('', [Validators.required]),
      result: this.formBuilder.control<InspectionResult>('pass'),
    });

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Whether the form holds unsaved user edits, exposed so the host drawer
   * can guard accidental dismissal (Esc, backdrop) against data loss.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  public readonly dirty = toSignal(this.form.events.pipe(map((): boolean => this.form.dirty)), {
    initialValue: false,
  });

  /**
   * Property actionOptions
   * @readonly
   *
   * @description
   * Static list of available discovery actions for the action selector.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SelectOption<InterventionWorkItemAction>[]}
   */
  protected readonly actionOptions: readonly SelectOption<InterventionWorkItemAction>[] = [
    { label: $localize`:@@intervention.action.siteSetup:Site setup`, value: 'site_setup' },
    { label: $localize`:@@intervention.action.inventory:Inventory`, value: 'inventory' },
    { label: $localize`:@@intervention.action.inspection:Inspection`, value: 'inspection' },
  ];

  /**
   * Property resultOptions
   * @readonly
   *
   * @description
   * Static list of available inspection result options for the result selector.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly SelectOption<InspectionResult>[]}
   */
  protected readonly resultOptions: readonly SelectOption<InspectionResult>[] = [
    { label: $localize`:@@inspectionResult.pass:Pass`, value: 'pass' },
    { label: $localize`:@@inspectionResult.partial:Partial`, value: 'partial' },
    { label: $localize`:@@inspectionResult.fail:Fail`, value: 'fail' },
  ];

  /** Localized label for the target field, varying with the selected action. */
  protected get targetLabel(): () => string {
    return (): string => {
      switch (this.form.controls.action.value) {
        case 'site_setup':
          return $localize`:@@intervention.df.targetFacility:Facility name`;
        case 'inventory':
          return $localize`:@@intervention.df.targetEquipType:Equipment type`;
        default:
          return $localize`:@@intervention.df.targetEquipResource:Equipment resource`;
      }
    };
  }

  /** Localized placeholder for the free-text target input. */
  protected get targetInputPlaceholder(): () => string {
    return (): string =>
      this.form.controls.action.value === 'site_setup'
        ? $localize`:@@intervention.df.targetSitePlaceholder:Example: Electrical room`
        : $localize`:@@intervention.df.targetEquipPlaceholder:Example: Extinguisher #A-12`;
  }

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Synchronizes the form disabled state with the {@link loading} and
   * {@link disabled} inputs.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      if (this.loading() || this.disabled()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  //#endregion

  //#region Methods
  /**
   * Method onSubmit
   * @method onSubmit
   *
   * @description
   * Validates the form, normalizes the target value, emits the discovery
   * payload via {@link submitted} and resets the form for re-use. Marks
   * all controls as touched to surface validation errors when invalid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.form.invalid || this.loading() || this.disabled()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit({
      ...this.form.getRawValue(),
      target: this.form.controls.target.value.trim(),
    });
    // Deliberately no reset here: the outcome is not known yet. Clearing on emit
    // meant a rejected submit — or a dropped connection in the field — wiped what
    // the user typed. The drawer is destroyed when it closes, so the next open
    // starts from a fresh form anyway.
  }
  //#endregion
}
