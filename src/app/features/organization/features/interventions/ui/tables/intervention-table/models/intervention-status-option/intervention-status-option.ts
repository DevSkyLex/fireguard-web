import type { InterventionStatus } from '@features/organization/features/interventions/models';
import type { TagOption } from '@shared/components';

/**
 * Type InterventionStatusOption
 * @typedef InterventionStatusOption
 *
 * @description
 * Display metadata used to render intervention status options in the
 * intervention table status filter — the shared {@link TagOption} generic
 * specialized to the intervention status enum.
 *
 * @since 1.0.0
 */
export type InterventionStatusOption = TagOption<InterventionStatus>;
