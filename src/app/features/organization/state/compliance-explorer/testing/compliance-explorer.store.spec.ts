import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ComplianceService } from '@features/organization/data-access';
import type {
  ComplianceFacilityTreeNodeOutput,
  ComplianceFacilityTreeOutput,
  ComplianceSummaryOutput,
} from '@features/organization/models';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import {
  ComplianceExplorerStore,
  type ComplianceExplorerStoreType,
} from '../compliance-explorer.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

const treeNode = (
  overrides: Partial<ComplianceFacilityTreeNodeOutput> = {},
): ComplianceFacilityTreeNodeOutput => ({
  id: 'node-1',
  name: 'Headquarters',
  type: 'site',
  parentFacilityId: null,
  equipmentCount: 3,
  status: 'active',
  complianceRate: 95,
  children: [],
  ...overrides,
});

const summary = (overrides: Partial<ComplianceSummaryOutput> = {}): ComplianceSummaryOutput =>
  ({
    '@id': '/api/organizations/org-1/compliance',
    '@type': 'ComplianceSummary',
    organizationId: 'org-1',
    generatedAt: '2026-08-16T00:00:00+00:00',
    organizationStatus: 'compliant',
    totals: {
      totalEquipmentCount: 0,
      activeEquipmentCount: 0,
      upToDateEquipmentCount: 0,
      dueSoonEquipmentCount: 0,
      overdueEquipmentCount: 0,
      unscheduledEquipmentCount: 0,
      trackedEquipmentCount: 0,
      complianceRate: null,
      openLowNonConformityCount: 0,
      openMediumNonConformityCount: 0,
      openHighNonConformityCount: 0,
      openCriticalNonConformityCount: 0,
    },
    facilities: [],
    ...overrides,
  }) as ComplianceSummaryOutput;

describe('ComplianceExplorerStore', () => {
  let store: ComplianceExplorerStoreType;
  let mockComplianceService: {
    getFacilityTree: ReturnType<typeof vi.fn>;
    getOrganizationCompliance: ReturnType<typeof vi.fn>;
    getFacilityCompliance: ReturnType<typeof vi.fn>;
    exportOrganizationSafetyRegister: ReturnType<typeof vi.fn>;
    exportFacilitySafetyRegister: ReturnType<typeof vi.fn>;
  };
  let mockBrowserDownload: { trigger: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockComplianceService = {
      getFacilityTree: vi.fn(),
      getOrganizationCompliance: vi.fn(),
      getFacilityCompliance: vi.fn(),
      exportOrganizationSafetyRegister: vi.fn(),
      exportFacilitySafetyRegister: vi.fn(),
    };
    mockBrowserDownload = { trigger: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ComplianceExplorerStore,
        { provide: ComplianceService, useValue: mockComplianceService },
        { provide: BrowserDownloadService, useValue: mockBrowserDownload },
      ],
    });

    store = TestBed.inject(ComplianceExplorerStore);
  });

  it('loads the tree and exposes it flattened onto the shared Tree shape', async () => {
    const root = treeNode({ children: [treeNode({ id: 'node-2', parentFacilityId: 'node-1' })] });
    const tree: ComplianceFacilityTreeOutput = {
      '@id': '/api/organizations/org-1/facility-tree',
      '@type': 'FacilityTree',
      organizationId: 'org-1',
      generatedAt: '2026-08-16T00:00:00+00:00',
      nodes: [root],
    };
    mockComplianceService.getFacilityTree.mockReturnValue(of(tree));

    store.loadTree('org-1');
    await flushEffects();

    expect(mockComplianceService.getFacilityTree).toHaveBeenCalledWith('org-1');
    expect(store.hasTreeError()).toBe(false);
    expect(store.roots()).toEqual([
      { id: 'node-1', label: 'Headquarters', hasChildren: true, data: root },
    ]);
    expect(store.childrenByParent()['node-1']).toHaveLength(1);
  });

  it('records a tree load failure', async () => {
    mockComplianceService.getFacilityTree.mockReturnValue(throwError(() => new Error('boom')));

    store.loadTree('org-1');
    await flushEffects();

    expect(store.hasTreeError()).toBe(true);
    expect(store.roots()).toEqual([]);
  });

  it('loads the organization-wide summary when no facility is given', async () => {
    const result = summary();
    mockComplianceService.getOrganizationCompliance.mockReturnValue(of(result));

    store.loadSummary({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockComplianceService.getOrganizationCompliance).toHaveBeenCalledWith('org-1');
    expect(mockComplianceService.getFacilityCompliance).not.toHaveBeenCalled();
    expect(store.summary()).toEqual(result);
  });

  it('loads the facility-scoped summary when a facility is given', async () => {
    const result = summary({ facilityId: 'facility-1' });
    mockComplianceService.getFacilityCompliance.mockReturnValue(of(result));

    store.loadSummary({ organizationId: 'org-1', facilityId: 'facility-1' });
    await flushEffects();

    expect(mockComplianceService.getFacilityCompliance).toHaveBeenCalledWith('org-1', 'facility-1');
    expect(store.summary()).toEqual(result);
  });

  it('triggers the browser download and reports success on export', async () => {
    const blob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    mockComplianceService.exportOrganizationSafetyRegister.mockReturnValue(of(blob));

    store.exportSafetyRegister({ organizationId: 'org-1', fileName: 'safety-register.pdf' });
    await flushEffects();

    expect(mockBrowserDownload.trigger).toHaveBeenCalledWith(blob, 'safety-register.pdf');
    expect(store.isExporting()).toBe(false);
    expect(store.hasExportError()).toBe(false);
  });

  it('records an export failure without triggering a download', async () => {
    mockComplianceService.exportFacilitySafetyRegister.mockReturnValue(
      throwError(() => new Error('export failed')),
    );

    store.exportSafetyRegister({
      organizationId: 'org-1',
      facilityId: 'facility-1',
      fileName: 'safety-register.pdf',
    });
    await flushEffects();

    expect(mockBrowserDownload.trigger).not.toHaveBeenCalled();
    expect(store.hasExportError()).toBe(true);
  });
});
