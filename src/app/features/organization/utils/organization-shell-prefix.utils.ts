/**
 * Function organizationShellPrefix
 * @function organizationShellPrefix
 *
 * @description
 * Builds the router-link prefix for an organization-scoped destination, in the
 * shell the caller is currently in.
 *
 * The same organization pages are mounted under two shells — the dashboard tree
 * (`/organizations/:id/...`) and the workspace tree
 * (`/organizations/:id/workspace/...`). A component shared by both cannot
 * hard-code either prefix: a dashboard-tree link followed from inside the
 * workspace ejects the member out of the shell. The current URL is the only
 * thing that distinguishes the two.
 *
 * @access public
 * @since 1.1.0
 *
 * @param {string} url - The current router URL (`Router.url`).
 * @param {string} organizationId - The active organization's bare id.
 *
 * @returns {string[]} The prefix, ready to spread before the page segment.
 */
export function organizationShellPrefix(url: string, organizationId: string): string[] {
  const base: string[] = ['/organizations', organizationId];

  // A `/workspace` segment scoped to THIS organization, so a stray occurrence
  // elsewhere in the URL cannot flip the shell.
  return url.includes(`/organizations/${organizationId}/workspace`) ? [...base, 'workspace'] : base;
}
