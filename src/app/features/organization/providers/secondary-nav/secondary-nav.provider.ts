import { OrganizationWorkspaceNav } from '@features/organization/ui/components/organization-workspace-nav';
import type { WorkspaceLayoutSecondaryNavSlotFeature } from '@layouts/workspace-layout';

/**
 * Function withOrganizationWorkspaceNav
 * @function withOrganizationWorkspaceNav
 *
 * @description
 * Registers the organization's business destinations as the first section of
 * the workspace channel sidebar.
 *
 * Ordered ahead of the collaboration sections (favorites, channels) so the
 * sidebar reads the way the source prototype does: what the organization *is*,
 * then what the team is talking about.
 *
 * Use inside {@link provideWorkspaceLayoutSlots}:
 * ```typescript
 * provideWorkspaceLayoutSlots({ secondaryNav: [withOrganizationWorkspaceNav()] })
 * ```
 *
 * @returns {WorkspaceLayoutSecondaryNavSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withOrganizationWorkspaceNav(): WorkspaceLayoutSecondaryNavSlotFeature {
  return {
    useFactory: () => ({
      id: 'organization-workspace-nav',
      order: 10,
      component: OrganizationWorkspaceNav,
    }),
  };
}
