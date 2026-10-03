import type { FacilityModelOutput } from '@features/organization/features/facilities/models';
import { applyFacilityModelSettings } from '../apply-facility-model-settings.utils';
import { resolveFacilityModelBinding } from '../facility-model-binding.utils';

const model: FacilityModelOutput = {
  '@id': '',
  '@type': 'FacilityModel',
  id: 'model-1',
  organizationId: 'org-1',
  buildingId: 'building-1',
  fileName: 'building.glb',
  mimeType: 'model/gltf-binary',
  fileSize: 100,
  nodeCount: 4,
  nodes: [],
  revision: 1,
  active: true,
  transform: { scale: 1, rotationDegrees: 0, translation: { x: 0, y: 0, z: 0 } },
  bindings: [{ nodeIndex: 3, facilityId: 'floor-1' }],
  bindingIssues: [
    { nodeIndex: 1, code: 'target_unavailable' },
    { nodeIndex: 2, code: 'target_unavailable' },
  ],
  downloadUrl: '',
  createdAt: '',
  updatedAt: '',
};

describe('Facility model bindings', () => {
  it('stops inherited facility selection at the closest unavailable source association', () => {
    expect(resolveFacilityModelBinding(model, [0, 1, 3])).toEqual({
      facilityId: null,
      unavailable: true,
    });
    expect(resolveFacilityModelBinding(model, [0, 3])).toEqual({
      facilityId: 'floor-1',
      unavailable: false,
    });
    expect(
      resolveFacilityModelBinding(
        { ...model, bindings: [{ nodeIndex: 0, facilityId: 'room-1' }, ...model.bindings] },
        [0, 1, 3],
      ),
    ).toEqual({ facilityId: 'room-1', unavailable: false });
  });

  it('preserves every masked issue during an alignment-only local preview', () => {
    const preview = applyFacilityModelSettings(model, {
      transform: { ...model.transform, scale: 2 },
    });
    expect(preview.bindingIssues).toEqual(model.bindingIssues);
    expect(preview.bindings).toEqual(model.bindings);
    expect(preview.transform.scale).toBe(2);
    expect(model.transform.scale).toBe(1);
  });

  it('preserves other masked targets when one object is reassigned or explicitly removed', () => {
    const preview = applyFacilityModelSettings(model, {
      transform: model.transform,
      bindings: [{ nodeIndex: 1, facilityId: 'room-1' }, ...model.bindings],
    });
    expect(preview.bindingIssues).toEqual([{ nodeIndex: 2, code: 'target_unavailable' }]);
    const removed = applyFacilityModelSettings(model, {
      transform: model.transform,
      removeBindingNodeIndices: [1, 3],
    });
    expect(removed.bindingIssues).toEqual([{ nodeIndex: 2, code: 'target_unavailable' }]);
    expect(removed.bindings).toEqual([]);
    expect(model.bindings).toHaveLength(1);
  });

  it('distinguishes an explicit clear-all from omitted or null association payloads', () => {
    expect(
      applyFacilityModelSettings(model, { transform: model.transform, bindings: [] }).bindingIssues,
    ).toEqual([]);
    expect(
      applyFacilityModelSettings(model, { transform: model.transform, bindings: null })
        .bindingIssues,
    ).toEqual(model.bindingIssues);
  });
});
