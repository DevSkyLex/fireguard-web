import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, max, min, type FieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlarmSmoke,
  lucideBox,
  lucideCalendarClock,
  lucideCalendarDays,
  lucideCalendarRange,
  lucideCctv,
  lucideCircleAlert,
  lucideCircleDotDashed,
  lucideDoorClosed,
  lucideDroplet,
  lucideDroplets,
  lucideFingerprint,
  lucideFireExtinguisher,
  lucideGauge,
  lucideLightbulb,
  lucideOctagonAlert,
  lucideSiren,
  lucideThermometer,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments';
import type { OrganizationComplianceSettings } from '@features/organization/models';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmInputGroupImports } from '@shared/ui/input-group';
import { HlmSelectImports } from '@shared/ui/select';
import type { OrganizationComplianceFormValues } from './models';
import {
  ORGANIZATION_COMPLIANCE_SEVERITY_OPTIONS,
  ORGANIZATION_PERIODICITY_OPTIONS,
} from './options';

/**
 * Constant MIN_REMINDER_WINDOW_DAYS
 * @const MIN_REMINDER_WINDOW_DAYS
 *
 * @description Lower bound the backend accepts for `reminderWindowDays`.
 * @since 1.0.0
 * @type {number}
 */
const MIN_REMINDER_WINDOW_DAYS: number = 1;

/**
 * Constant MAX_REMINDER_WINDOW_DAYS
 * @const MAX_REMINDER_WINDOW_DAYS
 *
 * @description Upper bound the backend accepts for `reminderWindowDays`.
 * @since 1.0.0
 * @type {number}
 */
const MAX_REMINDER_WINDOW_DAYS: number = 180;

/**
 * Component OrganizationComplianceForm
 * @class OrganizationComplianceForm
 *
 * @description
 * The organization's compliance policy: per-severity non-conformity
 * resolution SLAs, per-equipment-type inspection periodicity, and the
 * reminder window. Both maps render every key the seed carries — the
 * backend always returns EFFECTIVE values (catalog defaults overlaid with
 * customizations) — with a badge marking the keys `customizedSlaSeverities`
 * and `customizedPeriodicityTypes` name as organization-specific. It owns
 * its model and rules and emits {@link submitted}; the page maps the values
 * onto the settings PATCH and calls the store (`ARCHITECTURE.md` §10.4).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-compliance-form [compliance]="settings().compliance" [pending]="store.isSaving()" (submitted)="save($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-compliance-form',
  imports: [
    FormField,
    NgIcon,
    HlmBadge,
    HlmButton,
    HlmInput,
    ...HlmFieldImports,
    ...HlmInputGroupImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({
      lucideAlarmSmoke,
      lucideBox,
      lucideCalendarClock,
      lucideCalendarDays,
      lucideCalendarRange,
      lucideCctv,
      lucideCircleAlert,
      lucideCircleDotDashed,
      lucideDoorClosed,
      lucideDroplet,
      lucideDroplets,
      lucideFingerprint,
      lucideFireExtinguisher,
      lucideGauge,
      lucideLightbulb,
      lucideOctagonAlert,
      lucideSiren,
      lucideThermometer,
      lucideTriangleAlert,
    }),
  ],
  templateUrl: './organization-compliance-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationComplianceForm {
  //#region Inputs
  /**
   * Property compliance
   * @readonly
   *
   * @description
   * The values the form starts from, and re-seeds to whenever they change.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationComplianceSettings>}
   */
  public readonly compliance: InputSignal<OrganizationComplianceSettings> =
    input.required<OrganizationComplianceSettings>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a save is in flight, which disables the submit control.
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
   * Emits the edited values once the form is valid and has changed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<OrganizationComplianceFormValues>}
   */
  public readonly submitted: OutputEmitterRef<OrganizationComplianceFormValues> =
    output<OrganizationComplianceFormValues>();
  //#endregion

  //#region Properties
  /**
   * Property periodicityOptions
   * @readonly
   * @description The inspection periodicity picker's choices.
   * @access protected
   * @since 1.0.0
   * @type {typeof ORGANIZATION_PERIODICITY_OPTIONS}
   */
  protected readonly periodicityOptions: typeof ORGANIZATION_PERIODICITY_OPTIONS =
    ORGANIZATION_PERIODICITY_OPTIONS;

  /**
   * Property severityOptions
   * @readonly
   * @description The non-conformity severities the SLA section renders, in display order.
   * @access protected
   * @since 1.0.0
   * @type {typeof ORGANIZATION_COMPLIANCE_SEVERITY_OPTIONS}
   */
  protected readonly severityOptions: typeof ORGANIZATION_COMPLIANCE_SEVERITY_OPTIONS =
    ORGANIZATION_COMPLIANCE_SEVERITY_OPTIONS;

  /**
   * Property periodicityLabel
   * @readonly
   * @description Renders the selected periodicity in the closed trigger.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly periodicityLabel = (value: string): string =>
    ORGANIZATION_PERIODICITY_OPTIONS.find((option): boolean => option.value === value)?.label ??
    value;

  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited values, re-seeded from {@link compliance} whenever it
   * changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OrganizationComplianceFormValues>}
   */
  protected readonly model: WritableSignal<OrganizationComplianceFormValues> = linkedSignal(
    (): OrganizationComplianceFormValues => {
      const compliance: OrganizationComplianceSettings = this.compliance();
      return {
        nonConformitySlaDays: { ...compliance.nonConformitySlaDays },
        inspectionPeriodicityDefaults: { ...compliance.inspectionPeriodicityDefaults },
        reminderWindowDays: compliance.reminderWindowDays,
      };
    },
  );

  /**
   * Property complianceForm
   * @readonly
   *
   * @description
   * The field tree and its rules. The two maps carry one dynamic sub-field
   * per key the seed provided; `reminderWindowDays` is bounded to what the
   * backend accepts.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<OrganizationComplianceFormValues>}
   */
  protected readonly complianceForm: FieldTree<OrganizationComplianceFormValues> = form(
    this.model,
    (path): void => {
      min(path.reminderWindowDays, MIN_REMINDER_WINDOW_DAYS, {
        message: $localize`:@@org.settings.compliance.reminderWindowTooLow:Enter at least ${MIN_REMINDER_WINDOW_DAYS}:min: day`,
      });
      max(path.reminderWindowDays, MAX_REMINDER_WINDOW_DAYS, {
        message: $localize`:@@org.settings.compliance.reminderWindowTooHigh:Enter at most ${MAX_REMINDER_WINDOW_DAYS}:max: days`,
      });
    },
  );

  /**
   * Property canSubmit
   * @readonly
   *
   * @description
   * Whether the submit control should be enabled: the tree is valid, has
   * changed from the seeded values, and no save is already in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(
    () => this.complianceForm().valid() && this.complianceForm().dirty() && !this.pending(),
  );
  //#endregion

  //#region Methods
  /**
   * Method equipmentTypeLabel
   * @method equipmentTypeLabel
   *
   * @description
   * Resolves an equipment type key to its display label from the equipments
   * subfeature's published catalog (`ARCHITECTURE.md` §2.7 — reuse over a
   * local duplicate), falling back to the raw key for a type this app does
   * not otherwise render.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} type - The equipment type key.
   *
   * @returns {string} The display label.
   */
  protected equipmentTypeLabel(type: string): string {
    return EQUIPMENT_TYPE_OPTIONS.find((option): boolean => option.value === type)?.label ?? type;
  }

  /**
   * Method equipmentTypeIcon
   * @method equipmentTypeIcon
   *
   * @description Resolves an equipment type key to its Lucide icon, with a generic equipment fallback.
   * @access protected
   * @since 1.0.0
   * @param {string} type - The equipment type key.
   * @returns {string} The registered Lucide icon name.
   */
  protected equipmentTypeIcon(type: string): string {
    return (
      EQUIPMENT_TYPE_OPTIONS.find((option): boolean => option.value === type)?.icon ?? 'lucideBox'
    );
  }

  /**
   * Method severityLabel
   * @method severityLabel
   *
   * @description
   * Resolves a non-conformity severity key to the card descriptor used by the
   * SLA editor, falling back to a neutral descriptor for an unknown API key.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} severity - The severity key.
   *
   * @returns {(typeof ORGANIZATION_COMPLIANCE_SEVERITY_OPTIONS)[number]} The card descriptor.
   */
  protected severityOption(
    severity: string,
  ): (typeof ORGANIZATION_COMPLIANCE_SEVERITY_OPTIONS)[number] {
    return (
      ORGANIZATION_COMPLIANCE_SEVERITY_OPTIONS.find(
        (option): boolean => option.value === severity,
      ) ?? {
        description: '',
        icon: 'lucideCircleDotDashed',
        iconClass: 'size-4 text-muted-foreground',
        label: severity,
        value: severity,
      }
    );
  }

  /**
   * Method isCustomizedSla
   * @method isCustomizedSla
   *
   * @description Whether a severity's SLA differs from the catalog default.
   * @access protected
   * @since 1.0.0
   * @param {string} severity - The severity key.
   * @returns {boolean}
   */
  protected isCustomizedSla(severity: string): boolean {
    return this.compliance().customizedSlaSeverities.includes(severity);
  }

  /**
   * Method isCustomizedPeriodicity
   * @method isCustomizedPeriodicity
   *
   * @description Whether an equipment type's periodicity differs from the catalog default.
   * @access protected
   * @since 1.0.0
   * @param {string} type - The equipment type key.
   * @returns {boolean}
   */
  protected isCustomizedPeriodicity(type: string): boolean {
    return this.compliance().customizedPeriodicityTypes.includes(type);
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the form touched so every failing rule becomes visible, then emits
   * only if it is valid and changed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The native submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.complianceForm().markAsTouched();

    if (!this.canSubmit()) return;

    this.submitted.emit(this.model());
  }
  //#endregion
}
