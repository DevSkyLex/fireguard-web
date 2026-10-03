import { describe, expect, it } from 'vitest';
import { E2E_ORGANIZATION_ID, hydraCollection } from '../e2e/support/fixtures/api-fixtures';
import { channelOutput } from '../e2e/support/fixtures/channel-fixtures';
import { equipmentOutput } from '../e2e/support/fixtures/equipment-fixtures';
import { importJobOutput } from '../e2e/support/fixtures/import-fixtures';
import { E2E_INSPECTION_ID, inspectionOutput } from '../e2e/support/fixtures/inspection-fixtures';
import { interventionOutput } from '../e2e/support/fixtures/intervention-fixtures';
import { maintenanceScheduleOutput } from '../e2e/support/fixtures/maintenance-fixtures';
import { nonConformityOutput } from '../e2e/support/fixtures/non-conformity-fixtures';
import { createContractValidator, loadOpenApi } from './support/openapi';

const validator = createContractValidator(loadOpenApi());
const organization = '/api/organizations/' + E2E_ORGANIZATION_ID;
describe('populated entity factories', () => {
  it.each([
    ['/api/channels?organization=' + encodeURIComponent(organization), channelOutput()],
    ['/api/interventions?organization=' + encodeURIComponent(organization), interventionOutput()],
    [
      '/api/maintenance/schedules?organization=' + encodeURIComponent(organization),
      maintenanceScheduleOutput(),
    ],
    ['/api/imports?organization=' + E2E_ORGANIZATION_ID, importJobOutput()],
    [organization + '/equipment', equipmentOutput()],
    [organization + '/inspections', inspectionOutput()],
    [
      organization + '/inspections/' + E2E_INSPECTION_ID + '/non-conformities',
      nonConformityOutput(),
    ],
    [
      organization + '/non-conformities',
      nonConformityOutput({ equipmentId: null, equipmentSerialNumber: null }),
    ],
  ] as const)('validates populated %s collections', (path, item) => {
    validator.response('GET', path, 200, 'application/ld+json', hydraCollection([item]));
  });

  it('accepts omitted and explicit-null nullable fields and rejects malformed populated values', () => {
    const path = organization + '/inspections/' + E2E_INSPECTION_ID + '/non-conformities';
    const omitted = nonConformityOutput();
    expect(omitted).not.toHaveProperty('dueAt');
    expect(omitted).not.toHaveProperty('resolvedAt');
    expect(omitted).not.toHaveProperty('notes');
    validator.response('GET', path, 200, 'application/ld+json', hydraCollection([omitted]));
    validator.response(
      'GET',
      path,
      200,
      'application/ld+json',
      hydraCollection([nonConformityOutput({ dueAt: null, resolvedAt: null, notes: null })]),
    );
    for (const item of [
      { ...omitted, severity: 3 },
      { ...omitted, dueAt: 7 },
      { ...omitted, notes: 3 },
    ])
      expect(() =>
        validator.response('GET', path, 200, 'application/ld+json', hydraCollection([item])),
      ).toThrow();
  });
});
