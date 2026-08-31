/**
 * Facility transport fixtures for the e2e suite, mirroring the backend
 * contract consumed by the facility list/create/detail pages. Plain factory
 * functions (like `api-fixtures.ts`) so tests override fields via object
 * spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';

/** Facility the list/detail e2e scenarios deep-link into. */
export const E2E_FACILITY_ID = 'e2e-facility-1';

/** A second, child facility used to exercise the hierarchy chart. */
export const E2E_FACILITY_CHILD_ID = 'e2e-facility-2';

/** A second root facility, used as a drag-drop move target. */
export const E2E_FACILITY_SIBLING_ID = 'e2e-facility-3';

export interface FacilityOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organizationId: string;
  readonly parentFacilityId: string | null;
  readonly hasChildren: boolean;
  readonly type: string;
  readonly name: string;
  readonly code: string | null;
  readonly status: string;
  readonly address: string | null;
  readonly metadata: Record<string, string | null>;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly path: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly type: string;
  }>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * A published facility with one child — realistic enough to populate the
 * detail page's header, hierarchy chart and information panel.
 */
export function facilityOutput(
  overrides: Partial<FacilityOutputFixture> = {},
): FacilityOutputFixture {
  return {
    '@id': `/api/facilities/${E2E_FACILITY_ID}`,
    '@type': 'Facility',
    id: E2E_FACILITY_ID,
    organizationId: E2E_ORGANIZATION_ID,
    parentFacilityId: null,
    hasChildren: false,
    type: 'building',
    name: 'North Building',
    code: 'BLD-001',
    status: 'active',
    address: '12 Rue de la Paix, 75002 Paris',
    metadata: {},
    latitude: 48.8566,
    longitude: 2.3522,
    path: [],
    createdAt: '2026-01-05T00:00:00+00:00',
    updatedAt: '2026-06-01T00:00:00+00:00',
    ...overrides,
  };
}

/** A direct child of {@link facilityOutput}, used to populate the descendants collection. */
export function facilityChildOutput(
  overrides: Partial<FacilityOutputFixture> = {},
): FacilityOutputFixture {
  return facilityOutput({
    id: E2E_FACILITY_CHILD_ID,
    '@id': `/api/facilities/${E2E_FACILITY_CHILD_ID}`,
    parentFacilityId: E2E_FACILITY_ID,
    type: 'floor',
    name: 'Ground Floor',
    code: 'BLD-001-GF',
    ...overrides,
  });
}

/** A second root facility — a sibling of {@link facilityOutput}, used as a drag-drop move target. */
export function facilitySiblingOutput(
  overrides: Partial<FacilityOutputFixture> = {},
): FacilityOutputFixture {
  return facilityOutput({
    id: E2E_FACILITY_SIBLING_ID,
    '@id': `/api/facilities/${E2E_FACILITY_SIBLING_ID}`,
    parentFacilityId: null,
    type: 'building',
    name: 'South Building',
    code: 'BLD-002',
    ...overrides,
  });
}

export interface ComplianceTreeNodeOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly parentFacilityId: string | null;
  readonly equipmentCount: number;
  readonly status: string;
  readonly complianceRate: number | null;
  readonly children: ReadonlyArray<ComplianceTreeNodeOutputFixture>;
}

/**
 * A Compliance-owned facility tree node for the map's compliance layer,
 * carrying the same id as {@link facilityOutput} so the map surface can join
 * the two by id.
 */
export function complianceTreeNodeOutput(
  overrides: Partial<ComplianceTreeNodeOutputFixture> = {},
): ComplianceTreeNodeOutputFixture {
  return {
    '@id': `/api/facilities/${E2E_FACILITY_ID}`,
    '@type': 'Facility',
    id: E2E_FACILITY_ID,
    name: 'North Building',
    type: 'building',
    parentFacilityId: null,
    equipmentCount: 4,
    status: 'active',
    complianceRate: 42,
    children: [],
    ...overrides,
  };
}

/** Floor plan attachment the Plans tab e2e scenarios deep-link into. */
export const E2E_FACILITY_PLAN_ID = 'e2e-facility-plan-1';

/**
 * `FacilityAttachmentOutputFixture` carries no download URL — like the real
 * backend DTO, the bytes are only ever read through `GET
 * /api/facility-attachments/{id}/download`
 * (`ApiMock.mockFacilityPlans`), never a field on the resource itself.
 */
export interface FacilityAttachmentOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly facilityId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly kind: string;
  readonly isPrimaryPlan: boolean;
  readonly imageWidth: number | null;
  readonly imageHeight: number | null;
  readonly revision: number;
  readonly uploadedAt: string;
}

/** A primary floor-plan attachment on {@link facilityOutput}. */
export function facilityAttachmentOutput(
  overrides: Partial<FacilityAttachmentOutputFixture> = {},
): FacilityAttachmentOutputFixture {
  const id = overrides.id ?? E2E_FACILITY_PLAN_ID;

  return {
    '@id': `/api/facility-attachments/${id}`,
    '@type': 'FacilityAttachment',
    id,
    facilityId: E2E_FACILITY_ID,
    fileName: 'ground-floor.png',
    mimeType: 'image/png',
    size: 4096,
    kind: 'floor_plan',
    isPrimaryPlan: true,
    imageWidth: 1200,
    imageHeight: 800,
    revision: 1,
    uploadedAt: '2026-08-01T00:00:00+00:00',
    ...overrides,
  };
}

/** A second facility, used as the plan overlay's zone target. */
export const E2E_FACILITY_PLAN_ZONE_ID = 'e2e-facility-plan-zone-1';

/** A third, undrawn child facility — the plan editor's `draw-zone` picker candidate. */
export const E2E_FACILITY_PLAN_NEW_ZONE_ID = 'e2e-facility-plan-zone-new';

/** A `zone`-type direct child not yet drawn on the plan, offered by the `draw-zone` picker. */
export function facilityZoneCandidateOutput(
  overrides: Partial<FacilityOutputFixture> = {},
): FacilityOutputFixture {
  return facilityOutput({
    id: E2E_FACILITY_PLAN_NEW_ZONE_ID,
    '@id': `/api/facilities/${E2E_FACILITY_PLAN_NEW_ZONE_ID}`,
    parentFacilityId: E2E_FACILITY_ID,
    type: 'zone',
    name: 'Break Room',
    code: null,
    ...overrides,
  });
}

/** The equipment the plan overlay pins to. */
export const E2E_FACILITY_PLAN_EQUIPMENT_ID = 'e2e-facility-plan-equipment-1';

export interface FacilityPlanOverlayOutputFixture {
  readonly attachmentId: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly zones: ReadonlyArray<{
    readonly facilityId: string;
    readonly name: string;
    readonly type: string;
    readonly status: string;
    readonly points: ReadonlyArray<readonly [number, number]>;
  }>;
  readonly equipment: ReadonlyArray<{
    readonly equipmentId: string;
    // The API sends the identity in parts, never a composed label: a raw enum
    // is untranslatable once it reaches a client. The mock must match, or the
    // pins render nameless.
    readonly type: string;
    readonly serialNumber: string | null;
    readonly locationLabel: string | null;
    readonly status: string;
    readonly x: number;
    readonly y: number;
  }>;
}

/**
 * Two zones and two equipment pins on {@link facilityAttachmentOutput}'s tiny
 * 1×1 PNG — the `plan-overlay` e2e scenarios' overlay fixture.
 */
export function facilityPlanOverlayOutput(
  overrides: Partial<FacilityPlanOverlayOutputFixture> = {},
): FacilityPlanOverlayOutputFixture {
  return {
    attachmentId: E2E_FACILITY_PLAN_ID,
    imageWidth: 1200,
    imageHeight: 800,
    zones: [
      {
        facilityId: E2E_FACILITY_CHILD_ID,
        name: 'Server Room',
        type: 'zone',
        status: 'active',
        points: [
          [0.1, 0.1],
          [0.4, 0.1],
          [0.4, 0.4],
          [0.1, 0.4],
        ],
      },
      {
        facilityId: E2E_FACILITY_PLAN_ZONE_ID,
        name: 'Storage',
        type: 'zone',
        status: 'active',
        points: [
          [0.5, 0.5],
          [0.8, 0.5],
          [0.8, 0.8],
          [0.5, 0.8],
        ],
      },
    ],
    equipment: [
      {
        equipmentId: E2E_FACILITY_PLAN_EQUIPMENT_ID,
        type: 'fire_extinguisher',
        serialNumber: 'SN-A',
        locationLabel: 'Extinguisher A',
        status: 'operational',
        x: 0.2,
        y: 0.2,
      },
      {
        equipmentId: 'e2e-facility-plan-equipment-2',
        type: 'fire_extinguisher',
        serialNumber: 'SN-B',
        locationLabel: 'Extinguisher B',
        status: 'under_maintenance',
        x: 0.6,
        y: 0.6,
      },
    ],
    ...overrides,
  };
}
