import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import type {
  OrganizationDateFormat,
  OrganizationFirstDayOfWeek,
  OrganizationMeasurementSystem,
  OrganizationOutput,
  UpdateOrganizationInput,
} from '@features/organization/models';
import {
  ORGANIZATION_DATE_FORMAT_OPTIONS,
  ORGANIZATION_FIRST_DAY_OPTIONS,
  ORGANIZATION_LOCALE_OPTIONS,
  ORGANIZATION_MEASUREMENT_SYSTEM_OPTIONS,
  ORGANIZATION_TIMEZONE_OPTIONS,
} from './options';
import { getTimezoneOffsetLabel } from './utils';

/** Default regional values applied when an organization has none persisted yet. */
const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_LOCALE = 'en-US';
const DEFAULT_DATE_FORMAT: OrganizationDateFormat = 'yyyy-MM-dd';
const DEFAULT_FIRST_DAY: OrganizationFirstDayOfWeek = 'monday';
const DEFAULT_MEASUREMENT_SYSTEM: OrganizationMeasurementSystem = 'metric';

/**
 * Component OrganizationRegionalForm
 * @class OrganizationRegionalForm
 *
 * @description
 * Presentational form for an organization's regional and formatting settings:
 * timezone, locale, date format, first day of week and measurement system.
 * Changes are emitted through `submitted` as a partial
 * {@link UpdateOrganizationInput}. The form owns no navigation, store, or API
 * access.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-regional-form',
  imports: [ButtonModule, ReactiveFormsModule, SelectModule],
  templateUrl: './organization-regional-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRegionalForm {
  //#region Properties
  /** Active organization whose regional settings are being edited. */
  public readonly organization: InputSignal<OrganizationOutput | null> =
    input<OrganizationOutput | null>(null);
  /** Whether the settings submission is pending. */
  public readonly saving: InputSignal<boolean> = input<boolean>(false);
  /** Emits the regional slice of the settings payload. */
  public readonly submitted: OutputEmitterRef<UpdateOrganizationInput> = output();

  /**
   * Timezone options enriched with the current UTC offset (DST-aware), shown as
   * a secondary hint so the value of each zone is unambiguous.
   */
  protected readonly timezoneOptions: ReadonlyArray<{
    label: string;
    value: string;
    offset: string;
  }> = ORGANIZATION_TIMEZONE_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value,
    offset: getTimezoneOffsetLabel(option.value),
  }));

  /** Select options. */
  protected readonly localeOptions = ORGANIZATION_LOCALE_OPTIONS;
  protected readonly dateFormatOptions = ORGANIZATION_DATE_FORMAT_OPTIONS;
  protected readonly firstDayOptions = ORGANIZATION_FIRST_DAY_OPTIONS;
  protected readonly measurementSystemOptions = ORGANIZATION_MEASUREMENT_SYSTEM_OPTIONS;

  /** Non-nullable builder preserving strict form value types. */
  private readonly formBuilder: NonNullableFormBuilder =
    inject<NonNullableFormBuilder>(NonNullableFormBuilder);

  /** Strictly typed regional settings form. */
  protected readonly form = this.formBuilder.group({
    timezone: this.formBuilder.control(DEFAULT_TIMEZONE, [Validators.required]),
    locale: this.formBuilder.control(DEFAULT_LOCALE, [Validators.required]),
    dateFormat: this.formBuilder.control<OrganizationDateFormat>(DEFAULT_DATE_FORMAT, [
      Validators.required,
    ]),
    firstDayOfWeek: this.formBuilder.control<OrganizationFirstDayOfWeek>(DEFAULT_FIRST_DAY, [
      Validators.required,
    ]),
    measurementSystem: this.formBuilder.control<OrganizationMeasurementSystem>(
      DEFAULT_MEASUREMENT_SYSTEM,
      [Validators.required],
    ),
  });
  //#endregion

  //#region Methods
  /** Synchronizes existing regional settings and submission state. */
  public constructor() {
    effect(() => {
      const regional = this.organization()?.settings?.regional;
      this.form.reset(
        {
          timezone: regional?.timezone ?? DEFAULT_TIMEZONE,
          locale: regional?.locale ?? DEFAULT_LOCALE,
          dateFormat: regional?.dateFormat ?? DEFAULT_DATE_FORMAT,
          firstDayOfWeek: regional?.firstDayOfWeek ?? DEFAULT_FIRST_DAY,
          measurementSystem: regional?.measurementSystem ?? DEFAULT_MEASUREMENT_SYSTEM,
        },
        { emitEvent: false },
      );
    });

    effect(() =>
      this.saving()
        ? this.form.disable({ emitEvent: false })
        : this.form.enable({ emitEvent: false }),
    );
  }

  /** Emits the regional settings as a settings update payload. */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitted.emit({ regional: this.form.getRawValue() });
  }
  //#endregion
}
