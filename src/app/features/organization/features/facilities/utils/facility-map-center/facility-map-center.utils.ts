import type { FacilityOutput } from '@features/organization/features/facilities/models';
import type { MapCoordinates } from '@shared/map';

/**
 * Function resolveFacilityMapCenter
 *
 * @description
 * Picks where the "Pick on map" picker should open, in priority order: the
 * coordinates already entered in the draft, then the average position of
 * whatever located facilities were passed in (cheap only when the caller
 * already loaded them for another reason — never fetched for this alone),
 * then `undefined` so the map primitive falls back to its own neutral
 * default.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {MapCoordinates | null} preferred - The draft's own coordinates, when both are filled.
 * @param {readonly FacilityOutput[]} [facilities] - Already-loaded facilities to average as a fallback.
 *
 * @returns {MapCoordinates | undefined} Where the picker should center, or `undefined` for the primitive's default.
 */
export function resolveFacilityMapCenter(
  preferred: MapCoordinates | null,
  facilities: readonly FacilityOutput[] = [],
): MapCoordinates | undefined {
  if (preferred) return preferred;

  const located: MapCoordinates[] = facilities
    .filter(
      (facility): facility is FacilityOutput & { latitude: number; longitude: number } =>
        facility.latitude != null && facility.longitude != null,
    )
    .map((facility) => ({ latitude: facility.latitude, longitude: facility.longitude }));

  if (located.length === 0) return undefined;

  const sum = located.reduce(
    (acc, point) => ({
      latitude: acc.latitude + point.latitude,
      longitude: acc.longitude + point.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return { latitude: sum.latitude / located.length, longitude: sum.longitude / located.length };
}
