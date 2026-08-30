import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import type { OrganizationSwitcherQuickLinkDefinition } from '../models';

/**
 * Constant ORGANIZATION_SWITCHER_QUICK_LINKS
 *
 * @description
 * The switcher menu's admin shortcuts, in render order. Billing reuses the
 * organization settings route with its `subscription` tab query param — there
 * is no dedicated `/billing` route.
 *
 * @since 3.0.0
 */
export const ORGANIZATION_SWITCHER_QUICK_LINKS: ReadonlyArray<OrganizationSwitcherQuickLinkDefinition> =
  [
    {
      id: 'settings',
      label: $localize`:@@org.switcher.settings:Settings`,
      icon: 'lucideSettings',
      path: 'settings',
      queryParams: null,
      permissions: [ORGANIZATION_PERMISSION.SETTINGS_WRITE],
      match: 'all',
    },
    {
      id: 'billing',
      label: $localize`:@@org.switcher.billing:Billing`,
      icon: 'lucideCreditCard',
      path: 'settings',
      queryParams: { tab: 'subscription' },
      permissions: [ORGANIZATION_PERMISSION.SETTINGS_WRITE],
      match: 'all',
    },
    {
      id: 'members',
      label: $localize`:@@org.switcher.members:Members`,
      icon: 'lucideUsers',
      path: 'members',
      queryParams: null,
      permissions: [ORGANIZATION_PERMISSION.MEMBERS_READ, ORGANIZATION_PERMISSION.MEMBERS_MANAGE],
      match: 'any',
    },
    {
      id: 'audit',
      label: $localize`:@@org.switcher.audit:Audit journal`,
      icon: 'lucideHistory',
      path: 'audit',
      queryParams: null,
      permissions: [ORGANIZATION_PERMISSION.AUDIT_READ],
      match: 'all',
    },
  ];
