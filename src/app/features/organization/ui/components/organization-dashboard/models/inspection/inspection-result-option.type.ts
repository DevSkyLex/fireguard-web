import type { InspectionResult } from '@features/organization/features/inspections/models';
import type { TagDescriptor } from '@shared/components';

/**
 * Type InspectionResultOption
 *
 * @description
 * Select option exposing a dashboard inspection result filter. Extends the
 * shared {@link TagDescriptor} (`label`, `severity`, `icon`) so it renders
 * through `<app-tag>`, and adds the dashboard `value` plus the raw hex `color`
 * consumed by the trend chart canvas.
 */
export type InspectionResultOption = TagDescriptor & {
  readonly value: InspectionResult;
  readonly color: string;
};
