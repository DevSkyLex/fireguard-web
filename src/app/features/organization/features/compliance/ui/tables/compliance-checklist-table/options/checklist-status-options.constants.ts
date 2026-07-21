import type { ChecklistStatus } from '@features/organization/features/checklists/models';

/**
 * Static status filter options for the Compliance page's Checklists toolbar.
 * Labels reuse the app-wide `status.active` / `status.archived` strings
 * already used by other lifecycle-status filters, since checklists have no
 * dedicated tag registry.
 *
 * @since 2.1.0
 */
export const CHECKLIST_STATUS_OPTIONS: ReadonlyArray<{
  readonly label: string;
  readonly value: ChecklistStatus;
}> = [
  { value: 'active', label: $localize`:@@status.active:Active` },
  { value: 'archived', label: $localize`:@@status.archived:Archived` },
];
