import type { ChecklistStatus } from '../checklist/checklist-output.interface';
import type { ChecklistStatusTagDescriptor } from './checklist-status-tag-descriptor.interface';

/**
 * Descriptors for `ChecklistOutput.status`. `active` is the usable state and
 * carries success; `archived` is a reversible, inert state rather than a
 * failure, so it stays neutral rather than danger.
 */
const STATUS: Record<ChecklistStatus, ChecklistStatusTagDescriptor> = {
  active: {
    label: $localize`:@@checklistStatus.active:Active`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  archived: {
    label: $localize`:@@checklistStatus.archived:Archived`,
    severity: 'neutral',
    icon: 'lucideArchive',
  },
};

/**
 * Function resolveChecklistStatusTag
 *
 * @description
 * Resolves the presentation descriptor for a checklist status. `value` is
 * typed to the closed `ChecklistStatus` union and `STATUS` is a total map
 * over it, so every call resolves — there is no fallback branch to keep
 * reachable, and a future third status becomes a compile error here rather
 * than a silently humanised label (`ARCHITECTURE.md` §10.10).
 *
 * @access public
 * @since 1.0.0
 *
 * @param {ChecklistStatus} value - The checklist's status.
 *
 * @returns {ChecklistStatusTagDescriptor} The matching descriptor.
 */
export function resolveChecklistStatusTag(value: ChecklistStatus): ChecklistStatusTagDescriptor {
  return STATUS[value];
}
