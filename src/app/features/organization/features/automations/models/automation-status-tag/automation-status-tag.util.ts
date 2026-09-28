import type { AutomationAttemptOutput } from '../automation/automation-output.interface';
import type { AutomationStatusTagDescriptor } from './automation-status-tag-descriptor.interface';

/** Status descriptors for every `AutomationAttemptOutput['status']` value. */
const AUTOMATION_STATUS: Record<AutomationAttemptOutput['status'], AutomationStatusTagDescriptor> =
  {
    pending: {
      label: $localize`:@@automation.status.queued:Queued`,
      severity: 'neutral',
      icon: 'lucideClock',
    },
    running: {
      label: $localize`:@@automation.status.running:Running`,
      severity: 'neutral',
      icon: 'lucideLoader',
    },
    failed: {
      label: $localize`:@@automation.status.failed:Failed`,
      severity: 'danger',
      icon: 'lucideCircleX',
    },
    succeeded: {
      label: $localize`:@@automation.status.completed:Completed`,
      severity: 'success',
      icon: 'lucideCircleCheck',
    },
    skipped: {
      label: $localize`:@@automation.status.skipped:Skipped`,
      severity: 'neutral',
      icon: 'lucideCircleSlash',
    },
  };

/**
 * Function resolveAutomationStatusTag
 *
 * @description
 * Resolves the presentation descriptor for an automation attempt's status.
 * Falls back to a neutral, humanised descriptor for an unknown value so the
 * UI degrades to a readable label instead of rendering nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} value - Raw status value.
 *
 * @returns {AutomationStatusTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveAutomationStatusTag(value: string): AutomationStatusTagDescriptor {
  return (
    AUTOMATION_STATUS[value as AutomationAttemptOutput['status']] ?? {
      label: value.replaceAll('_', ' '),
      severity: 'neutral',
      icon: 'lucideTag',
    }
  );
}
