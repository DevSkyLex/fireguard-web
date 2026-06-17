import type { NonConformitySeverity } from '@features/organization/features/inspections/models';
import type { TagDescriptor } from '@shared/components';

/**
 * Type NonConformitySeverityOption
 *
 * @description
 * Select option exposing a dashboard non-conformity severity filter. Extends
 * the shared {@link TagDescriptor} (`label`, `severity`, `icon`) so it renders
 * through `<app-tag>`, and adds the dashboard `value` plus the raw hex `color`
 * consumed by the trend chart canvas.
 */
export type NonConformitySeverityOption = TagDescriptor & {
  readonly value: NonConformitySeverity;
  readonly color: string;
};
