/**
 * Serialises a {@link Date} to the RFC 3339 representation the intervention API
 * accepts (`Y-m-d\TH:i:sP`, validated server-side with `Assert\DateTime` using
 * `DateTimeInterface::ATOM`). `Date.toISOString()` appends milliseconds
 * (`.000Z`), which that constraint rejects, so they are dropped here while the
 * UTC `Z` designator is preserved.
 *
 * @param date the date to serialise.
 * @returns the seconds-precision UTC datetime string, e.g. `2026-07-01T09:00:00Z`.
 */
export function toApiDateTime(date: Date): string {
  return `${date.toISOString().slice(0, 19)}Z`;
}
