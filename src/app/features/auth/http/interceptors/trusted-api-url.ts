/**
 * Function trustedApiUrl
 *
 * @description
 * Resolves a request within the configured authenticated API boundary.
 * Bearer attachment and renewal share this check so retries cannot send a
 * session token to an unrelated origin, path or URL containing credentials.
 *
 * @param requestUrl Outgoing HTTP request URL.
 * @param apiUrl Configured API base URL.
 *
 * @returns The trusted canonical URL, or null when it is outside the boundary.
 */
export function trustedApiUrl(requestUrl: string, apiUrl: string): URL | null {
  try {
    const api = new URL(apiUrl);
    const target = new URL(requestUrl, api);
    if (target.origin !== api.origin || !target.pathname.startsWith('/api/')) return null;
    if (target.username || target.password) return null;
    return target;
  } catch {
    return null;
  }
}
