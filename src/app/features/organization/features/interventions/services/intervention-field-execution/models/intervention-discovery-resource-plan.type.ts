import type {
  InterventionOutboxPayloadMap,
  InterventionOutboxType,
} from '@features/organization/features/interventions/models';

/**
 * Type InterventionDiscoveryResourcePlan
 *
 * @description
 * Prepared canonical resource creation for a field discovery.
 *
 * @type {InterventionDiscoveryResourcePlan}
 */
export type InterventionDiscoveryResourcePlan = {
  [Type in Extract<
    InterventionOutboxType,
    'facility.create' | 'equipment.create' | 'inspection.create'
  >]: {
    readonly type: Type;
    readonly payload: InterventionOutboxPayloadMap[Type];
    readonly targetResource: string;
    readonly resultResource?: string;
  };
}[Extract<InterventionOutboxType, 'facility.create' | 'equipment.create' | 'inspection.create'>];
