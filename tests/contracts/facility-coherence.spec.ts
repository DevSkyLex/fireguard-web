import { describe, expect, it } from 'vitest';
import type { EquipmentFacilitySummaryOutput } from '../../src/app/features/organization/features/equipments/models/equipment-summary/equipment-facility-summary-output.interface';
import { createContractValidator, loadOpenApi } from './support/openapi';

const document = loadOpenApi();
const validator = createContractValidator(document);
const organizationId = '11111111-1111-4111-8111-111111111111';
const facilityId = '22222222-2222-4222-8222-222222222222';
const collection = `/api/organizations/${organizationId}/facilities`;
const place = `${collection}/${facilityId}`;

describe('facility coherence contracts', () => {
  it('documents the required MOVE precondition and recoverable failures', () => {
    const operation =
      document.paths['/api/organizations/{organizationId}/facilities/{facilityId}/move']?.['post'];
    if (!operation || Array.isArray(operation)) throw new Error('MOVE operation is required.');
    expect(operation.parameters).toContainEqual(
      expect.objectContaining({ name: 'If-Match', in: 'header', required: true }),
    );
    for (const status of ['428', '412', '422']) expect(operation.responses).toHaveProperty(status);
  });

  it('keeps paths and eligible-parent filters on server collections', () => {
    const operation = document.paths['/api/organizations/{organizationId}/facilities']?.['get'];
    if (!operation || Array.isArray(operation))
      throw new Error('The place collection is required.');
    const names = operation.parameters?.map((parameter) => parameter.name) ?? [];
    expect(names).toEqual(
      expect.arrayContaining(['includePath', 'parentForType', 'parentForFacilityId']),
    );
    validator.request(
      'GET',
      `${collection}?includePath=true&parentForType=building&page=3`,
      '',
      null,
    );
  });

  for (const scope of ['direct', 'subtree'] as const) {
    it(`validates exact ${scope} totals without a preview collection`, () => {
      const summary: EquipmentFacilitySummaryOutput = {
        '@id': `${place}/equipment-summary`,
        '@type': 'FacilityEquipmentSummary',
        scope,
        totalItems: 251,
        byStatus: { operational: 220, in_stock: 1, under_maintenance: 20, decommissioned: 10 },
        needingAttentionCount: 30,
      };
      validator.request(
        'GET',
        `${place}/equipment-summary?includeDescendants=${scope === 'subtree'}`,
        '',
        null,
      );
      validator.response('GET', `${place}/equipment-summary`, 200, 'application/ld+json', summary);
      expect(() =>
        validator.response('GET', `${place}/equipment-summary`, 200, 'application/ld+json', {
          ...summary,
          totalItems: '251',
        }),
      ).toThrow();
    });
  }

  it('documents transform-only settings and explicit removals of unavailable bindings', () => {
    const path = '/api/facility-models/model';
    const transform = { scale: 1, rotationDegrees: 45, translation: { x: 0, y: 0, z: 0 } };
    validator.request('PATCH', path, 'application/merge-patch+json', { transform });
    validator.request('PATCH', path, 'application/merge-patch+json', { transform, bindings: null });
    validator.request('PATCH', path, 'application/merge-patch+json', {
      transform,
      removeBindingNodeIndices: [0, 3],
    });
    expect(() =>
      validator.request('PATCH', path, 'application/merge-patch+json', {
        transform,
        removeBindingNodeIndices: ['3'],
      }),
    ).toThrow();
  });
});
