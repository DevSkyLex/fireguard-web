import type { SubscriptionStatus } from '@features/organization/models';
import type { SubscriptionStatusTagDescriptor } from './subscription-status-tag-descriptor.interface';

/**
 * Descriptors for `OrganizationSubscriptionOutput.status`. `active` is the one
 * healthy state and carries success; `canceled` and `incomplete_expired` are
 * terminal negative states and carry danger; `past_due` and `unpaid` are
 * payment problems the organization can still recover from, so they carry
 * warning rather than danger; `trialing` is the baseline expected state
 * (info); `incomplete` and `paused` are transitional and stay neutral.
 */
const STATUS: Record<SubscriptionStatus, SubscriptionStatusTagDescriptor> = {
  active: {
    label: $localize`:@@org.settings.subscriptionStatus.active:Active`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  trialing: {
    label: $localize`:@@org.settings.subscriptionStatus.trialing:Trial`,
    severity: 'neutral',
    icon: 'lucideClock',
  },
  past_due: {
    label: $localize`:@@org.settings.subscriptionStatus.pastDue:Payment past due`,
    severity: 'warning',
    icon: 'lucideCircleAlert',
  },
  unpaid: {
    label: $localize`:@@org.settings.subscriptionStatus.unpaid:Unpaid`,
    severity: 'warning',
    icon: 'lucideCircleAlert',
  },
  incomplete: {
    label: $localize`:@@org.settings.subscriptionStatus.incomplete:Payment incomplete`,
    severity: 'warning',
    icon: 'lucideCircleAlert',
  },
  incomplete_expired: {
    label: $localize`:@@org.settings.subscriptionStatus.incompleteExpired:Expired`,
    severity: 'danger',
    icon: 'lucideBan',
  },
  canceled: {
    label: $localize`:@@org.settings.subscriptionStatus.canceled:Canceled`,
    severity: 'danger',
    icon: 'lucideBan',
  },
  paused: {
    label: $localize`:@@org.settings.subscriptionStatus.paused:Paused`,
    severity: 'neutral',
    icon: 'lucideClock',
  },
};

/**
 * Function resolveSubscriptionStatusTag
 * @function resolveSubscriptionStatusTag
 *
 * @description
 * Resolves the presentation descriptor for a subscription status value. Falls
 * back to a neutral, humanised descriptor for an unknown value so the summary
 * degrades to a readable label instead of rendering nothing.
 *
 * @since 1.0.0
 *
 * @param {string} value - Raw `SubscriptionStatus` value.
 *
 * @returns {SubscriptionStatusTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveSubscriptionStatusTag(value: string): SubscriptionStatusTagDescriptor {
  return (
    STATUS[value as SubscriptionStatus] ?? {
      label: value.replace(/_/g, ' '),
      severity: 'neutral',
      icon: 'lucideClock',
    }
  );
}
