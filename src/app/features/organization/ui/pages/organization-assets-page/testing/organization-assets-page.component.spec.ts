import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import {
  errorCallState,
  idleCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { OrganizationPermissionService } from '@features/organization/access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityTreeStore } from '@features/organization/features/facilities/state';
import type {
  ComplianceFacilityTreeNodeOutput,
  ComplianceSummaryOutput,
  SafetyRegisterSnapshotOutput,
} from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { ComplianceExplorerStore } from '@features/organization/state/compliance-explorer';
import { OrganizationAssetsPaneStore } from '@features/organization/state/organization-assets-pane';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
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

describe('OrganizationAssetsPage', () => {
  let mobile: WritableSignal<boolean>;
  let fixture: ComponentFixture<OrganizationAssetsPage>;
  let hasPermission: ReturnType<typeof vi.fn>;
  let loadRoots: ReturnType<typeof vi.fn>;
  let ensureChildrenLoaded: ReturnType<typeof vi.fn>;
  let move: ReturnType<typeof vi.fn>;
  let duplicate: ReturnType<typeof vi.fn>;
  let loadEquipment: ReturnType<typeof vi.fn>;
  let loadInspections: ReturnType<typeof vi.fn>;
  let loadTree: ReturnType<typeof vi.fn>;
  let loadSummary: ReturnType<typeof vi.fn>;
  let exportSafetyRegister: ReturnType<typeof vi.fn>;
  let rootsSignal: WritableSignal<readonly FacilityOutput[]>;
  let summarySignal: WritableSignal<ComplianceSummaryOutput | null>;
  let isExportingSignal: WritableSignal<boolean>;
  let loadSnapshots: ReturnType<typeof vi.fn>;
  let archiveRegister: ReturnType<typeof vi.fn>;
  let downloadSnapshot: ReturnType<typeof vi.fn>;
  let feedbackSuccess: ReturnType<typeof vi.fn>;
  let feedbackError: ReturnType<typeof vi.fn>;
  let exportLabels: ReturnType<typeof vi.fn>;
  let triggerDownload: ReturnType<typeof vi.fn>;
  let archiveCallStateSignal: WritableSignal<CallState>;
  let downloadCallStateSignal: WritableSignal<CallState>;
  let snapshotsSignal: WritableSignal<readonly SafetyRegisterSnapshotOutput[]>;
  let isArchivingSignal: WritableSignal<boolean>;
  let downloadingSnapshotIdSignal: WritableSignal<string | null>;

  beforeEach(() => {
    mobile = signal(false);
    hasPermission = vi.fn().mockReturnValue(true);
    loadRoots = vi.fn();
    ensureChildrenLoaded = vi.fn();
    move = vi.fn();
    duplicate = vi.fn();
    loadEquipment = vi.fn();
    loadInspections = vi.fn();
    loadTree = vi.fn();
    loadSummary = vi.fn();
    exportSafetyRegister = vi.fn();
    rootsSignal = signal<readonly FacilityOutput[]>([facility()]);
    summarySignal = signal<ComplianceSummaryOutput | null>(null);
    isExportingSignal = signal<boolean>(false);
    loadSnapshots = vi.fn();
    archiveRegister = vi.fn();
    downloadSnapshot = vi.fn();
    feedbackSuccess = vi.fn();
    feedbackError = vi.fn();
    exportLabels = vi.fn().mockReturnValue(of(new Blob(['pdf'], { type: 'application/pdf' })));
    triggerDownload = vi.fn();
    archiveCallStateSignal = signal<CallState>(idleCallState());
    downloadCallStateSignal = signal<CallState>(idleCallState());
    snapshotsSignal = signal<readonly SafetyRegisterSnapshotOutput[]>([]);
    isArchivingSignal = signal<boolean>(false);
    downloadingSnapshotIdSignal = signal<string | null>(null);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: mobile,
            interactionMode: () => (mobile() ? 'mobile' : 'desktop'),
          },
        },
        provideZonelessChangeDetection(),
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
        provideRouter([]),
        {
          provide: THEME_PORT,
          useValue: {
            theme: signal('light'),
            resolvedTheme: signal('light'),
            setTheme: vi.fn(),
          } satisfies ThemePort,
        },
        {
          provide: FacilityTreeStore,
          useValue: {
            roots: rootsSignal,
            childrenByParent: signal({}),
            expandingParentIds: signal([]),
            failedParentIds: signal([]),
            isMoving: signal(false),
            isDuplicating: signal(false),
            loadRoots,
            ensureChildrenLoaded,
            move,
            duplicate,
          },
        },
        {
          provide: OrganizationAssetsPaneStore,
          useValue: {
            equipment: signal([]),
            equipmentListCallState: signal(successCallState([])),
            equipmentTotal: signal(0),
            equipmentPage: signal(1),
            equipmentPageCount: signal(1),
            isLoadingEquipment: signal(false),
            hasEquipmentError: signal(false),
            inspections: signal([]),
            inspectionListCallState: signal(successCallState([])),
            inspectionTotal: signal(0),
            inspectionPage: signal(1),
            inspectionPageCount: signal(1),
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
            snapshots: snapshotsSignal,
            snapshotsCallState: signal(successCallState({ member: [], totalItems: 0 })),
            isLoadingSnapshots: signal(false),
            hasSnapshotsError: signal(false),
            isArchiving: isArchivingSignal,
            archiveCallState: archiveCallStateSignal,
            downloadCallState: downloadCallStateSignal,
            downloadingSnapshotId: downloadingSnapshotIdSignal,
            loadSnapshots,
            archiveRegister,
            downloadSnapshot,
          },
        },
        { provide: FeedbackService, useValue: { success: feedbackSuccess, error: feedbackError } },
        { provide: EquipmentService, useValue: { exportLabels } },
        { provide: BrowserDownloadService, useValue: { trigger: triggerDownload } },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission },
        },
      ],
    });
  });

  it('returns to mobile browsing by clearing the site selection without reloading the panes', async () => {
    mobile.set(true);
    fixture = await createPage();
    fixture.componentInstance['onNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: facility(),
    });
    await fixture.whenStable();
    const calls = loadEquipment.mock.calls.length;
    fixture.componentInstance['clearFacilitySelection']();
    await fixture.whenStable();
    expect(fixture.componentInstance['selectedFacilityId']()).toBeNull();
    expect(fixture.componentInstance['facilityBrowserVisible']()).toBe(true);
    expect(loadEquipment).toHaveBeenCalledTimes(calls);
    mobile.set(false);
    await fixture.whenStable();
    expect(
      fixture.nativeElement
        .querySelector('[data-testid="assets-tree-panel"]')
        .classList.contains('hidden'),
    ).toBe(false);
    expect(
      fixture.nativeElement
        .querySelector('[data-testid="assets-detail-panel"]')
        .classList.contains('hidden'),
    ).toBe(false);
  });

  it('keeps the site selection instruction in the visible mobile hierarchy panel', async () => {
    mobile.set(true);
    fixture = await createPage();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-testid="assets-tree-panel"]')?.classList).not.toContain(
      'hidden',
    );
    expect(element.querySelector('[data-testid="assets-detail-panel"]')?.classList).toContain(
      'hidden',
    );
    expect(
      element.querySelector('[data-testid="assets-mobile-select-prompt"]')?.textContent,
    ).toContain('Select a site');
  });

  it('returns to the compliance hierarchy by clearing the summary selection', async () => {
    mobile.set(true);
    fixture = await createPage();
    fixture.componentInstance['onAxisActivated']('compliance');
    fixture.componentInstance['onComplianceNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: complianceNode(),
    });
    await fixture.whenStable();
    const calls = loadSummary.mock.calls.length;
    fixture.componentInstance['clearComplianceSelection']();
    await fixture.whenStable();
    expect(fixture.componentInstance['selectedComplianceFacilityId']()).toBeNull();
    expect(fixture.componentInstance['complianceBrowserVisible']()).toBe(true);
    expect(loadSummary).toHaveBeenCalledTimes(calls);
    expect(
      fixture.nativeElement
        .querySelector('[data-testid="assets-compliance-tree-panel"]')
        .classList.contains('hidden'),
    ).toBe(false);
    expect(
      fixture.nativeElement
        .querySelector('[data-testid="assets-compliance-detail-panel"]')
        .classList.contains('hidden'),
    ).toBe(true);
  });

  it('restores and loads a URL-backed compliance selection', async () => {
    fixture = await createPage({
      organizationId: 'org-1',
      axis: 'compliance',
      compliance: 'facility-1',
    });

    expect(fixture.componentInstance['selectedComplianceFacilityId']()).toBe('facility-1');
    expect(loadTree).toHaveBeenCalledWith('org-1');
    expect(loadSummary).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
    });
  });

  it('loads the site roots on arrival', async () => {
    fixture = await createPage();

    expect(loadRoots).toHaveBeenCalledWith('org-1');
  });

  it('disables mobile dragging while keeping the site menu and desktop drag available', async () => {
    mobile.set(true);
    fixture = await createPage();
    const element = fixture.nativeElement as HTMLElement;
    expect(
      element.querySelector('[data-testid="tree-item"]')?.getAttribute('draggable'),
    ).toBeNull();
    expect(element.querySelector('[data-testid="assets-tree-node-menu"]')).not.toBeNull();

    mobile.set(false);
    await fixture.whenStable();
    expect(element.querySelector('[data-testid="tree-item"]')?.getAttribute('draggable')).toBe(
      'true',
    );
    expect(loadRoots).toHaveBeenCalledTimes(1);
  });

  it('shows the selected site name and ancestor context without refetching on interaction mode changes', async () => {
    rootsSignal.set([
      facility({
        path: [
          { id: 'campus', name: 'North campus', type: 'site' },
          { id: 'facility-1', name: 'Headquarters', type: 'building' },
        ],
      }),
    ]);
    mobile.set(true);
    fixture = await createPage({ organizationId: 'org-1', facility: 'facility-1' });
    const element = fixture.nativeElement as HTMLElement;
    const context = element.querySelector('[data-testid="assets-selected-site-context"]');
    expect(context?.querySelector('h2')?.textContent).toContain('Headquarters');
    expect(context?.querySelector('p')?.textContent).toContain('North campus');
    const calls = loadEquipment.mock.calls.length;
    mobile.set(false);
    await fixture.whenStable();
    mobile.set(true);
    await fixture.whenStable();
    expect(
      element.querySelector('[data-testid="assets-selected-site-context"]')?.textContent,
    ).toContain('North campus');
    expect(loadEquipment).toHaveBeenCalledTimes(calls);
  });

  it.each([
    {
      mobileMode: true,
      equipmentWrite: true,
      facilityWrite: true,
      directFacility: false,
      menu: true,
    },
    {
      mobileMode: true,
      equipmentWrite: false,
      facilityWrite: true,
      directFacility: true,
      menu: false,
    },
    {
      mobileMode: true,
      equipmentWrite: true,
      facilityWrite: false,
      directFacility: false,
      menu: false,
    },
    {
      mobileMode: false,
      equipmentWrite: true,
      facilityWrite: true,
      directFacility: true,
      menu: false,
    },
  ])(
    'preserves permitted creation paths for $mobileMode/$equipmentWrite/$facilityWrite',
    async ({ mobileMode, equipmentWrite, facilityWrite, directFacility, menu }) => {
      mobile.set(mobileMode);
      hasPermission.mockImplementation((permission: string): boolean => {
        if (permission === 'organization.equipment.write') return equipmentWrite;
        if (permission === 'organization.facilities.write') return facilityWrite;
        return true;
      });
      fixture = await createPage({ organizationId: 'org-1', facility: 'facility-1' });
      const template = fixture.componentInstance['pageActions']();
      if (!template) throw new Error('Missing page actions');
      const view = template.createEmbeddedView({});
      view.detectChanges();
      const host = document.createElement('div');
      host.append(...(view.rootNodes as Node[]));
      try {
        const equipment = host.querySelector<HTMLAnchorElement>(
          '[data-testid="assets-new-equipment"]',
        );
        const facilityLink = host.querySelector<HTMLAnchorElement>(
          '[data-testid="assets-new-facility"]',
        );
        expect(equipment !== null).toBe(equipmentWrite);
        expect(facilityLink !== null).toBe(directFacility);
        expect(host.querySelector('[data-testid="assets-create-menu"]') !== null).toBe(menu);
        if (equipment) expect(equipment.getAttribute('href')).toContain('facility=facility-1');
        if (facilityLink) expect(facilityLink.getAttribute('href')).toContain('parent=facility-1');
      } finally {
        view.destroy();
      }
    },
  );

  it('loads nothing in the right pane while on "By site" with no selection', async () => {
    fixture = await createPage();

    expect(loadEquipment).not.toHaveBeenCalled();
    expect(loadInspections).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-resource-illustration')).toBeNull();
  });

  it('uses matching artwork for the two completed empty resource panes', async () => {
    fixture = await createPage({ organizationId: 'org-1', axis: 'everything' });
    const images = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'app-resource-illustration img',
    );

    expect([...images].map((image) => image.getAttribute('src'))).toEqual([
      '/assets/illustrations/resources/light/equipment.svg',
      '/assets/illustrations/resources/light/inspection.svg',
    ]);
  });

  it('uses document artwork for an empty archive without replacing the archive action', async () => {
    fixture = await createPage({ organizationId: 'org-1', axis: 'compliance' });
    const host = fixture.nativeElement as HTMLElement;

    expect(
      host
        .querySelector('[data-testid="assets-compliance-snapshots-empty"] img')
        ?.getAttribute('src'),
    ).toBe('/assets/illustrations/resources/light/document.svg');
    expect(host.textContent).toContain('Archive register');
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

  it('pages the selected site resources independently and retries in the same scope', async () => {
    fixture = await createPage();
    fixture.componentInstance['onNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: facility(),
    });
    await fixture.whenStable();
    loadEquipment.mockClear();
    loadInspections.mockClear();

    fixture.componentInstance['changePanePage']('equipment', 3);
    expect(loadEquipment).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
      page: 3,
    });
    expect(loadInspections).not.toHaveBeenCalled();

    fixture.componentInstance['changePanePage']('inspections', 2);
    expect(loadInspections).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
      page: 2,
    });
    loadEquipment.mockClear();
    loadInspections.mockClear();
    fixture.componentInstance['retryPane']();
    expect(loadEquipment).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
    });
    expect(loadInspections).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
    });
  });

  it('does not load a resource the acting member cannot read when paging or retrying', async () => {
    hasPermission.mockImplementation(
      (permission: string) => permission === 'organization.equipment.read',
    );
    fixture = await createPage();
    loadEquipment.mockClear();
    loadInspections.mockClear();

    fixture.componentInstance['changePanePage']('equipment', 2);
    fixture.componentInstance['changePanePage']('inspections', 2);
    fixture.componentInstance['retryPane']();

    expect(loadEquipment).toHaveBeenCalledTimes(2);
    expect(loadInspections).not.toHaveBeenCalled();
  });

  it('retries a failed compliance tree but does not query a summary without a selection', async () => {
    fixture = await createPage();
    loadTree.mockClear();
    loadSummary.mockClear();

    fixture.componentInstance['retryComplianceTree']();
    fixture.componentInstance['retryComplianceSummary']();

    expect(loadTree).toHaveBeenCalledExactlyOnceWith('org-1');
    expect(loadSummary).not.toHaveBeenCalled();
    fixture.componentInstance['onComplianceNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: complianceNode(),
    });
    await fixture.whenStable();
    loadSummary.mockClear();
    fixture.componentInstance['retryComplianceSummary']();
    expect(loadSummary).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
    });
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

  it('duplicates a facility from the tree row menu', async () => {
    fixture = await createPage();

    fixture.componentInstance['onDuplicateRequested']({
      id: 'facility-2',
      label: 'Wing',
      hasChildren: false,
      data: facility(),
    });

    expect(duplicate).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-2',
    });
  });

  it('prints the selected facility subtree QR label sheet from the "By site" axis', async () => {
    fixture = await createPage();

    fixture.componentInstance['onNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: facility(),
    });
    await fixture.whenStable();

    fixture.componentInstance['onPrintLabels']();
    await fixture.whenStable();

    expect(exportLabels).toHaveBeenCalledWith('org-1', { facilityId: 'facility-1' });
    expect(triggerDownload).toHaveBeenCalledWith(
      expect.any(Blob),
      'equipment-labels-facility-1.pdf',
    );
    expect(fixture.componentInstance['labelsBusy']()).toBe(false);
  });

  it('does nothing when labels are requested with no facility selected', async () => {
    fixture = await createPage();

    fixture.componentInstance['onPrintLabels']();
    await fixture.whenStable();

    expect(exportLabels).not.toHaveBeenCalled();
  });

  it('surfaces the 422 over-500-labels detail as an error toast', async () => {
    const detail = 'The selection matches 623 labels; at most 500 are printable per sheet.';
    exportLabels.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 422,
            error: new Blob(
              [
                JSON.stringify({
                  '@id': '/errors/422',
                  '@type': 'Error',
                  status: 422,
                  type: 'about:blank',
                  title: 'Unprocessable Entity',
                  detail,
                }),
              ],
              { type: 'application/problem+json' },
            ),
          }),
      ),
    );
    fixture = await createPage();

    fixture.componentInstance['onNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: facility(),
    });
    await fixture.whenStable();

    fixture.componentInstance['onPrintLabels']();
    await fixture.whenStable();
    await vi.waitFor(() => expect(feedbackError).toHaveBeenCalled());

    expect(feedbackError).toHaveBeenCalledWith(detail);
    expect(fixture.componentInstance['labelsBusy']()).toBe(false);
    expect(triggerDownload).not.toHaveBeenCalled();
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

  it('archives the register scoped to the selected facility', async () => {
    fixture = await createPage();

    fixture.componentInstance['onComplianceNodeSelected']({
      id: 'facility-1',
      label: 'Headquarters',
      hasChildren: false,
      data: complianceNode(),
    });
    fixture.componentInstance['onArchiveRegister']();
    await fixture.whenStable();

    expect(archiveRegister).toHaveBeenCalledWith({
      organizationId: 'org-1',
      facilityId: 'facility-1',
    });
  });

  it('archives the organization-wide register when no facility is selected', async () => {
    fixture = await createPage();

    fixture.componentInstance['onArchiveRegister']();
    await fixture.whenStable();

    expect(archiveRegister).toHaveBeenCalledWith({ organizationId: 'org-1' });
  });

  it('ignores an archive request while an archive is already running', async () => {
    fixture = await createPage();
    isArchivingSignal.set(true);

    fixture.componentInstance['onArchiveRegister']();
    await fixture.whenStable();

    expect(archiveRegister).not.toHaveBeenCalled();
  });

  it('loads the archived snapshots on first compliance-axis activation', async () => {
    fixture = await createPage();

    fixture.componentInstance['onAxisActivated']('compliance');
    await fixture.whenStable();

    expect(loadTree).toHaveBeenCalledWith('org-1');
    expect(loadSnapshots).toHaveBeenCalledWith('org-1');
  });

  it('toasts success and reloads the snapshot list once the archive settles', async () => {
    fixture = await createPage();

    archiveCallStateSignal.set(successCallState(null));
    await fixture.whenStable();

    expect(feedbackSuccess).toHaveBeenCalledTimes(1);
    expect(loadSnapshots).toHaveBeenCalledWith('org-1');
  });

  it('toasts the RFC 7807 detail when the archive is refused', async () => {
    fixture = await createPage();

    archiveCallStateSignal.set(
      errorCallState(toStoreError({ '@type': 'Error', status: 403, detail: 'Plan not entitled' })),
    );
    await fixture.whenStable();

    expect(feedbackError).toHaveBeenCalledWith('Plan not entitled');
  });

  it('toasts a failure when a snapshot download errors', async () => {
    fixture = await createPage();

    downloadCallStateSignal.set(errorCallState(toStoreError(new Error('boom'))));
    await fixture.whenStable();

    expect(feedbackError).toHaveBeenCalledTimes(1);
  });

  it('renders the archived snapshots and downloads one row on click', async () => {
    fixture = await createPage();
    snapshotsSignal.set([snapshot()]);

    fixture.componentInstance['onAxisActivated']('compliance');
    await fixture.whenStable();

    const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      '[data-testid="assets-compliance-snapshots-row"]',
    );
    expect(rows).toHaveLength(1);

    const download: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      '[data-testid="assets-compliance-snapshots-download"]',
    );
    download?.click();
    await fixture.whenStable();

    expect(downloadSnapshot).toHaveBeenCalledWith({
      organizationId: 'org-1',
      snapshotId: 'snap-1',
      fileName: 'safety-register-2026-08-27.pdf',
    });
  });

  it('announces export and archive progress outside their buttons', async () => {
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

    const exportButton: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="assets-compliance-export"]',
    );
    const archiveButton: HTMLElement | null = fixture.nativeElement.querySelector(
      '[data-testid="assets-compliance-archive"]',
    );
    const exportStatus: HTMLOutputElement | null = fixture.nativeElement.querySelector(
      'output[data-testid="assets-compliance-export-status"]',
    );
    const archiveStatus: HTMLOutputElement | null = fixture.nativeElement.querySelector(
      'output[data-testid="assets-compliance-archive-status"]',
    );
    expect(exportStatus?.getAttribute('aria-live')).toBe('polite');
    expect(archiveStatus?.getAttribute('aria-live')).toBe('polite');
    expect(exportStatus?.textContent?.trim()).toBe('');
    expect(archiveStatus?.textContent?.trim()).toBe('');
    expect(exportButton?.querySelector('[role="status"]')).toBeNull();
    expect(archiveButton?.querySelector('[role="status"]')).toBeNull();
    expect(exportButton?.textContent).toContain('Export safety register');

    isExportingSignal.set(true);
    await fixture.whenStable();

    expect(exportButton?.textContent).toContain('Exporting…');
    expect(exportStatus?.textContent).toContain('Export safety register');
    expect(exportStatus?.textContent).toContain('Exporting…');

    isExportingSignal.set(false);
    isArchivingSignal.set(true);
    await fixture.whenStable();

    expect(archiveButton?.textContent).toContain('Archiving…');
    expect(archiveStatus?.textContent).toContain('Archive register');
    expect(archiveStatus?.textContent).toContain('Archiving…');
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

  it('withholds the export button from a member without the export permission', async () => {
    hasPermission.mockImplementation(
      (permission: string): boolean => permission !== 'organization.compliance.export',
    );
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

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="assets-compliance-export"]',
      ),
    ).toBeNull();
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
