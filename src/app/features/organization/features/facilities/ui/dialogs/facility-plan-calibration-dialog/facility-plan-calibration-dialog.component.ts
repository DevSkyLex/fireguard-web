import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { disabled, form, FormField, validate, type FieldTree } from '@angular/forms/signals';
import type { FacilityPlanCalibration } from '@features/organization/features/facilities/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';

/**
 * Interface CalibrationDraft
 * @interface
 *
 * @description
 * Editable calibration, including a keyboard alternative to measuring two plan points.
 */
interface CalibrationDraft {
  /**
   * Property widthMeters
   *
   * @description
   * Full image width in metres.
   */
  widthMeters: string;
  /**
   * Property rotationDegrees
   *
   * @description
   * Clockwise orientation in degrees.
   */
  rotationDegrees: string;
  /**
   * Property offsetXMeters
   *
   * @description
   * Building X offset.
   */
  offsetXMeters: string;
  /**
   * Property offsetZMeters
   *
   * @description
   * Building Z offset.
   */
  offsetZMeters: string;
  /**
   * Property x1
   *
   * @description
   * First horizontal percent coordinate.
   */
  x1: string;
  /**
   * Property y1
   *
   * @description
   * First vertical percent coordinate.
   */
  y1: string;
  /**
   * Property x2
   *
   * @description
   * Second horizontal percent coordinate.
   */
  x2: string;
  /**
   * Property y2
   *
   * @description
   * Second vertical percent coordinate.
   */
  y2: string;
  /**
   * Property distanceMeters
   *
   * @description
   * Known distance between the two points.
   */
  distanceMeters: string;
}

/**
 * Class FacilityPlanCalibrationDialog
 * @class FacilityPlanCalibrationDialog
 *
 * @description
 * Presentational metric calibration form, preserving its draft until confirmed success.
 */
@Component({
  selector: 'app-facility-plan-calibration-dialog',
  imports: [
    HlmButton,
    HlmInput,
    FormField,
    ...HlmDialogImports,
    ...HlmFieldImports,
    ...HlmAlertImports,
  ],
  templateUrl: './facility-plan-calibration-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityPlanCalibrationDialog {
  //#region Properties
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the calibration form is displayed.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input(false);

  /**
   * Property calibration
   * @readonly
   *
   * @description
   * Existing saved calibration, used only on opening.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityPlanCalibration | null>}
   */
  public readonly calibration: InputSignal<FacilityPlanCalibration | null> =
    input<FacilityPlanCalibration | null>(null);

  /**
   * Property points
   * @readonly
   *
   * @description
   * Measured normalized image points.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ReadonlyArray<readonly [number, number]>>}
   */
  public readonly points: InputSignal<ReadonlyArray<readonly [number, number]>> = input<
    ReadonlyArray<readonly [number, number]>
  >([]);

  /**
   * Property imageAspect
   * @readonly
   *
   * @description
   * Ratio of image height to width.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly imageAspect: InputSignal<number> = input(1);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a revision-protected save is pending.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property errorMessage
   * @readonly
   *
   * @description
   * Latest save rejection, including a concurrency conflict.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly errorMessage: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property visibleChange
   * @readonly
   *
   * @description
   * Requests dismissal of the overlay.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the validated metric calibration for the page to write.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<FacilityPlanCalibration | null>}
   */
  public readonly submitted: OutputEmitterRef<FacilityPlanCalibration | null> =
    output<FacilityPlanCalibration | null>();

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Draft values remain independent of refreshed API data.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<CalibrationDraft>}
   */
  protected readonly draft: WritableSignal<CalibrationDraft> = signal<CalibrationDraft>({
    widthMeters: '',
    rotationDegrees: '0',
    offsetXMeters: '0',
    offsetZMeters: '0',
    x1: '0',
    y1: '0',
    x2: '100',
    y2: '0',
    distanceMeters: '',
  });

  /**
   * Property calibrationForm
   * @readonly
   *
   * @description
   * Validates metric transform numbers and locks accepted writes.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<CalibrationDraft>}
   */
  protected readonly calibrationForm: FieldTree<CalibrationDraft> = form(this.draft, (path) => {
    disabled(path, { when: () => this.pending() });
    validate(path.widthMeters, ({ value }) => {
      const width = Number(value());
      return value().trim() !== '' && Number.isFinite(width) && width > 0 && width <= 100000
        ? null
        : {
            kind: 'width',
            message: $localize`:@@facility.calibration.widthInvalid:Enter an image width greater than 0 and no more than 100000 metres.`,
          };
    });
    for (const field of [path.rotationDegrees, path.offsetXMeters, path.offsetZMeters]) {
      const maxMagnitude = field === path.rotationDegrees ? 360 : 100000;
      validate(field, ({ value }) =>
        value().trim() !== '' &&
        Number.isFinite(Number(value())) &&
        Math.abs(Number(value())) <= maxMagnitude
          ? null
          : {
              kind: 'transformRange',
              message: $localize`:@@facility.calibration.transformRange:Enter an orientation from -360 to 360 degrees or an offset from -100000 to 100000 metres.`,
            },
      );
    }
  });

  /**
   * Property metricFields
   * @readonly
   *
   * @description
   * Labels and keys for the metric transformation fields.
   *
   * @access protected
   * @since unreleased
   *
   * @type {ReadonlyArray<{
   *   readonly key: 'widthMeters' | 'rotationDegrees' | 'offsetXMeters' | 'offsetZMeters';
   *   readonly label: string;
   * }>}
   */
  protected readonly metricFields: ReadonlyArray<{
    readonly key: 'widthMeters' | 'rotationDegrees' | 'offsetXMeters' | 'offsetZMeters';
    readonly label: string;
  }> = [
    { key: 'widthMeters', label: $localize`:@@facility.calibration.width:Image width (m)` },
    {
      key: 'rotationDegrees',
      label: $localize`:@@facility.calibration.rotation:Orientation (degrees)`,
    },
    { key: 'offsetXMeters', label: $localize`:@@facility.calibration.offsetX:X offset (m)` },
    { key: 'offsetZMeters', label: $localize`:@@facility.calibration.offsetZ:Z offset (m)` },
  ];

  /**
   * Property pointFields
   * @readonly
   *
   * @description
   * Numeric point fields provide the complete non-pointer measurement path.
   *
   * @access protected
   * @since unreleased
   *
   * @type {ReadonlyArray<{
   *   readonly key: 'x1' | 'y1' | 'x2' | 'y2' | 'distanceMeters';
   *   readonly label: string;
   * }>}
   */
  protected readonly pointFields: ReadonlyArray<{
    readonly key: 'x1' | 'y1' | 'x2' | 'y2' | 'distanceMeters';
    readonly label: string;
  }> = [
    { key: 'x1', label: $localize`:@@facility.calibration.x1:Point 1 X (%)` },
    { key: 'y1', label: $localize`:@@facility.calibration.y1:Point 1 Y (%)` },
    { key: 'x2', label: $localize`:@@facility.calibration.x2:Point 2 X (%)` },
    { key: 'y2', label: $localize`:@@facility.calibration.y2:Point 2 Y (%)` },
    {
      key: 'distanceMeters',
      label: $localize`:@@facility.calibration.distance:Known distance (m)`,
    },
  ];

  /**
   * Property measuredWidth
   * @readonly
   *
   * @description
   * Width calculated with uniform scale preserving non-square image proportions.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number | null>}
   */
  protected readonly measuredWidth: Signal<number | null> = computed(() => {
    const draft = this.draft();
    const points = [draft.x1, draft.y1, draft.x2, draft.y2];
    if (
      points.some(
        (value) =>
          value.trim() === '' ||
          !Number.isFinite(Number(value)) ||
          Number(value) < 0 ||
          Number(value) > 100,
      )
    )
      return null;
    const length = Math.hypot(
      (Number(draft.x2) - Number(draft.x1)) / 100,
      ((Number(draft.y2) - Number(draft.y1)) / 100) * this.imageAspect(),
    );
    const distance = Number(draft.distanceMeters);
    const width = distance / length;
    return length > 1e-8 && distance > 0 && Number.isFinite(width) && width <= 100000
      ? width
      : null;
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds the form only on its opening edge, retaining failed input during reloads.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      if (!this.visible()) return;
      untracked(() => {
        const calibration = this.calibration();
        const points = this.points();
        this.calibrationForm().reset({
          widthMeters: calibration ? String(calibration.widthMeters) : '',
          rotationDegrees: String(calibration?.rotationDegrees ?? 0),
          offsetXMeters: String(calibration?.offsetXMeters ?? 0),
          offsetZMeters: String(calibration?.offsetZMeters ?? 0),
          x1: String(Number(((points[0]?.[0] ?? 0) * 100).toFixed(6))),
          y1: String(Number(((points[0]?.[1] ?? 0) * 100).toFixed(6))),
          x2: String(Number(((points[1]?.[0] ?? 1) * 100).toFixed(6))),
          y2: String(Number(((points[1]?.[1] ?? 0) * 100).toFixed(6))),
          distanceMeters: '',
        });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method applyMeasurement
   * @method applyMeasurement
   *
   * @description
   * Applies the measured width without changing the saved plan or normalized points.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Completes the requested operation.
   */
  protected applyMeasurement(): void {
    const width = this.measuredWidth();
    if (width !== null)
      this.calibrationForm.widthMeters().value.set(String(Number(width.toFixed(6))));
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits only valid calibration, letting the page close after confirmed success.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - event.
   *
   * @returns {void} Completes the requested operation.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.calibrationForm().markAsTouched();
    if (this.pending() || this.calibrationForm().invalid()) return;
    const draft = this.draft();
    this.submitted.emit({
      widthMeters: Number(draft.widthMeters),
      rotationDegrees: Number(draft.rotationDegrees),
      offsetXMeters: Number(draft.offsetXMeters),
      offsetZMeters: Number(draft.offsetZMeters),
    });
  }

  /**
   * Method stateChanged
   * @method stateChanged
   *
   * @description
   * Keeps the overlay locked during an accepted write.
   *
   * @access protected
   * @since unreleased
   *
   * @param {'open' | 'closed'} state - state.
   *
   * @returns {void} Completes the requested operation.
   */
  protected stateChanged(state: 'open' | 'closed'): void {
    if (!this.pending() && state === 'closed') this.visibleChange.emit(false);
  }
  //#endregion
}
