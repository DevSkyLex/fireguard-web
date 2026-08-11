/**
 * Type FacilityEditTarget
 *
 * @description
 * The facility properties `UpdateFacilityInput` accepts, each edited where it
 * is displayed (`ARCHITECTURE.md` §10.5). `coordinates` covers `latitude` and
 * `longitude` together — the pair is captured and edited as one field,
 * enforced both-or-neither. `type` and the parent stay read-only elsewhere in
 * the panel: `UpdateFacilityInput` accepts neither.
 *
 * @since 1.0.0
 */
export type FacilityEditTarget = 'name' | 'code' | 'address' | 'coordinates';
