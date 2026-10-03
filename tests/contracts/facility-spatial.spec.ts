import { describe, expect, it } from 'vitest';
import { E2E_ORGANIZATION_ID, hydraCollection } from '../e2e/support/fixtures/api-fixtures';
import {
  E2E_FACILITY_ID,
  facilityAttachmentOutput,
} from '../e2e/support/fixtures/facility-fixtures';
import {
  spatialBuildingModel,
  spatialFacilityModel,
} from '../e2e/support/fixtures/facility-spatial-fixtures';
import { createContractValidator, loadOpenApi } from './support/openapi';

const document = loadOpenApi();
const validator = createContractValidator(document);
const facilities = `/api/organizations/${E2E_ORGANIZATION_ID}/facilities`;
const building = `${facilities}/${E2E_FACILITY_ID}`;
const calibration = {
  widthMeters: 12.5,
  rotationDegrees: 35,
  offsetXMeters: -2,
  offsetZMeters: 4.5,
};

/** Browser mocks use readable IDs; contract traffic uses server UUIDs. */
function withServerIdentifiers(value: unknown, ids = new Map<string, string>()): unknown {
  if (Array.isArray(value)) return value.map((item: unknown) => withServerIdentifiers(item, ids));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]: [string, unknown]) => {
      if (key.endsWith('Id') && typeof item === 'string') {
        let uuid = ids.get(item);
        if (!uuid) {
          uuid = `11111111-1111-4111-8111-${(ids.size + 1).toString().padStart(12, '0')}`;
          ids.set(item, uuid);
        }
        return [key, uuid];
      }
      return [key, withServerIdentifiers(item, ids)];
    }),
  );
}

describe('facility spatial contracts', () => {
  it('documents physical dimensions on canonical and legacy facility mutations', () => {
    const input = { type: 'floor', name: 'Basement', elevationMeters: -3.5, heightMeters: 2.8 };
    for (const path of ['/api/facilities', facilities]) {
      validator.request('POST', path, 'application/ld+json', input);
      expect(() =>
        validator.request('POST', path, 'application/ld+json', { ...input, heightMeters: '3' }),
      ).toThrow();
    }
    validator.request('PATCH', '/api/facilities/floor', 'application/merge-patch+json', {
      elevationMeters: -3.5,
      heightMeters: 2.8,
    });
    expect(() =>
      validator.request('PATCH', '/api/facilities/floor', 'application/merge-patch+json', {
        heightMeters: '3',
      }),
    ).toThrow();
  });
  it('validates populated metric floors, nested equipment and incomplete floors', () => {
    const populated = spatialBuildingModel();
    const groundFloor = populated.floors[0];
    if (!groundFloor) throw new Error('The metric fixture needs a floor.');
    groundFloor.elevationMeters = -3.5;
    groundFloor.heightMeters = 2.8;
    validator.response(
      'GET',
      `${building}/building-model`,
      200,
      'application/ld+json',
      withServerIdentifiers(populated),
    );
    validator.response(
      'GET',
      `${building}/building-model`,
      200,
      'application/ld+json',
      withServerIdentifiers({
        ...populated,
        floors: [
          {
            ...populated.floors[0],
            plan: null,
            outline: null,
            elevationMeters: null,
            heightMeters: null,
            rooms: [],
            equipment: [],
          },
        ],
      }),
    );
    expect(() =>
      validator.response(
        'GET',
        `${building}/building-model`,
        200,
        'application/ld+json',
        withServerIdentifiers({
          ...populated,
          floors: [{ ...populated.floors[0], heightMeters: '3' }],
        }),
      ),
    ).toThrow();
  });

  it('describes calibration on ordinary attachment reads and calibration writes', () => {
    const path = '/api/facility-attachments/plan/calibration';
    validator.request('PUT', path, 'application/ld+json', { calibration });
    validator.request('PUT', path, 'application/ld+json', { calibration: null });
    validator.response('PUT', path, 200, 'application/ld+json', {
      ...facilityAttachmentOutput(),
      calibration,
    });
    validator.response(
      'GET',
      `/api/facilities/${E2E_FACILITY_ID}/attachments`,
      200,
      'application/ld+json',
      hydraCollection([{ ...facilityAttachmentOutput(), calibration }]),
    );
    expect(() =>
      validator.request('PUT', path, 'application/ld+json', {
        calibration: { ...calibration, widthMeters: '12' },
      }),
    ).toThrow();
    const schema =
      document.components.schemas[
        'FacilityAttachment.FacilityAttachmentOutput.jsonld-facility.read'
      ];
    expect(JSON.stringify(schema)).toContain('calibration');
    expect(() =>
      validator.request('PUT', path, 'application/ld+json', { calibration: { widthMeters: 12 } }),
    ).toThrow();
  });

  it('validates model metadata and complete revision-protected settings', () => {
    const model = spatialFacilityModel();
    validator.response(
      'GET',
      `${building}/models`,
      200,
      'application/ld+json',
      hydraCollection([model]),
    );
    validator.response('GET', '/api/facility-models/model', 200, 'application/ld+json', model);
    const settings = {
      transform: model.transform,
      bindings: [{ nodeIndex: 0, facilityId: '11111111-1111-4111-8111-111111111111' }],
    };
    validator.request(
      'PATCH',
      '/api/facility-models/model',
      'application/merge-patch+json',
      settings,
    );
    expect(() =>
      validator.request('PATCH', '/api/facility-models/model', 'application/merge-patch+json', {
        ...settings,
        transform: { ...model.transform, scale: 0 },
      }),
    ).toThrow();
    expect(() =>
      validator.request('PATCH', '/api/facility-models/model', 'application/merge-patch+json', {}),
    ).toThrow();
    validator.response('DELETE', '/api/facility-models/model', 204, '', null);
  });
});
