import type { InterventionWorkItemStatus } from '@features/organization/features/interventions/models';
import type { TagOption } from '@shared/components';

/**
 * Type WorkItemStatusOption
 * @typedef WorkItemStatusOption
 *
 * @description
 * Work item status filter option used by the intervention work-item table — the
 * shared {@link TagOption} generic specialized to the work-item status enum, so
 * the same descriptor drives both the `<app-tag>` rendering and the table's
 * status filter.
 *
 * @since 1.0.0
 */
export type WorkItemStatusOption = TagOption<InterventionWorkItemStatus>;
