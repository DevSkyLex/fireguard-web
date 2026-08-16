/**
 * Compliance transport fixtures for the e2e suite, mirroring the backend
 * Compliance module contract consumed by the assets explorer's compliance
 * axis. Plain factory functions (like `facility-fixtures.ts`) so tests
 * override fields via object spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';
import { E2E_FACILITY_ID } from './facility-fixtures';

export interface ComplianceFacilityTreeNodeOutputFixture {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly parentFacilityId: string | null;
  readonly equipmentCount: number;
  readonly status: string;
  readonly complianceRate: number | null;
  readonly children: ReadonlyArray<ComplianceFacilityTreeNodeOutputFixture>;
}

export interface ComplianceFacilityTreeOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly organizationId: string;
  readonly generatedAt: string;
  readonly nodes: ReadonlyArray<ComplianceFacilityTreeNodeOutputFixture>;
}

export interface ComplianceSummaryTotalsFixture {
  readonly totalEquipmentCount: number;
  readonly activeEquipmentCount: number;
  readonly upToDateEquipmentCount: number;
  readonly dueSoonEquipmentCount: number;
  readonly overdueEquipmentCount: number;
  readonly unscheduledEquipmentCount: number;
  readonly trackedEquipmentCount: number;
  readonly complianceRate: number | null;
  readonly openLowNonConformityCount: number;
  readonly openMediumNonConformityCount: number;
  readonly openHighNonConformityCount: number;
  readonly openCriticalNonConformityCount: number;
}

export interface ComplianceSummaryOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly organizationId: string;
  readonly facilityId?: string;
  readonly generatedAt: string;
  readonly organizationStatus: string;
  readonly totals: ComplianceSummaryTotalsFixture;
  readonly facilities: ReadonlyArray<Record<string, unknown>>;
}

/** A single-node compliance tree rooted at {@link facilityOutput}'s facility. */
export function complianceFacilityTreeOutput(
  overrides: Partial<ComplianceFacilityTreeOutputFixture> = {},
): ComplianceFacilityTreeOutputFixture {
  return {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/facility-tree`,
    '@type': 'FacilityTree',
    organizationId: E2E_ORGANIZATION_ID,
    generatedAt: '2026-08-16T00:00:00+00:00',
    nodes: [
      {
        id: E2E_FACILITY_ID,
        name: 'North Building',
        type: 'building',
        parentFacilityId: null,
        equipmentCount: 4,
        status: 'active',
        complianceRate: 92,
        children: [],
      },
    ],
    ...overrides,
  };
}

const defaultTotals: ComplianceSummaryTotalsFixture = {
  totalEquipmentCount: 4,
  activeEquipmentCount: 4,
  upToDateEquipmentCount: 3,
  dueSoonEquipmentCount: 1,
  overdueEquipmentCount: 0,
  unscheduledEquipmentCount: 0,
  trackedEquipmentCount: 4,
  complianceRate: 92,
  openLowNonConformityCount: 0,
  openMediumNonConformityCount: 1,
  openHighNonConformityCount: 0,
  openCriticalNonConformityCount: 0,
};

/** A single-facility compliance summary for {@link facilityOutput}'s facility. */
export function complianceSummaryOutput(
  overrides: Partial<ComplianceSummaryOutputFixture> = {},
): ComplianceSummaryOutputFixture {
  return {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_ID}/compliance`,
    '@type': 'ComplianceSummary',
    organizationId: E2E_ORGANIZATION_ID,
    facilityId: E2E_FACILITY_ID,
    generatedAt: '2026-08-16T00:00:00+00:00',
    organizationStatus: 'compliant',
    totals: defaultTotals,
    facilities: [],
    ...overrides,
  };
}
