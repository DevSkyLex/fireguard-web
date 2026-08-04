import type { InspectionStatus } from '@features/organization/features/inspections/models';
import type { TagDescriptor } from '@shared/tag';

/**
 * Type InspectionStatusOption
 *
 * @description
 * Select option exposing a dashboard inspection status filter. Extends the
 * shared {@link TagDescriptor} (`label`, `severity`, `icon`) so it renders
 * through `p-tag`, and adds the dashboard `value` plus the raw hex `color`
 * consumed by the trend chart canvas.
 */
export type InspectionStatusOption = TagDescriptor & {
  readonly value: InspectionStatus;
  readonly color: string;
};
