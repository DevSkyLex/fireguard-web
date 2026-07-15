/**
 * Type SkeletonPreset
 * @typedef SkeletonPreset
 *
 * @description
 * The shape a {@link Skeleton} renders while a region loads:
 * - `list-row` — avatar + two text lines, repeated `count` times (list/table rows),
 * - `card` — a bordered card with a heading + body + footer bar, repeated `count` times,
 * - `chart` — a single tall block sized like a chart canvas,
 * - `text` — plain full-width text lines, repeated `count` times.
 */
export type SkeletonPreset = 'list-row' | 'card' | 'chart' | 'text';
