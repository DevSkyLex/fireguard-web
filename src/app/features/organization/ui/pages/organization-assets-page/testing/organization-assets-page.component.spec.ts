import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityTreeStore } from '@features/organization/features/facilities/state';
import type {
  ComplianceFacilityTreeNodeOutput,
  ComplianceSummaryOutput,
} from '@features/organization/models';
import { ComplianceExplorerStore } from '@features/organization/state/compliance-explorer';
import { OrganizationAssetsPaneStore } from '@features/organization/state/organization-assets-pane';
import { OrganizationAssetsPage } from '../organization-assets-page.component';

const facility = (overrides: Partial<FacilityOutput> = {}): FacilityOutput =>
  ({
    id: 'facility-1',
    organizationId: 'org-1',
    parentFacilityId: null,
    hasChildren: false,
    type: 'building',
    name: 'Headquarters',
    code: null,
    status: 'active',
    address: null,
    metadata: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as FacilityOutput;

const complianceNode = (
  overrides: Partial<ComplianceFacilityTreeNodeOutput> = {},
): ComplianceFacilityTreeNodeOutput => ({
  id: 'facility-1',
  name: 'Headquarters',
  type: 'building',
  parentFacilityId: null,
  equipmentCount: 3,
  status: 'active',
  complianceRate: 95,
  children: [],
  ...overrides,
});

const complianceSummary = (): ComplianceSummaryOutput =>
  ({
    '@id': '/api/organizations/org-1/compliance',
    '@type': 'ComplianceSummary',
    organizationId: 'org-1',
    generatedAt: '2026-08-16T00:00:00+00:00',
    organizationStatus: 'compliant',
    totals: {
      totalEquipmentCount: 3,
      activeEquipmentCount: 3,
      upToDateEquipmentCount: 2,
      dueSoonEquipmentCount: 1,
      overdueEquipmentCount: 0,
      unscheduledEquipmentCount: 0,
      trackedEquipmentCount: 3,
      complianceRate: 95,
      openLowNonConformityCount: 0,
      openMediumNonConformityCount: 0,
      openHighNonConformityCount: 0,
      openCriticalNonConformityCount: 0,
    },
    facilities: [],
  }) as ComplianceSummaryOutput;

const createPage = async (
  inputs: Readonly<Record<string, unknown>> = { organizationId: 'org-1' },
): Promise<ComponentFixture<OrganizationAssetsPage>> => {
  const created: ComponentFixture<OrganizationAssetsPage> =
    TestBed.createComponent(OrganizationAssetsPage);
  for (const [name, value] of Object.entries(inputs)) {
    created.componentRef.setInput(name, value);
  }
  await created.whenStable();

  return created;
};

describe('OrganizationAssetsPage', () => {
  let fixture: ComponentFixture<OrganizationAssetsPage>;
  let loadRoots: ReturnType<typeof vi.fn>;
  let ensureChildrenLoaded: ReturnType<typeof vi.fn>;
  let move: ReturnType<typeof vi.fn>;
  let loadEquipment: ReturnType<typeof vi.fn>;
  let loadInspections: ReturnType<typeof vi.fn>;
  let loadTree: ReturnType<typeof vi.fn>;
  let loadSummary: ReturnType<typeof vi.fn>;
  let exportSafetyRegister: ReturnType<typeof vi.fn>;
  let rootsSignal: WritableSignal<readonly FacilityOutput[]>;
  let summarySignal: WritableSignal<ComplianceSummaryOutput | null>;
  let isExportingSignal: WritableSignal<boolean>;

  beforeEach(() => {
    loadRoots = vi.fn();
    ensureChildrenLoaded = vi.fn();
    move = vi.fn();
    loadEquipment = vi.fn();
    loadInspections = vi.fn();
    loadTree = vi.fn();
    loadSummary = vi.fn();
    exportSafetyRegister = vi.fn();
    rootsSignal = signal<readonly FacilityOutput[]>([facility()]);
    summarySignal = signal<ComplianceSummaryOutput | null>(null);
    isExportingSignal = signal<boolean>(false);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: FacilityTreeStore,
          useValue: {
            roots: rootsSignal,
            childrenByParent: signal({}),
            expandingParentIds: signal([]),
            failedParentIds: signal([]),
            isMoving: signal(false),
            loadRoots,
            ensureChildrenLoaded,
            move,
          },
        },
        {
          provide: OrganizationAssetsPaneStore,
          useValue: {
            equipment: signal([]),
            isLoadingEquipment: signal(false),
            hasEquipmentError: signal(false),
            inspections: signal([]),
            isLoadingInspections: signal(false),
            hasInspectionsError: signal(false),
            loadEquipment,
            loadInspections,
          },
        },
        {
          provide: ComplianceExplorerStore,
          useValue: {
            roots: signal([]),
            childrenByParent: signal({}),
            isLoadingTree: signal(false),
            hasTreeError: signal(false),
            summary: summarySignal,
            isLoadingSummary: signal(false),
            hasSummaryError: signal(false),
            isExporting: isExportingSignal,
            hasExportError: signal(false),
            loadTree,
            loadSummary,
            exportSafetyRegister,
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: vi.fn().mockReturnValue(true) },
        },
      ],
    });
  });

  it('loads the site roots on arrival', async () => {
    fixture = await createPage();

    expect(loadRoots).toHaveBeenCalledWith('org-1');
  });

  it('loads nothing in the right pane while on "By site" with no selection', async () => {
    fixture = await createPage();

    expect(loadEquipment).not.toHaveBeenCalled();
    expect(loadInspections).not.toHaveBeenCalled();
  });

  it('scopes the right pane to the selected facility', async () => {
    fixture = await createPage();

    fixture.componentInstance['onNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: facility(),
    });
    await fixture.whenStable();

    expect(loadEquipment).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
    });
    expect(loadInspections).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
    });
  });

  it('loads the right pane organization-wide on the "Everything" axis', async () => {
    fixture = await createPage();

    fixture.componentInstance['onAxisActivated']('everything');
    await fixture.whenStable();

    expect(loadEquipment).toHaveBeenCalledWith({ organizationId: 'org-1' });
    expect(loadInspections).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('delegates branch expansion to the guarded tree store method', async () => {
    fixture = await createPage();

    fixture.componentInstance['onExpandRequested']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: true,
      data: facility({ hasChildren: true }),
    });

    expect(ensureChildrenLoaded).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
    });
  });

  it('moves a facility to the dropped target on nodeDropped', async () => {
    fixture = await createPage();

    fixture.componentInstance['onNodeDropped']({
      dragged: { id: 'facility-2', label: 'Wing', hasChildren: false, data: facility() },
      target: { id: 'facility-1', label: 'Headquarters', hasChildren: false, data: facility() },
      position: 'inside',
    });

    expect(move).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-2',
      parentFacilityId: 'facility-1',
    });
  });

  it('opens the move dialog with the requested node, and calls the same move flow on submit', async () => {
    fixture = await createPage();

    fixture.componentInstance['onMoveRequested']({
      id: 'facility-2',
      label: 'Wing',
      hasChildren: false,
      data: facility(),
    });
    await fixture.whenStable();

    expect(fixture.componentInstance['moveTarget']()).toEqual({
      facilityId: 'facility-2',
      facilityName: 'Wing',
    });

    fixture.componentInstance['onMoveSubmitted']({
      facilityId: 'facility-2',
      parentFacilityId: 'facility-1',
    });
    await fixture.whenStable();

    expect(move).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-2',
      parentFacilityId: 'facility-1',
    });
    expect(fixture.componentInstance['moveTarget']()).toBeNull();
  });

  it('closes the move dialog without moving anything on dismiss', async () => {
    fixture = await createPage();

    fixture.componentInstance['onMoveRequested']({
      id: 'facility-2',
      label: 'Wing',
      hasChildren: false,
      data: facility(),
    });
    fixture.componentInstance['onMoveDismissed']();
    await fixture.whenStable();

    expect(move).not.toHaveBeenCalled();
    expect(fixture.componentInstance['moveTarget']()).toBeNull();
  });

  it('does not touch the equipment/inspection pane on the "Compliance" axis', async () => {
    fixture = await createPage();

    fixture.componentInstance['onAxisActivated']('compliance');
    await fixture.whenStable();

    expect(loadEquipment).not.toHaveBeenCalled();
    expect(loadInspections).not.toHaveBeenCalled();
  });

  it('loads the compliance tree once, on first activation of the "Compliance" axis', async () => {
    fixture = await createPage();

    fixture.componentInstance['onAxisActivated']('compliance');
    fixture.componentInstance['onAxisActivated']('site');
    fixture.componentInstance['onAxisActivated']('compliance');
    await fixture.whenStable();

    expect(loadTree).toHaveBeenCalledTimes(1);
    expect(loadTree).toHaveBeenCalledWith('org-1');
  });

  it('loads the selected facility compliance summary on node selection', async () => {
    fixture = await createPage();

    fixture.componentInstance['onComplianceNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: complianceNode(),
    });
    await fixture.whenStable();

    expect(loadSummary).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
    });
  });

  it('exports the selected facility safety register', async () => {
    fixture = await createPage();

    fixture.componentInstance['onComplianceNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: complianceNode(),
    });
    fixture.componentInstance['onExportSafetyRegister']();
    await fixture.whenStable();

    expect(exportSafetyRegister).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
      fileName: 'safety-register.pdf',
    });
  });

  it('does nothing when export is requested with no facility selected', async () => {
    fixture = await createPage();

    fixture.componentInstance['onExportSafetyRegister']();
    await fixture.whenStable();

    expect(exportSafetyRegister).not.toHaveBeenCalled();
  });

  it('ignores an export request while an export is already running', async () => {
    fixture = await createPage();
    isExportingSignal.set(true);

    fixture.componentInstance['onComplianceNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: complianceNode(),
    });
    fixture.componentInstance['onExportSafetyRegister']();
    await fixture.whenStable();

    expect(exportSafetyRegister).not.toHaveBeenCalled();
  });

  it('switches the export button live-region label while exporting', async () => {
    fixture = await createPage();
    summarySignal.set(complianceSummary());

    fixture.componentInstance['onAxisActivated']('compliance');
    fixture.componentInstance['onComplianceNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: complianceNode(),
    });
    await fixture.whenStable();

    const liveRegion = (): HTMLElement | null =>
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="assets-compliance-export"] [role="status"]',
      );
    expect(liveRegion()?.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion()?.textContent).toContain('Export safety register');

    isExportingSignal.set(true);
    await fixture.whenStable();

    expect(liveRegion()?.textContent).toContain('Exporting…');
  });

  it('keeps the export button in the accessibility tree while exporting', async () => {
    fixture = await createPage();
    summarySignal.set(complianceSummary());
    isExportingSignal.set(true);

    fixture.componentInstance['onAxisActivated']('compliance');
    fixture.componentInstance['onComplianceNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: complianceNode(),
    });
    await fixture.whenStable();

    const button: HTMLButtonElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="assets-compliance-export"]',
    );
    expect(button?.disabled).toBe(false);
    expect(button?.getAttribute('aria-disabled')).toBe('true');
    expect(button?.getAttribute('aria-busy')).toBe('true');
  });

  it('labels the compliance summary pane with a visible heading', async () => {
    fixture = await createPage();

    fixture.componentInstance['onAxisActivated']('compliance');
    fixture.componentInstance['onComplianceNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: complianceNode(),
    });
    await fixture.whenStable();

    const pane: HTMLElement | null = (fixture.nativeElement as HTMLElement).querySelector(
      'section[data-testid="assets-compliance-summary-pane"]',
    );
    const heading: HTMLElement | null =
      pane?.querySelector('h2#assets-compliance-summary-title') ?? null;
    expect(pane?.getAttribute('aria-labelledby')).toBe('assets-compliance-summary-title');
    expect(heading?.textContent).toContain('Compliance summary');
  });
});
