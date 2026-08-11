import type { QuotaStatus } from '@features/organization/models';
import type { QuotaStatusTagDescriptor } from './quota-status-tag-descriptor.interface';

/**
 * Descriptors for `QuotaStatus`. `ok` carries no attention and stays neutral;
 * `near` and `full` are the two states worth a reader's attention, so they
 * alone carry colour, matching the two-ends rule the status tag registries
 * elsewhere in this feature already apply.
 */
const STATUS: Record<QuotaStatus, QuotaStatusTagDescriptor> = {
  ok: {
    label: $localize`:@@org.settings.usage.statusOk:OK`,
    severity: 'neutral',
    icon: 'lucideGauge',
  },
  near: {
    label: $localize`:@@org.settings.usage.statusNear:Near limit`,
    severity: 'warning',
    icon: 'lucideCircleAlert',
  },
  full: {
    label: $localize`:@@org.settings.usage.statusFull:Limit reached`,
    severity: 'danger',
    icon: 'lucideCircleAlert',
  },
};

/**
 * Function resolveQuotaStatusTag
 * @function resolveQuotaStatusTag
 *
 * @description
 * Resolves the presentation descriptor for a quota status value.
 *
 * @since 1.0.0
 *
 * @param {QuotaStatus} status - The resolved quota status.
 *
 * @returns {QuotaStatusTagDescriptor} The matching descriptor.
 */
export function resolveQuotaStatusTag(status: QuotaStatus): QuotaStatusTagDescriptor {
  return STATUS[status];
}
