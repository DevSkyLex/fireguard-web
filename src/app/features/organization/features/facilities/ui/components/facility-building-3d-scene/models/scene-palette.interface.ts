/**
 * Interface ScenePalette
 * @interface ScenePalette
 *
 * @description
 * The theme colours a `FacilityBuilding3dScene` needs for its materials and
 * line segments, resolved from the host page's CSS custom properties into
 * `THREE.Color` instances the canvas can consume directly.
 *
 * @since 1.0.0
 */
export interface ScenePalette {
  /** The scene background, from `--background`. */
  readonly background: InstanceType<(typeof import('three'))['Color']>;

  /** A room mesh's fill colour, from `--card`. */
  readonly roomFill: InstanceType<(typeof import('three'))['Color']>;

  /** A selected room's highlight colour, from `--primary`. */
  readonly roomSelected: InstanceType<(typeof import('three'))['Color']>;

  /** A floor's slab colour, from `--muted`. */
  readonly floorSlab: InstanceType<(typeof import('three'))['Color']>;

  /** A floor's `EdgesGeometry` line colour, from `--border`. */
  readonly edges: InstanceType<(typeof import('three'))['Color']>;
}
