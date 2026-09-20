import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { BrnProgress, BrnProgressIndicator } from '@spartan-ng/brain/progress';
import type { WorkloadDayOutput } from '@features/organization/features/workload/models';
import { formatDurationMinutes } from '@shared/duration-format';
import { HlmBadge } from '@shared/ui/badge';

/**
 * Component WorkloadDayCell
 * @class WorkloadDayCell
 *
 * @description
 * Typed daily totals shared by matrix and touch list. Spartan Brain owns progress semantics;
 * the compact circular rendering preserves uncapped numeric overload and textual availability.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-workload-day-cell',
  imports: [HlmBadge, BrnProgress, BrnProgressIndicator],
  templateUrl: './workload-day-cell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkloadDayCell {
  /**
   * Property day
   * @readonly
   *
   * @description
   * API-computed totals.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<WorkloadDayOutput>}
   */
  public readonly day: InputSignal<WorkloadDayOutput> = input.required<WorkloadDayOutput>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * Textual availability independent of color.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property meter
   * @readonly
   *
   * @description
   * Bounded visual meter.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly meter: InputSignal<number> = input.required<number>();

  /**
   * Property duration
   * @readonly
   *
   * @description
   * Localized hours and minutes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {typeof formatDurationMinutes}
   */
  protected readonly duration: typeof formatDurationMinutes = formatDurationMinutes;
}
