import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityTreeStore } from '@features/organization/features/facilities/state';
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
  let loadEquipment: ReturnType<typeof vi.fn>;
  let loadInspections: ReturnType<typeof vi.fn>;
  let rootsSignal: WritableSignal<readonly FacilityOutput[]>;

  beforeEach(() => {
    loadRoots = vi.fn();
    ensureChildrenLoaded = vi.fn();
    loadEquipment = vi.fn();
    loadInspections = vi.fn();
    rootsSignal = signal<readonly FacilityOutput[]>([facility()]);

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
            loadRoots,
            ensureChildrenLoaded,
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
});
