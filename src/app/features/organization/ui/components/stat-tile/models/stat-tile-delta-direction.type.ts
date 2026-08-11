/**
 * Type StatTileDeltaDirection
 *
 * @description
 * The three shapes a KPI change can take: `up`, `down`, or unchanged
 * (`flat`). Drives which arrow the tile renders — the direction is always
 * the literal one, independent of whether it is desirable
 * ({@link StatTileDelta.positiveIsGood}).
 *
 * @since 1.0.0
 */
export type StatTileDeltaDirection = 'up' | 'down' | 'flat';
