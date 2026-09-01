import type { SceneObjectUserData } from '../../models/scene-object-user-data.type';
import type { ScenePickCandidate } from '../../models/scene-pick-candidate.interface';

/**
 * Function pickTarget
 * @function pickTarget
 *
 * @description
 * Resolves a raycast's intersections to the one object a pointer event
 * should act on. A room always outranks a floor slab at the same or a
 * farther distance; edges and floor placeholders are never eligible; and
 * when `isolatedFloorId` is set, anything belonging to a different floor is
 * excluded outright. Pure over `userData`, so it needs no real
 * `THREE.Raycaster` to test.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {ReadonlyArray<ScenePickCandidate>} candidates - The raycast's intersections, reduced to `userData` and `distance`.
 * @param {string | null} isolatedFloorId - The floor isolated for display, or `null` when every floor is visible.
 *
 * @returns {SceneObjectUserData | null} The picked object's `userData`, or `null` when nothing eligible was hit.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function pickTarget(
  candidates: ReadonlyArray<ScenePickCandidate>,
  isolatedFloorId: string | null,
): SceneObjectUserData | null {
  const eligible: ReadonlyArray<ScenePickCandidate> = candidates.filter(
    (candidate: ScenePickCandidate): boolean =>
      (candidate.userData.kind === 'room' || candidate.userData.kind === 'floor-slab') &&
      (isolatedFloorId === null || candidate.userData.floorId === isolatedFloorId),
  );

  const rooms: ReadonlyArray<ScenePickCandidate> = eligible.filter(
    (candidate: ScenePickCandidate): boolean => candidate.userData.kind === 'room',
  );
  const pool: ReadonlyArray<ScenePickCandidate> =
    rooms.length > 0
      ? rooms
      : eligible.filter(
          (candidate: ScenePickCandidate): boolean => candidate.userData.kind === 'floor-slab',
        );

  if (pool.length === 0) {
    return null;
  }

  return pool.reduce(
    (nearest: ScenePickCandidate, current: ScenePickCandidate): ScenePickCandidate =>
      current.distance < nearest.distance ? current : nearest,
  ).userData;
}
