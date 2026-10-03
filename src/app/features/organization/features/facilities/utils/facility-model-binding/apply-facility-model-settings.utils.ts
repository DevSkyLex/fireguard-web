import type {
  FacilityModelInput,
  FacilityModelOutput,
} from '@features/organization/features/facilities/models';

/**
 * Function applyFacilityModelSettings
 *
 * @description
 * Projects local alignment and explicit association edits without discarding unrelated masked data.
 *
 * @param {FacilityModelOutput} model - Latest safe model resource.
 * @param {FacilityModelInput} settings - Unsaved settings intent.
 *
 * @returns {FacilityModelOutput} Model suitable for an isolated local preview.
 */
export function applyFacilityModelSettings(
  model: FacilityModelOutput,
  settings: FacilityModelInput,
): FacilityModelOutput {
  const removed = settings.removeBindingNodeIndices ?? [];
  const bindings = (settings.bindings ?? model.bindings).filter(
    (binding) => !removed.includes(binding.nodeIndex),
  );
  const clearAll = settings.bindings != null && settings.bindings.length === 0;
  return {
    ...model,
    transform: settings.transform,
    bindings,
    bindingIssues: model.bindingIssues.filter(
      (issue) =>
        !clearAll &&
        !removed.includes(issue.nodeIndex) &&
        !settings.bindings?.some((binding) => binding.nodeIndex === issue.nodeIndex),
    ),
  };
}
