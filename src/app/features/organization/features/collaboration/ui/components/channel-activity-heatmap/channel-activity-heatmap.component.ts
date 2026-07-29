import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type {
  ActivityCell,
  ActivityLevel,
  ConversationActivityBucketOutput,
} from '@features/organization/features/collaboration/models';
import { buildActivityCells } from '@features/organization/features/collaboration/utils';

/**
 * Tailwind class per intensity step.
 *
 * Written out as complete literals because Tailwind has no safelist here — a
 * computed `'bg-emerald-' + n` would produce nothing. The ramp is the design's
 * emerald scale; step 0 is a neutral surface, not a faint green, so a silent
 * day never reads as activity.
 */
const LEVEL_CLASS: Readonly<Record<ActivityLevel, string>> = {
  0: 'bg-surface-100 dark:bg-surface-800',
  1: 'bg-emerald-100 dark:bg-emerald-950',
  2: 'bg-emerald-300 dark:bg-emerald-800',
  3: 'bg-emerald-500 dark:bg-emerald-500',
};

/**
 * Component ChannelActivityHeatmap
 * @class ChannelActivityHeatmap
 *
 * @description
 * The channel's message rhythm as a strip of one cell per day.
 *
 * Presentational: it grades the counts it is given and renders them. The
 * bucket window is chosen by the caller.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-channel-activity-heatmap [buckets]="store.activity()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channel-activity-heatmap',
  imports: [],
  templateUrl: './channel-activity-heatmap.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelActivityHeatmap {
  //#region Inputs
  /**
   * Property buckets
   * @readonly
   *
   * @description
   * Zero-filled daily counts, oldest first, as returned by the activity
   * endpoint.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly ConversationActivityBucketOutput[]>}
   */
  public readonly buckets: InputSignal<readonly ConversationActivityBucketOutput[]> =
    input.required<readonly ConversationActivityBucketOutput[]>();
  //#endregion

  //#region Properties
  /**
   * Property cells
   * @readonly
   *
   * @description
   * The graded cells to render.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ActivityCell[]>}
   */
  protected readonly cells: Signal<readonly ActivityCell[]> = computed(
    (): readonly ActivityCell[] => buildActivityCells(this.buckets()),
  );

  /**
   * Property total
   * @readonly
   *
   * @description
   * Messages across the whole window, for the summary the strip cannot convey.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly total: Signal<number> = computed((): number =>
    this.cells().reduce((sum: number, cell: ActivityCell): number => sum + cell.count, 0),
  );
  //#endregion

  //#region Methods
  /**
   * Method levelClass
   * @method levelClass
   *
   * @description
   * Tailwind background class for an intensity step.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ActivityLevel} level - Intensity step.
   *
   * @return {string} A literal class string.
   */
  protected levelClass(level: ActivityLevel): string {
    return LEVEL_CLASS[level];
  }
  //#endregion
}
