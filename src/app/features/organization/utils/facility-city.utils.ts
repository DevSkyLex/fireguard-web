import type { FacilityOutput } from '@features/organization/features/facilities/models';

/**
 * Metadata key the map page uses to store a facility's city.
 *
 * `FacilityOutput` has no dedicated `city` field — only a free-text
 * `address` — so this reads/writes the facility's existing, backend-sanctioned
 * `metadata` bag (`Record<string, string | null>`) instead of overloading
 * `address`, which describes a full postal address, not a city name. This is
 * an organization-feature convention, not a backend contract — see the
 * facilities feature's FEATURE.md for the gap this works around.
 */
const CITY_METADATA_KEY = 'city';

/**
 * Reads a facility's city out of its metadata bag.
 *
 * @param facility - The facility to read.
 * @returns The city, or `null` when absent or blank.
 */
export function resolveFacilityCity(facility: FacilityOutput): string | null {
  const city: string | null = facility.metadata?.[CITY_METADATA_KEY] ?? null;
  return city !== null && city.trim() !== '' ? city : null;
}

/**
 * Builds the metadata patch to persist a city, for the create payload.
 *
 * @param city - Raw form value; blank is treated as "no city".
 * @returns A metadata bag carrying the city, or `undefined` when blank.
 */
export function toFacilityCityMetadata(city: string): Record<string, string> | undefined {
  const trimmed: string = city.trim();
  return trimmed === '' ? undefined : { [CITY_METADATA_KEY]: trimmed };
}
