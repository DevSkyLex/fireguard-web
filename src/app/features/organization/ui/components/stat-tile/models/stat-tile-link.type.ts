/**
 * Type StatTileLink
 *
 * @description
 * Accepted shapes for the tile's optional `routerLink` destination, matching
 * `RouterLink`'s own input type so the tile can pass it straight through.
 *
 * @since 1.0.0
 */
export type StatTileLink = string | readonly (string | number)[];
