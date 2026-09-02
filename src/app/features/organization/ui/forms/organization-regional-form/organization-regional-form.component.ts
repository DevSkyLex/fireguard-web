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
import { form, FormField, required, type FieldTree } from '@angular/forms/signals';
import type { OrganizationRegionalSettings } from '@features/organization/models';
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import {
  ORGANIZATION_DATE_FORMAT_OPTIONS,
  ORGANIZATION_FIRST_DAY_OF_WEEK_OPTIONS,
  ORGANIZATION_MEASUREMENT_SYSTEM_OPTIONS,
} from './options';

/**
 * Component OrganizationRegionalForm
 * @class OrganizationRegionalForm
 *
 * @description
 * The organization's regional and formatting preferences: timezone, locale,
 * date format, first day of week and measurement system. It owns its model
 * and rules and emits {@link submitted}; the page maps the values onto the
 * settings PATCH and calls the store (`ARCHITECTURE.md` §10.4).
 *
 * Persisted via the settings `PATCH`; not yet enforced by app-wide date and
 * locale formatting (`FEATURE.md`).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-regional-form [regional]="settings().regional" [pending]="store.isSaving()" (submitted)="save($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-regional-form',
  imports: [
    RequiredMarker,
    FormField,
    HlmButton,
    HlmInput,
    ...HlmFieldImports,
    ...HlmSelectImports,
  ],
  templateUrl: './organization-regional-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRegionalForm {
  //#region Inputs
  /**
   * Property regional
   * @readonly
   *
   * @description
   * The values the form starts from, and re-seeds to whenever they change.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationRegionalSettings>}
   */
  public readonly regional: InputSignal<OrganizationRegionalSettings> =
    input.required<OrganizationRegionalSettings>();

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
   * @type {OutputEmitterRef<OrganizationRegionalSettings>}
   */
  public readonly submitted: OutputEmitterRef<OrganizationRegionalSettings> =
    output<OrganizationRegionalSettings>();
  //#endregion

  //#region Properties
  /**
   * Property dateFormatOptions
   * @readonly
   * @description The date format picker's choices.
   * @access protected
   * @since 1.0.0
   * @type {typeof ORGANIZATION_DATE_FORMAT_OPTIONS}
   */
  protected readonly dateFormatOptions: typeof ORGANIZATION_DATE_FORMAT_OPTIONS =
    ORGANIZATION_DATE_FORMAT_OPTIONS;

  /**
   * Property firstDayOfWeekOptions
   * @readonly
   * @description The first-day-of-week picker's choices.
   * @access protected
   * @since 1.0.0
   * @type {typeof ORGANIZATION_FIRST_DAY_OF_WEEK_OPTIONS}
   */
  protected readonly firstDayOfWeekOptions: typeof ORGANIZATION_FIRST_DAY_OF_WEEK_OPTIONS =
    ORGANIZATION_FIRST_DAY_OF_WEEK_OPTIONS;

  /**
   * Property measurementSystemOptions
   * @readonly
   * @description The measurement system picker's choices.
   * @access protected
   * @since 1.0.0
   * @type {typeof ORGANIZATION_MEASUREMENT_SYSTEM_OPTIONS}
   */
  protected readonly measurementSystemOptions: typeof ORGANIZATION_MEASUREMENT_SYSTEM_OPTIONS =
    ORGANIZATION_MEASUREMENT_SYSTEM_OPTIONS;

  /**
   * Property dateFormatLabel
   * @readonly
   * @description Renders the selected date format in the closed trigger.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly dateFormatLabel = (value: string): string =>
    ORGANIZATION_DATE_FORMAT_OPTIONS.find((option): boolean => option.value === value)?.label ?? '';

  /**
   * Property firstDayOfWeekLabel
   * @readonly
   * @description Renders the selected first day of week in the closed trigger.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly firstDayOfWeekLabel = (value: string): string =>
    ORGANIZATION_FIRST_DAY_OF_WEEK_OPTIONS.find((option): boolean => option.value === value)
      ?.label ?? '';

  /**
   * Property measurementSystemLabel
   * @readonly
   * @description Renders the selected measurement system in the closed trigger.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly measurementSystemLabel = (value: string): string =>
    ORGANIZATION_MEASUREMENT_SYSTEM_OPTIONS.find((option): boolean => option.value === value)
      ?.label ?? '';

  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited values, re-seeded from {@link regional} whenever it changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OrganizationRegionalSettings>}
   */
  protected readonly model: WritableSignal<OrganizationRegionalSettings> = linkedSignal(
    (): OrganizationRegionalSettings => ({ ...this.regional() }),
  );

  /**
   * Property regionalForm
   * @readonly
   *
   * @description
   * The field tree and its rules. Timezone and locale are required: both are
   * non-optional on the resource the form seeds from.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<OrganizationRegionalSettings>}
   */
  protected readonly regionalForm: FieldTree<OrganizationRegionalSettings> = form(
    this.model,
    (path): void => {
      required(path.timezone, {
        message: $localize`:@@org.settings.regional.timezoneRequired:Enter a timezone`,
      });
      required(path.locale, {
        message: $localize`:@@org.settings.regional.localeRequired:Enter a locale`,
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
    () => this.regionalForm().valid() && this.regionalForm().dirty() && !this.pending(),
  );
  //#endregion

  //#region Methods
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

    this.regionalForm().markAsTouched();

    if (!this.canSubmit()) return;

    this.submitted.emit(this.model());
  }
  //#endregion
}
