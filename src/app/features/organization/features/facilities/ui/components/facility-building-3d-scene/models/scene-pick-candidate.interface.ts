import type { SceneObjectUserData } from './scene-object-user-data.type';

/**
 * Interface ScenePickCandidate
 * @interface ScenePickCandidate
 *
 * @description
 * One raycast intersection reduced to the two fields `pickTarget` needs —
 * the hit object's `userData` and its distance from the ray origin — so
 * the picking logic is testable without a real `THREE.Raycaster` or scene.
 *
 * @since 1.0.0
 */
export interface ScenePickCandidate {
  /** The intersected object's `userData`. */
  readonly userData: SceneObjectUserData;

  /** The intersection's distance from the ray origin, as `THREE.Intersection.distance` reports it. */
  readonly distance: number;
}
