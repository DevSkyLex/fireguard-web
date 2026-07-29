import type {
  ActivityCell,
  ActivityLevel,
  ConversationActivityBucketOutput,
} from '@features/organization/features/collaboration/models';

/**
 * Function buildActivityCells
 * @function buildActivityCells
 *
 * @description
 * Turns the API's raw daily message counts into the heatmap's four intensity
 * steps.
 *
 * The scale is **relative to the window**, not absolute: the busiest day in the
 * range is always level 3 and every other day is graded against it. Fixed
 * thresholds were rejected because they say nothing useful — a quiet channel
 * would render uniformly blank and a busy one uniformly saturated, and the
 * point of the strip is to show a channel's own rhythm.
 *
 * A zero-count day is always level 0, never level 1: a silent day must read as
 * silent whatever the scale.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly ConversationActivityBucketOutput[]} buckets - Zero-filled buckets, oldest first.
 *
 * @returns {readonly ActivityCell[]} One cell per bucket, in the same order.
 */
export function buildActivityCells(
  buckets: readonly ConversationActivityBucketOutput[],
): readonly ActivityCell[] {
  const peak: number = buckets.reduce(
    (highest: number, bucket: ConversationActivityBucketOutput): number =>
      Math.max(highest, bucket.count),
    0,
  );

  return buckets.map((bucket: ConversationActivityBucketOutput): ActivityCell => {
    return { bucket: bucket.bucket, count: bucket.count, level: toLevel(bucket.count, peak) };
  });
}

/**
 * Grades a count against the window's peak. `peak` is 0 only when every day is
 * silent, in which case the division is never reached.
 */
function toLevel(count: number, peak: number): ActivityLevel {
  if (count <= 0) return 0;
  if (peak <= 0) return 0;

  const step: number = Math.ceil((count / peak) * 3);

  return Math.min(3, Math.max(1, step)) as ActivityLevel;
}
