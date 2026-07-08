import type { InterventionType } from '@features/organization/features/interventions/models';
import type { TagOption } from '@shared/components';

/**
 * Type InterventionTypeOption
 * @typedef InterventionTypeOption
 *
 * @description
 * Display metadata used to render intervention type options in the intervention
 * table filter popover — the shared {@link TagOption} generic specialized to the
 * intervention type enum.
 *
 * @since 1.0.0
 */
export type InterventionTypeOption = TagOption<InterventionType>;
