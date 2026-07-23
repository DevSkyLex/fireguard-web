import { OrganizationRail } from '@features/organization/ui/components/organization-rail';
import type { WorkspaceLayoutRailSlotFeature } from '@layouts/workspace-layout';

/**
 * Function withOrganizationRail
 * @function withOrganizationRail
 *
 * @description
 * Registers the {@link OrganizationRail} tiles into the workspace layout's
 * rail slot (`lead` region, stacked from the top).
 *
 * Use inside {@link provideWorkspaceLayoutSlots}:
 * ```typescript
 * provideWorkspaceLayoutSlots({ rail: [withOrganizationRail()] })
 * ```
 *
 * @returns {WorkspaceLayoutRailSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withOrganizationRail(): WorkspaceLayoutRailSlotFeature {
  return {
    useFactory: () => ({
      id: 'organization-rail',
      order: 10,
      region: 'lead',
      component: OrganizationRail,
    }),
  };
}
