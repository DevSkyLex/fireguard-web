/**
 * Function resolveReturnUrl
 *
 * @description
 * Validates a raw `returnUrl` query parameter and returns a safe internal
 * destination. Only absolute in-app paths are accepted; protocol-relative
 * (`//host`), backslash-obfuscated (`/\host`, which some browsers normalise to
 * `//host`) and absolute URLs (`https://…`) are rejected to prevent
 * open-redirect attacks, falling back to the provided default.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string | null | undefined} raw - The raw `returnUrl` query value.
 * @param {string} fallback - The destination used when `raw` is unsafe or absent.
 *
 * @returns {string} A safe internal path to navigate to.
 */
export function resolveReturnUrl(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || raw.includes('://')) {
    return fallback;
  }
  return raw;
}
