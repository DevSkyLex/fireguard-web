import type { FacilityModelOutput } from '@features/organization/features/facilities/models';

/**
 * Function resolveFacilityModelBinding
 *
 * @description
 * Resolves the closest usable node association, stopping inheritance at an unavailable target.
 *
 * @param {Pick<FacilityModelOutput, 'bindings' | 'bindingIssues'>} model - Safe public
 *   associations.
 * @param {readonly number[]} nodePath - Source indices ordered from the object to its ancestors.
 *
 * @returns {{ facilityId: string | null; unavailable: boolean }} Safe nearest association.
 */
export function resolveFacilityModelBinding(
  model: Pick<FacilityModelOutput, 'bindings' | 'bindingIssues'>,
  nodePath: readonly number[],
): { facilityId: string | null; unavailable: boolean } {
  for (const index of nodePath) {
    if (model.bindingIssues.some((issue) => issue.nodeIndex === index))
      return { facilityId: null, unavailable: true };
    const binding = model.bindings.find((candidate) => candidate.nodeIndex === index);
    if (binding) return { facilityId: binding.facilityId, unavailable: false };
  }
  return { facilityId: null, unavailable: false };
}
