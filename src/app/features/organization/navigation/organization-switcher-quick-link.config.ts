import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import type { OrganizationSwitcherQuickLinkDefinition } from './organization-switcher-quick-link-definition.interface';

/**
 * Constant ORGANIZATION_SWITCHER_QUICK_LINKS
 *
 * @description
 * Canonical switcher administration shortcuts, also consumed by More. Billing
 * retains the existing settings subscription tab rather than inventing a route.
 *
 * @since 3.0.0
 */
export const ORGANIZATION_SWITCHER_QUICK_LINKS: ReadonlyArray<OrganizationSwitcherQuickLinkDefinition> =
  [
    {
      id: 'settings',
      label: $localize`:@@org.switcher.settings:Settings`,
      icon: 'lucideSettings',
      shortcutKey: ',',
      path: 'settings',
      queryParams: null,
      permissions: [ORGANIZATION_PERMISSION.SETTINGS_WRITE],
      match: 'all',
    },
    {
      id: 'billing',
      label: $localize`:@@org.switcher.billing:Billing`,
      icon: 'lucideCreditCard',
      shortcutKey: 'B',
      path: 'settings',
      queryParams: { tab: 'subscription' },
      permissions: [ORGANIZATION_PERMISSION.SETTINGS_WRITE],
      match: 'all',
    },
    {
      id: 'members',
      label: $localize`:@@org.switcher.members:Members`,
      icon: 'lucideUsers',
      shortcutKey: 'M',
      path: 'members',
      queryParams: null,
      permissions: [ORGANIZATION_PERMISSION.MEMBERS_READ, ORGANIZATION_PERMISSION.MEMBERS_MANAGE],
      match: 'any',
    },
    {
      id: 'webhooks',
      label: $localize`:@@route.webhooks:Webhooks`,
      icon: 'lucideWebhook',
      shortcutKey: '',
      path: 'integrations/webhooks',
      queryParams: null,
      permissions: [ORGANIZATION_PERMISSION.WEBHOOKS_READ],
      match: 'all',
    },
    {
      id: 'audit',
      label: $localize`:@@org.switcher.audit:Audit journal`,
      icon: 'lucideHistory',
      shortcutKey: 'J',
      path: 'audit',
      queryParams: null,
      permissions: [ORGANIZATION_PERMISSION.AUDIT_READ],
      match: 'all',
    },
  ];
