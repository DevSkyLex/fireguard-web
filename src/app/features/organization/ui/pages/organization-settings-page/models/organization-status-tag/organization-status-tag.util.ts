import type { OrganizationStatusTagDescriptor } from './organization-status-tag-descriptor.interface';

/**
 * Descriptors for `OrganizationOutput.status`. `active` is the healthy state
 * and carries success; `suspended` is a recoverable, operator-caused state
 * and carries warning; `archived` is a further, less recoverable state and
 * carries danger.
 */
const STATUS: Readonly<Record<string, OrganizationStatusTagDescriptor>> = {
  active: {
    label: $localize`:@@org.settings.danger.status.active:Active`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  suspended: {
    label: $localize`:@@org.settings.danger.status.suspended:Suspended`,
    severity: 'warning',
    icon: 'lucideBan',
  },
  archived: {
    label: $localize`:@@org.settings.danger.status.archived:Archived`,
    severity: 'danger',
    icon: 'lucideArchive',
  },
};

/**
 * Function resolveOrganizationStatusTag
 * @function resolveOrganizationStatusTag
 *
 * @description
 * Resolves the presentation descriptor for an organization status value.
 * Falls back to a neutral, humanised descriptor for an unknown value so the
 * Danger zone degrades to a readable label instead of rendering nothing.
 *
 * @since 1.9.0
 *
 * @param {string} value - Raw `OrganizationOutput.status` value.
 *
 * @returns {OrganizationStatusTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveOrganizationStatusTag(value: string): OrganizationStatusTagDescriptor {
  return (
    STATUS[value] ?? {
      label: value.replaceAll('_', ' '),
      severity: 'neutral',
      icon: 'lucideCircleDot',
    }
  );
}
