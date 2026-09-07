import type { OnboardingSetupPayload } from '@features/onboarding/models';

/**
 * Function setupPayloadKey
 * @description Compares transport inputs independent of property order and optional nulls. This is a matching key, never a server idempotency proof.
 * @access public
 * @since 1.1.0
 * @param {OnboardingSetupPayload} payload - A prepared wire payload.
 * @returns {string} Canonical comparison key.
 */
export function setupPayloadKey(payload: OnboardingSetupPayload): string {
  return JSON.stringify(
    Object.entries(payload)
      .map(
        ([key, value]) =>
          [
            key,
            key === 'email' && typeof value === 'string'
              ? value.trim().toLowerCase()
              : Array.isArray(value)
                ? value.filter((item) => item !== null)
                : value,
          ] as const,
      )
      .filter(
        ([, value]) =>
          value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0),
      )
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, Array.isArray(value) ? value.toSorted() : value]),
  );
}
