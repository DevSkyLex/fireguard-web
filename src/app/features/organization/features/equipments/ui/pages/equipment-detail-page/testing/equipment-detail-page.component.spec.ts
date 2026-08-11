import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  errorCallState,
  idleCallState,
  successCallState,
  type CallState,
  type StoreError,
} from '@core/request-state';
import { TitleService } from '@core/title';
import { OrganizationPermissionService } from '@features/organization/access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import {
  ActiveEquipmentStore,
  EquipmentStore,
} from '@features/organization/features/equipments/state';
import { EquipmentDetailPage } from '../equipment-detail-page.component';

const equipment = (overrides: Partial<EquipmentOutput> = {}): EquipmentOutput =>
  ({
    '@id': '/api/organizations/org-1/equipment/equipment-1',
    '@type': 'Equipment',
    id: 'equipment-1',
    organizationId: 'org-1',
    facilityId: null,
    facilityName: null,
    type: 'fire_extinguisher',
    subType: null,
    brand: 'Kidde',
    model: 'Pro 210',
    serialNumber: null,
    locationLabel: null,
    status: 'in_stock',
    installedAt: null,
    commissionedAt: null,
    tags: [],
    maintenanceDueStatus: 'unscheduled',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as EquipmentOutput;

describe('EquipmentDetailPage', () => {
  let fixture: ComponentFixture<EquipmentDetailPage>;
  let update: ReturnType<typeof vi.fn>;
  let commission: ReturnType<typeof vi.fn>;
  let maintenance: ReturnType<typeof vi.fn>;
  let decommission: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let setTitle: ReturnType<typeof vi.fn>;
  let selectedEquipment: WritableSignal<EquipmentOutput | null>;
  let getError: WritableSignal<StoreError | null>;
  let updateCallState: WritableSignal<CallState<EquipmentOutput | null>>;
  let isChangingLifecycle: WritableSignal<boolean>;

  const createPage = async (): Promise<void> => {
    fixture = TestBed.createComponent(EquipmentDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('equipmentId', 'equipment-1');
    await fixture.whenStable();
  };

  beforeEach(() => {
    update = vi.fn();
    commission = vi.fn();
    maintenance = vi.fn();
    decommission = vi.fn();
    setTitle = vi.fn();
    selectedEquipment = signal<EquipmentOutput | null>(equipment());
    getError = signal<StoreError | null>(null);
    updateCallState = signal<CallState<EquipmentOutput | null>>(idleCallState());
    isChangingLifecycle = signal<boolean>(false);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ActiveEquipmentStore, useValue: { selectedEquipment, getError } },
        { provide: TitleService, useValue: { setTitle } },
        {
          provide: EquipmentStore,
          useValue: {
            update,
            commission,
            maintenance,
            decommission,
            updateCallState,
            updateError: signal(null),
            isChangingLifecycle,
          },
        },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (): boolean => true },
        },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  it('should show the equipment title and status once resolved', async () => {
    await createPage();

    const text: string = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Fire extinguisher');
    expect(text).toContain('Kidde Pro 210');
  });

  it('should show a loading state before the equipment resolves', async () => {
    selectedEquipment.set(null);
    await createPage();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')).not.toBeNull();
  });

  it('should re-set the document title once the equipment resolves', async () => {
    selectedEquipment.set(null);
    await createPage();

    expect(setTitle).not.toHaveBeenCalled();

    selectedEquipment.set(equipment());
    await fixture.whenStable();

    expect(setTitle).toHaveBeenCalledWith('Fire extinguisher — Kidde Pro 210');
  });

  it('should return to the index when the load fails', async () => {
    selectedEquipment.set(null);
    await createPage();

    getError.set({ error: null, message: 'down', code: 500, retryable: false, timestamp: 0 });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'equipments']);
  });

  it.each([
    ['in_stock', 'Commission'],
    ['under_maintenance', 'Resume service'],
    ['operational', 'Maintenance'],
  ])('should offer %s as the primary action for status %s', async (status, label) => {
    selectedEquipment.set(equipment({ status: status as EquipmentOutput['status'] }));
    await createPage();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="equipment-primary-action"]',
      )?.textContent,
    ).toContain(label);
  });

  it('should offer no primary action once decommissioned', async () => {
    selectedEquipment.set(equipment({ status: 'decommissioned' }));
    await createPage();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="equipment-primary-action"]',
      ),
    ).toBeNull();
  });

  it('should not offer Decommission once already decommissioned', async () => {
    selectedEquipment.set(equipment({ status: 'decommissioned' }));
    await createPage();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="equipment-decommission"]',
      ),
    ).toBeNull();
  });

  it('should call commission when the primary action is taken from in_stock', async () => {
    await createPage();

    (
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="equipment-primary-action"]',
      ) as HTMLButtonElement
    ).click();

    expect(commission).toHaveBeenCalledWith({
      organizationId: 'org-1',
      equipmentId: 'equipment-1',
    });
  });

  it('should call decommission when the secondary action is taken', async () => {
    await createPage();

    (
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="equipment-decommission"]',
      ) as HTMLButtonElement
    ).click();

    expect(decommission).toHaveBeenCalledWith({
      organizationId: 'org-1',
      equipmentId: 'equipment-1',
    });
  });

  it('should refuse a lifecycle action while another one is already in flight', async () => {
    isChangingLifecycle.set(true);
    await createPage();

    fixture.componentInstance['onDecommission']();

    expect(decommission).not.toHaveBeenCalled();
  });

  it('should send an in-place patch for the currently open field', async () => {
    await createPage();

    fixture.componentInstance['onEditTargetChanged']('brand');
    fixture.componentInstance['onDetailsChanged']({ brand: 'Amerex' });

    expect(update).toHaveBeenCalledWith({
      organizationId: 'org-1',
      equipmentId: 'equipment-1',
      input: { brand: 'Amerex' },
    });
  });

  it('should close the field once its write succeeds', async () => {
    await createPage();

    fixture.componentInstance['onEditTargetChanged']('brand');
    fixture.componentInstance['onDetailsChanged']({ brand: 'Amerex' });
    updateCallState.set(successCallState(equipment({ brand: 'Amerex' })));
    await fixture.whenStable();

    expect(fixture.componentInstance['editState']()).toEqual({
      open: null,
      saving: null,
      failed: null,
      failure: null,
    });
  });

  it('should attribute a rejection to the field that caused it, and keep it open', async () => {
    await createPage();

    fixture.componentInstance['onEditTargetChanged']('brand');
    fixture.componentInstance['onDetailsChanged']({ brand: 'Amerex' });
    updateCallState.set(
      errorCallState({
        error: null,
        message: 'Rejected',
        code: 422,
        retryable: false,
        timestamp: 0,
      }),
    );
    await fixture.whenStable();

    expect(fixture.componentInstance['editState']()).toEqual({
      open: 'brand',
      saving: null,
      failed: 'brand',
      failure: 'Rejected',
    });
  });
});
