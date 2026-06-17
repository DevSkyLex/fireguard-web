import type { NonConformityStatus } from '@features/organization/features/inspections/models';
import type { TagDescriptor } from '@shared/components';

/**
 * Type NonConformityStatusOption
 *
 * @description
 * Select option exposing a dashboard non-conformity status filter. Extends the
 * shared {@link TagDescriptor} (`label`, `severity`, `icon`) so it renders
 * through `<app-tag>`, and adds the dashboard `value` plus the raw hex `color`
 * consumed by the trend chart canvas.
 */
export type NonConformityStatusOption = TagDescriptor & {
  readonly value: NonConformityStatus;
  readonly color: string;
};
