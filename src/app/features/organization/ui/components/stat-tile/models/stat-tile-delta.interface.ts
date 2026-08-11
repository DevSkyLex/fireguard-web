import type { StatTileDeltaDirection } from './stat-tile-delta-direction.type';

/**
 * Interface StatTileDelta
 * @interface StatTileDelta
 *
 * @description
 * The change a stat tile reports alongside its headline value: a magnitude,
 * the literal direction it moved, and whether that direction is desirable
 * for this particular metric — a rising overdue count is `up` but not
 * `positiveIsGood`, while a rising completion rate is both.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface StatTileDelta {
  /** Unsigned magnitude of the change, percent or absolute — the caller decides which. */
  readonly value: number;
  /** The literal direction the value moved. */
  readonly direction: StatTileDeltaDirection;
  /** Whether {@link direction} `up` is the desirable outcome for this metric. */
  readonly positiveIsGood: boolean;
}
