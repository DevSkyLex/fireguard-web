import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { ConversationActivityBucket } from '@features/organization/features/messaging/models';

/**
 * One rendered day of the heatmap.
 *
 * @since 1.0.0
 */
interface ActivityCell {
  readonly bucket: string;
  readonly count: number;

  /** Intensity step, 0 (silent) to 3 (busiest). */
  readonly level: 0 | 1 | 2 | 3;

  /** What a screen reader and the native tooltip announce. */
  readonly label: string;
}

/**
 * Tailwind classes per intensity step. Step 0 is a surface tint, not a pale
 * primary: a silent day must not read as a little activity.
 */
const LEVEL_CLASS: Readonly<Record<ActivityCell['level'], string>> = {
  0: 'bg-surface-100 dark:bg-surface-800',
  1: 'bg-primary-200 dark:bg-primary-900',
  2: 'bg-primary-400 dark:bg-primary-700',
  3: 'bg-primary-600 dark:bg-primary-400',
};

/**
 * Maps a day's message count to an intensity step.
 *
 * Fixed thresholds rather than a share of the busiest day: a channel with one
 * loud afternoon would otherwise render every other day as silent, and the
 * question the panel answers is "is this thread alive", not "which day won".
 *
 * @param {number} count - Messages posted that day.
 *
 * @returns {ActivityCell['level']} The intensity step.
 *
 * @since 1.0.0
 */
function toLevel(count: number): ActivityCell['level'] {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;

  return 3;
}

/**
 * Component ConversationActivityHeatmap
 * @class ConversationActivityHeatmap
 *
 * @description
 * The conversation's recent daily message counts as a compact 13x2 grid of
 * tinted cells, oldest first, the last cell being today.
 *
 * Presentational: the panel owns the fetch. Each cell carries its own label,
 * so the tint never carries the meaning alone.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-conversation-activity-heatmap [buckets]="store.activity()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-conversation-activity-heatmap',
  templateUrl: './conversation-activity-heatmap.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationActivityHeatmap {
  //#region Inputs
  /**
   * Property buckets
   * @readonly
   *
   * @description
   * Daily counts, oldest first. The API zero-fills, so a gap here means a
   * failed read, not a quiet day — the component renders whatever it is given.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly ConversationActivityBucket[]>}
   */
  public readonly buckets: InputSignal<readonly ConversationActivityBucket[]> = input<
    readonly ConversationActivityBucket[]
  >([]);
  //#endregion

  //#region Properties
  /**
   * Property locale
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property cells
   * @readonly
   *
   * @description
   * The buckets projected into rendered cells: intensity step plus the label
   * that accompanies the tint.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ActivityCell[]>}
   */
  protected readonly cells: Signal<readonly ActivityCell[]> = computed(
    (): readonly ActivityCell[] =>
      this.buckets().map((bucket: ConversationActivityBucket): ActivityCell => {
        const day: string = this.formatDay(bucket.bucket);

        return {
          bucket: bucket.bucket,
          count: bucket.count,
          level: toLevel(bucket.count),
          label:
            bucket.count === 1
              ? $localize`:@@messaging.activity.cellOne:1 message — ${day}:day:`
              : $localize`:@@messaging.activity.cellMany:${bucket.count}:count: messages — ${day}:day:`,
        };
      }),
  );

  /**
   * Property totalMessages
   * @readonly
   *
   * @description
   * Everything the window covers, for the caption under the grid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly totalMessages: Signal<number> = computed((): number =>
    this.buckets().reduce(
      (total: number, bucket: ConversationActivityBucket): number => total + bucket.count,
      0,
    ),
  );
  //#endregion

  //#region Methods
  /**
   * Method cellClass
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ActivityCell} cell - The rendered day.
   *
   * @returns {string} Its tint classes.
   */
  protected cellClass(cell: ActivityCell): string {
    return LEVEL_CLASS[cell.level];
  }

  /**
   * Method formatDay
   *
   * @description
   * A bucket's day in the reader's locale. The API sends a bare `YYYY-MM-DD`,
   * which is unreadable in a tooltip.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} bucket - The bucket day.
   *
   * @returns {string} The formatted day, or the raw value if it cannot be parsed.
   */
  private formatDay(bucket: string): string {
    try {
      return formatDate(bucket, 'mediumDate', this.locale);
    } catch {
      return bucket;
    }
  }
  //#endregion
}
