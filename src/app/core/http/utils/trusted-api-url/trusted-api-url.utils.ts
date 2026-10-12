/**
 * Function trustedApiUrl
 *
 * @description
 * Resolves a request only within the configured API origin and path boundary, excluding URL
 * credentials. This pure check does not attach transport headers.
 *
 * @access public
 * @since unreleased
 *
 * @param {string} requestUrl - Outgoing HTTP URL.
 * @param {string} apiUrl - Configured API base URL.
 *
 * @returns {URL | null} The trusted canonical URL or null.
 */
export function trustedApiUrl(requestUrl: string, apiUrl: string): URL | null {
  try {
    const api = new URL(apiUrl);
    const target = new URL(requestUrl, api);
    return target.origin === api.origin &&
      target.pathname.startsWith('/api/') &&
      !target.username &&
      !target.password
      ? target
      : null;
  } catch {
    return null;
  }
}
