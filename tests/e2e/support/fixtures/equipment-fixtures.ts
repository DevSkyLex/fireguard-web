/**
 * Equipment transport fixtures for the e2e suite, mirroring the backend
 * contract consumed by the equipment list/create/detail pages. Plain factory
 * functions (like `api-fixtures.ts`) so tests override fields via object
 * spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';
import { E2E_FACILITY_ID } from './facility-fixtures';

/** Equipment the list/detail e2e scenarios deep-link into. */
export const E2E_EQUIPMENT_ID = 'e2e-equipment-1';

export interface EquipmentOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organizationId: string;
  readonly facilityId: string | null;
  readonly facilityName: string | null;
  readonly type: string;
  readonly subType: string | null;
  readonly brand: string | null;
  readonly model: string | null;
  readonly serialNumber: string | null;
  readonly locationLabel: string | null;
  readonly status: string;
  readonly maintenanceDueStatus: string;
  readonly installedAt: string | null;
  readonly commissionedAt: string | null;
  readonly tags: ReadonlyArray<{ readonly id: string; readonly name: string }>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** An operational, facility-assigned fire extinguisher — realistic enough to populate the detail page's header and information panel. */
export function equipmentOutput(
  overrides: Partial<EquipmentOutputFixture> = {},
): EquipmentOutputFixture {
  return {
    '@id': `/api/equipment/${E2E_EQUIPMENT_ID}`,
    '@type': 'Equipment',
    id: E2E_EQUIPMENT_ID,
    organizationId: E2E_ORGANIZATION_ID,
    facilityId: E2E_FACILITY_ID,
    facilityName: 'North Building',
    type: 'fire_extinguisher',
    subType: 'CO2',
    brand: 'Desautel',
    model: 'X-Fire 6kg',
    serialNumber: 'SN-2024-001',
    locationLabel: 'Corridor A, 2nd floor',
    status: 'operational',
    maintenanceDueStatus: 'up_to_date',
    installedAt: '2025-03-01T00:00:00+00:00',
    commissionedAt: '2025-03-05T00:00:00+00:00',
    tags: [],
    createdAt: '2025-03-01T00:00:00+00:00',
    updatedAt: '2026-06-01T00:00:00+00:00',
    ...overrides,
  };
}

/** An in-stock, unassigned equipment — exercises the "Commission" primary action and the unassigned label. */
export function inStockEquipmentOutput(
  overrides: Partial<EquipmentOutputFixture> = {},
): EquipmentOutputFixture {
  return equipmentOutput({
    id: 'e2e-equipment-2',
    '@id': '/api/equipment/e2e-equipment-2',
    facilityId: null,
    facilityName: null,
    status: 'in_stock',
    maintenanceDueStatus: 'unscheduled',
    commissionedAt: null,
    ...overrides,
  });
}

/** KPI strip above the equipment list (`GET /organizations/{id}/equipment/kpis`). */
export interface EquipmentKpiFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly totalAssets: number;
  readonly compliant: number;
  readonly dueSoon: number;
  readonly openNonConformities: number;
}

export function equipmentKpiOutput(
  overrides: Partial<EquipmentKpiFixture> = {},
): EquipmentKpiFixture {
  return {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/equipment/kpis`,
    '@type': 'EquipmentKpi',
    totalAssets: 1,
    compliant: 1,
    dueSoon: 0,
    openNonConformities: 0,
    ...overrides,
  };
}

/** An attachment on {@link equipmentOutput}, for the equipment detail page's Attachments tab. */
export interface EquipmentAttachmentOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly revision: number;
  readonly equipmentId: string;
  readonly fileName: string;
  readonly mimeType: string;
  readonly size: number;
  readonly label: string | null;
  readonly uploadedAt: string;
}

export function equipmentAttachmentOutput(
  overrides: Partial<EquipmentAttachmentOutputFixture> = {},
): EquipmentAttachmentOutputFixture {
  return {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/equipment/${E2E_EQUIPMENT_ID}/attachments/e2e-equipment-attachment-1`,
    '@type': 'EquipmentAttachment',
    id: 'e2e-equipment-attachment-1',
    revision: 1,
    equipmentId: E2E_EQUIPMENT_ID,
    fileName: 'commissioning-report.pdf',
    mimeType: 'application/pdf',
    size: 20_480,
    label: 'Commissioning report',
    uploadedAt: '2025-03-05T00:00:00+00:00',
    ...overrides,
  };
}

/** A maintenance log entry on {@link equipmentOutput}, for the equipment detail page's Maintenance tab. */
export interface EquipmentMaintenanceLogOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly equipmentId: string;
  readonly organizationId: string;
  readonly startedAt: string;
  readonly completedAt?: string | null;
  readonly source: 'status_transition' | 'intervention';
  readonly interventionId?: string;
  readonly interventionNumber?: number;
  readonly workItemAction?: string;
  readonly actorId?: string;
  readonly summary?: string;
}

export function equipmentMaintenanceLogOutput(
  overrides: Partial<EquipmentMaintenanceLogOutputFixture> = {},
): EquipmentMaintenanceLogOutputFixture {
  return {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/equipment/${E2E_EQUIPMENT_ID}/maintenance-logs/e2e-equipment-maintenance-1`,
    '@type': 'EquipmentMaintenanceLog',
    id: 'e2e-equipment-maintenance-1',
    equipmentId: E2E_EQUIPMENT_ID,
    organizationId: E2E_ORGANIZATION_ID,
    startedAt: '2026-01-10T09:00:00+00:00',
    completedAt: '2026-01-10T10:00:00+00:00',
    source: 'status_transition',
    summary: 'Commissioned after installation.',
    ...overrides,
  };
}

/** An organization equipment tag, for the equipment detail page's Tags tab. */
export interface EquipmentTagOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly name: string;
  readonly organizationId: string;
}

export function equipmentTagOutput(
  overrides: Partial<EquipmentTagOutputFixture> = {},
): EquipmentTagOutputFixture {
  return {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/equipment/tags/e2e-equipment-tag-1`,
    '@type': 'EquipmentTag',
    id: 'e2e-equipment-tag-1',
    name: 'North wing',
    organizationId: E2E_ORGANIZATION_ID,
    ...overrides,
  };
}
