import type { OrganizationDashboardEquipmentStatus } from '@features/organization/models';
import type { TagDescriptor } from '@shared/components';

/**
 * Type EquipmentStatusOption
 *
 * @description
 * Select option exposing a dashboard equipment status filter. Extends the
 * shared {@link TagDescriptor} (`label`, `severity`, `icon`) so it renders
 * through `<app-tag>`, and adds the dashboard `value` plus the raw hex `color`
 * consumed by the trend chart canvas.
 */
export type EquipmentStatusOption = TagDescriptor & {
  readonly value: OrganizationDashboardEquipmentStatus;
  readonly color: string;
};
