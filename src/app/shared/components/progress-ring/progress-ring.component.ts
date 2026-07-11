import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';

/**
 * Component ProgressRing
 * @class ProgressRing
 *
 * @description
 * Generic, domain-agnostic circular progress indicator rendered as inline SVG.
 * Fills clockwise from 12 o'clock in proportion to {@link value}. Carries no
 * business meaning — callers decide what the percentage represents and must
 * supply {@link ariaLabel} so the value is never conveyed by colour alone.
 *
 * @example ```html
 * <app-progress-ring [value]="60" ariaLabel="60% complete" />
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-progress-ring',
  templateUrl: './progress-ring.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressRing {
  //#region Inputs
  /**
   * Property value
   * @readonly
   *
   * @description
   * Progress percentage (0–100). Values outside the range are clamped.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly value: InputSignal<number> = input.required<number>();

  /**
   * Property size
   * @readonly
   *
   * @description
   * Outer diameter of the ring, in pixels.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly size: InputSignal<number> = input<number>(16);

  /**
   * Property strokeWidth
   * @readonly
   *
   * @description
   * Width of the ring stroke, in pixels.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly strokeWidth: InputSignal<number> = input<number>(2);

  /**
   * Property color
   * @readonly
   *
   * @description
   * CSS colour of the filled arc. Defaults to the PrimeNG primary colour
   * design token, which already adapts between light and dark themes.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly color: InputSignal<string | undefined> = input<string>();

  /**
   * Property trackColor
   * @readonly
   *
   * @description
   * CSS colour of the unfilled track. Defaults to a theme-aware neutral
   * surface colour via `currentColor`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly trackColor: InputSignal<string | undefined> = input<string>();

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Accessible description of the progress value, e.g. `"60% complete"`.
   * Required so the ring never conveys meaning through colour alone.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly ariaLabel: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property clampedValue
   * @readonly
   *
   * @description
   * {@link value} clamped to the `[0, 100]` range.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly clampedValue: Signal<number> = computed<number>(() =>
    Math.min(100, Math.max(0, this.value())),
  );

  /**
   * Property center
   * @readonly
   *
   * @description
   * Coordinate of the SVG viewport center, used for both axes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly center: Signal<number> = computed<number>(() => this.size() / 2);

  /**
   * Property radius
   * @readonly
   *
   * @description
   * Ring radius, inset by half the stroke width so the stroke never clips.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly radius: Signal<number> = computed<number>(
    () => (this.size() - this.strokeWidth()) / 2,
  );

  /**
   * Property circumference
   * @readonly
   *
   * @description
   * Ring circumference, used to derive the dash array and offset.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly circumference: Signal<number> = computed<number>(
    () => 2 * Math.PI * this.radius(),
  );

  /**
   * Property dashOffset
   * @readonly
   *
   * @description
   * Stroke-dashoffset filling the ring clockwise in proportion to
   * {@link clampedValue}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly dashOffset: Signal<number> = computed<number>(
    () => this.circumference() * (1 - this.clampedValue() / 100),
  );
  //#endregion
}
