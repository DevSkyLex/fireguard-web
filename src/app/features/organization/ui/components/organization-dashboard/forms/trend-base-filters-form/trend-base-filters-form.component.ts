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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, type FormGroup } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import type { TrendBaseFiltersFormData } from './trend-base-filters-form-data.type';
import type { TrendBaseFiltersFormValues } from './trend-base-filters-form-values.type';

/**
 * Component TrendBaseFiltersForm
 * @class TrendBaseFiltersForm
 *
 * @description
 * Reusable reactive form section for dashboard trend filters that owns the
 * common date-range and comparison controls.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-trend-base-filters-form',
  templateUrl: './trend-base-filters-form.component.html',
  imports: [ReactiveFormsModule, DatePickerModule, ToggleSwitchModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendBaseFiltersForm {
  //#region Inputs

  /**
   * Input dateRangeId
   * @readonly
   *
   * @description
   * Unique identifier used to associate the date-range label and input.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly dateRangeId: InputSignal<string> = input.required<string>();

  /**
   * Input dateRange
   * @readonly
   *
   * @description
   * Current draft date range coming from the owning filter component.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<Date[] | null>}
   */
  public readonly dateRange: InputSignal<Date[] | null> = input.required<Date[] | null>();

  /**
   * Input compareEnabled
   * @readonly
   *
   * @description
   * Current draft compare-mode state coming from the owning filter component.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly compareEnabled: InputSignal<boolean> = input.required<boolean>();

  /**
   * Input loading
   * @readonly
   *
   * @description
   * Disabled state forwarded from the owning trend store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  //#endregion

  //#region Outputs

  /**
   * Output dateRangeChange
   * @readonly
   *
   * @description
   * Emits draft date-range updates.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<Date[] | null>}
   */
  public readonly dateRangeChange: OutputEmitterRef<Date[] | null> = output<Date[] | null>();

  /**
   * Output compareEnabledChange
   * @readonly
   *
   * @description
   * Emits compare-toggle updates.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly compareEnabledChange: OutputEmitterRef<boolean> = output<boolean>();

  //#endregion

  //#region Properties

  /**
   * Property formBuilder
   * @readonly
   *
   * @description
   * Reactive form builder used to create the shared base filters form.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {FormBuilder}
   */
  private readonly formBuilder: FormBuilder = inject<FormBuilder>(FormBuilder);

  /**
   * Property form
   * @readonly
   *
   * @description
   * Typed reactive form group for the shared dashboard base filters.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FormGroup<TrendBaseFiltersFormData>}
   */
  protected readonly form: FormGroup<TrendBaseFiltersFormData> =
    this.formBuilder.group<TrendBaseFiltersFormData>({
      dateRange: this.formBuilder.control<TrendBaseFiltersFormValues['dateRange']>(null),
      compareEnabled: this.formBuilder.control<TrendBaseFiltersFormValues['compareEnabled']>(
        false,
        {
          nonNullable: true,
        },
      ),
    });

  /**
   * Property today
   * @readonly
   *
   * @description
   * Upper bound used by the shared date-range picker.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Date}
   */
  protected readonly today: Date = new Date();

  //#endregion

  //#region Constructor

  /**
   * @constructor
   *
   * @description
   * Synchronises external draft inputs with the internal reactive form and
   * forwards user changes through typed outputs.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    this.form.controls.dateRange.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((dateRange: Date[] | null): void => {
        this.dateRangeChange.emit(dateRange);
      });

    this.form.controls.compareEnabled.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((compareEnabled: boolean): void => {
        this.compareEnabledChange.emit(compareEnabled);
      });

    effect((): void => {
      this.form.patchValue(
        {
          dateRange: this.dateRange(),
          compareEnabled: this.compareEnabled(),
        },
        { emitEvent: false },
      );
    });

    effect((): void => {
      if (this.loading()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  //#endregion
}
