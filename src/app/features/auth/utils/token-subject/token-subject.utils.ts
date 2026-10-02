/**
 * Function readJwtSubject
 *
 * @description
 * Reads the ownership claim of a bearer returned by the trusted API. This does not
 * verify a signature or grant authorization; the server performs authentication.
 *
 * @since 1.0.0
 *
 * @param {string} token - Access token whose owner is being compared.
 *
 * @returns {string | null} Subject, or null when the claim cannot be read.
 */
export function readJwtSubject(token: string): string | null {
  const parts = token.split('.');
  const payload = parts[1];
  if (
    parts.length !== 3 ||
    !payload ||
    payload.length > 20_000 ||
    !/^[A-Za-z0-9_-]+$/.test(payload)
  )
    return null;
  try {
    const base64 = payload.replaceAll('-', '+').replaceAll('_', '/');
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const claims: unknown = JSON.parse(decoded);
    if (typeof claims !== 'object' || claims === null || Array.isArray(claims)) return null;
    const subject = (claims as Record<string, unknown>)['sub'];
    return typeof subject === 'string' && subject.trim().length > 0 ? subject : null;
  } catch {
    return null;
  }
}
