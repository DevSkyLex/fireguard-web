import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { idleCallState, successCallState, type CallState } from '@core/request-state';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { EquipmentCreatePage } from '../equipment-create-page.component';

const CREATED: EquipmentOutput = {
  '@id': '/api/organizations/org-1/equipment/equipment-9',
  '@type': 'Equipment',
  id: 'equipment-9',
  organizationId: 'org-1',
  facilityId: null,
  facilityName: null,
  type: 'fire_extinguisher',
  subType: null,
  brand: null,
  model: null,
  serialNumber: null,
  locationLabel: null,
  status: 'in_stock',
  installedAt: null,
  commissionedAt: null,
  tags: [],
  maintenanceDueStatus: 'unscheduled',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('EquipmentCreatePage', () => {
  let fixture: ComponentFixture<EquipmentCreatePage>;
  let create: ReturnType<typeof vi.fn>;
  let resetCreateOperation: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let createCallState: WritableSignal<CallState<EquipmentOutput | null>>;

  beforeEach(async () => {
    create = vi.fn();
    resetCreateOperation = vi.fn();
    createCallState = signal<CallState<EquipmentOutput | null>>(idleCallState());

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: FacilityService,
          useValue: { list: (): unknown => of({ member: [], totalItems: 0 }) },
        },
        {
          provide: EquipmentStore,
          useValue: {
            create,
            resetCreateOperation,
            createCallState,
            isCreating: signal(false),
            createError: signal(null),
          },
        },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(EquipmentCreatePage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
  });

  it('should send the submitted payload to the store', () => {
    fixture.componentInstance['onSubmitted']({ type: 'fire_extinguisher' });

    expect(create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: { type: 'fire_extinguisher' },
    });
  });

  it('should navigate to the created record and reset the create state once the write succeeds', async () => {
    createCallState.set(successCallState(CREATED));
    await fixture.whenStable();

    expect(resetCreateOperation).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'equipments', 'equipment-9']);
  });

  it('should return to the equipment list on cancel', () => {
    fixture.componentInstance['onCancelled']();

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'equipments']);
  });

  it('should report nothing unsaved when the form is pristine', () => {
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('should report unsaved work once the form reports dirty and no write is settled', () => {
    fixture.componentInstance['formDirty'].set(true);

    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });

  it('should not report unsaved work once the create write has succeeded, even while dirty', () => {
    fixture.componentInstance['formDirty'].set(true);
    createCallState.set(successCallState(CREATED));

    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('should resolve confirmDeactivation true once the dialog reports confirmed', async () => {
    const result = fixture.componentInstance.confirmDeactivation();

    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('open');

    fixture.componentInstance['onUnsavedChangesConfirmed']();

    await expect(result).resolves.toBe(true);
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('closed');
  });

  it('should resolve confirmDeactivation false once the dialog reports dismissed', async () => {
    const result = fixture.componentInstance.confirmDeactivation();

    fixture.componentInstance['onUnsavedChangesDismissed']();

    await expect(result).resolves.toBe(false);
  });
});
