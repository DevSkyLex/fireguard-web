import type { TagDescriptor } from '@shared/components/tag';
import type { SubscriptionStatus } from '../billing/subscription-status.type';

/**
 * Constant SUBSCRIPTION_STATUS_DESCRIPTORS
 *
 * @description
 * Presentation registry mapping each subscription status to its badge descriptor
 * (label, severity colour role, icon) for the shared `<app-tag>` component.
 * Status is never conveyed by colour alone — each entry pairs a colour with a
 * label and icon.
 *
 * @type {Readonly<Record<SubscriptionStatus, TagDescriptor>>}
 */
const SUBSCRIPTION_STATUS_DESCRIPTORS: Readonly<Record<SubscriptionStatus, TagDescriptor>> = {
  active: { label: 'Active', severity: 'success', icon: 'pi pi-check-circle' },
  trialing: { label: 'Trial', severity: 'info', icon: 'pi pi-clock' },
  past_due: { label: 'Past due', severity: 'warn', icon: 'pi pi-exclamation-triangle' },
  incomplete: { label: 'Incomplete', severity: 'warn', icon: 'pi pi-hourglass' },
  incomplete_expired: { label: 'Expired', severity: 'danger', icon: 'pi pi-times-circle' },
  unpaid: { label: 'Unpaid', severity: 'danger', icon: 'pi pi-exclamation-circle' },
  canceled: { label: 'Canceled', severity: 'secondary', icon: 'pi pi-ban' },
  paused: { label: 'Paused', severity: 'secondary', icon: 'pi pi-pause-circle' },
};

/**
 * Fallback descriptor for an unknown status value.
 *
 * @type {TagDescriptor}
 */
const UNKNOWN_STATUS_DESCRIPTOR: TagDescriptor = {
  label: 'Unknown',
  severity: 'secondary',
  icon: 'pi pi-question-circle',
};

/**
 * Function resolveSubscriptionStatusTag
 *
 * @description
 * Resolves a subscription status to its badge descriptor, with a graceful
 * fallback for unknown values.
 *
 * @param {(SubscriptionStatus | string | null | undefined)} status - The status to resolve.
 *
 * @returns {TagDescriptor} The resolved presentation descriptor.
 */
export function resolveSubscriptionStatusTag(
  status: SubscriptionStatus | string | null | undefined,
): TagDescriptor {
  if (status != null && status in SUBSCRIPTION_STATUS_DESCRIPTORS) {
    return SUBSCRIPTION_STATUS_DESCRIPTORS[status as SubscriptionStatus];
  }

  return UNKNOWN_STATUS_DESCRIPTOR;
}
