import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ComplianceService } from '@features/organization/data-access';
import type {
  ComplianceFacilityTreeNodeOutput,
  ComplianceFacilityTreeOutput,
  ComplianceSummaryOutput,
  SafetyRegisterSnapshotOutput,
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

const snapshot = (
  overrides: Partial<SafetyRegisterSnapshotOutput> = {},
): SafetyRegisterSnapshotOutput => ({
  '@id': '/api/organizations/org-1/compliance/register-snapshots/snap-1',
  '@type': 'SafetyRegisterSnapshot',
  id: 'snap-1',
  organizationId: 'org-1',
  scope: 'organization',
  generatedAt: '2026-08-27T10:00:00+00:00',
  generatedByUserId: 'user-1',
  contentHash: 'a'.repeat(64),
  sizeBytes: 12_345,
  createdAt: '2026-08-27T10:00:00+00:00',
  ...overrides,
});

describe('ComplianceExplorerStore', () => {
  let store: ComplianceExplorerStoreType;
  let mockComplianceService: {
    getFacilityTree: ReturnType<typeof vi.fn>;
    getOrganizationCompliance: ReturnType<typeof vi.fn>;
    getFacilityCompliance: ReturnType<typeof vi.fn>;
    exportOrganizationSafetyRegister: ReturnType<typeof vi.fn>;
    exportFacilitySafetyRegister: ReturnType<typeof vi.fn>;
    createRegisterSnapshot: ReturnType<typeof vi.fn>;
    listRegisterSnapshots: ReturnType<typeof vi.fn>;
    downloadRegisterSnapshot: ReturnType<typeof vi.fn>;
  };
  let mockBrowserDownload: { trigger: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockComplianceService = {
      getFacilityTree: vi.fn(),
      getOrganizationCompliance: vi.fn(),
      getFacilityCompliance: vi.fn(),
      exportOrganizationSafetyRegister: vi.fn(),
      exportFacilitySafetyRegister: vi.fn(),
      createRegisterSnapshot: vi.fn(),
      listRegisterSnapshots: vi.fn(),
      downloadRegisterSnapshot: vi.fn(),
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

  it('loads the archived snapshot page and exposes its members', async () => {
    mockComplianceService.listRegisterSnapshots.mockReturnValue(
      of({ member: [snapshot()], totalItems: 1 }),
    );

    store.loadSnapshots('org-1');
    await flushEffects();

    expect(mockComplianceService.listRegisterSnapshots).toHaveBeenCalledWith('org-1');
    expect(store.isLoadingSnapshots()).toBe(false);
    expect(store.hasSnapshotsError()).toBe(false);
    expect(store.snapshots()).toEqual([snapshot()]);
  });

  it('records a snapshot list failure', async () => {
    mockComplianceService.listRegisterSnapshots.mockReturnValue(
      throwError(() => new Error('boom')),
    );

    store.loadSnapshots('org-1');
    await flushEffects();

    expect(store.hasSnapshotsError()).toBe(true);
    expect(store.snapshots()).toEqual([]);
  });

  it('archives the organization-wide register with an empty body and reports success', async () => {
    mockComplianceService.createRegisterSnapshot.mockReturnValue(of(snapshot()));

    store.archiveRegister({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockComplianceService.createRegisterSnapshot).toHaveBeenCalledWith('org-1', {});
    expect(store.isArchiving()).toBe(false);
    expect(store.archiveCallState().status).toBe('success');
  });

  it('archives a facility-scoped register with the facilityId in the body', async () => {
    mockComplianceService.createRegisterSnapshot.mockReturnValue(
      of(snapshot({ scope: 'facility', facilityId: 'facility-1' })),
    );

    store.archiveRegister({ organizationId: 'org-1', facilityId: 'facility-1' });
    await flushEffects();

    expect(mockComplianceService.createRegisterSnapshot).toHaveBeenCalledWith('org-1', {
      facilityId: 'facility-1',
    });
    expect(store.archiveCallState().status).toBe('success');
  });

  it('records an archive failure with the normalized error', async () => {
    mockComplianceService.createRegisterSnapshot.mockReturnValue(
      throwError(() => ({ '@type': 'Error', status: 403, detail: 'Plan not entitled' })),
    );

    store.archiveRegister({ organizationId: 'org-1' });
    await flushEffects();

    expect(store.archiveCallState().status).toBe('error');
    expect(store.archiveCallState().error?.message).toBe('Plan not entitled');
  });

  it('downloads one snapshot, flags its row while in flight, and triggers the browser download', async () => {
    const blob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    mockComplianceService.downloadRegisterSnapshot.mockReturnValue(of(blob));

    store.downloadSnapshot({
      organizationId: 'org-1',
      snapshotId: 'snap-1',
      fileName: 'safety-register-2026-08-27.pdf',
    });
    await flushEffects();

    expect(mockComplianceService.downloadRegisterSnapshot).toHaveBeenCalledWith('org-1', 'snap-1');
    expect(mockBrowserDownload.trigger).toHaveBeenCalledWith(
      blob,
      'safety-register-2026-08-27.pdf',
    );
    expect(store.downloadingSnapshotId()).toBeNull();
    expect(store.downloadCallState().status).toBe('success');
  });

  it('records a snapshot download failure and clears the row flag', async () => {
    mockComplianceService.downloadRegisterSnapshot.mockReturnValue(
      throwError(() => new Error('boom')),
    );

    store.downloadSnapshot({
      organizationId: 'org-1',
      snapshotId: 'snap-1',
      fileName: 'safety-register-2026-08-27.pdf',
    });
    await flushEffects();

    expect(mockBrowserDownload.trigger).not.toHaveBeenCalled();
    expect(store.downloadingSnapshotId()).toBeNull();
    expect(store.downloadCallState().status).toBe('error');
  });
});
