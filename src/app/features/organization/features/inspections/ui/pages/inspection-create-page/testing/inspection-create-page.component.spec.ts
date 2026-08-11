import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { idleCallState, successCallState, type CallState } from '@core/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InspectionStore } from '@features/organization/features/inspections/state';
import { InspectionCreatePage } from '../inspection-create-page.component';

const CREATED: InspectionOutput = {
  '@id': '/api/organizations/org-1/inspections/inspection-9',
  '@type': 'Inspection',
  id: 'inspection-9',
  organizationId: 'org-1',
  equipmentId: 'equipment-1',
  facilityId: null,
  result: 'pass',
  status: 'draft',
  performedAt: '2026-08-10T00:00:00Z',
  inspector: null,
  checklistId: null,
  notes: null,
  signature: null,
  nonConformitiesCount: 0,
  createdAt: '2026-08-10T00:00:00Z',
  updatedAt: '2026-08-10T00:00:00Z',
};

describe('InspectionCreatePage', () => {
  let fixture: ComponentFixture<InspectionCreatePage>;
  let create: ReturnType<typeof vi.fn>;
  let resetCreateOperation: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let createCallState: WritableSignal<CallState<InspectionOutput | null>>;
  let equipmentList: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    create = vi.fn();
    resetCreateOperation = vi.fn();
    createCallState = signal<CallState<InspectionOutput | null>>(idleCallState());
    equipmentList = vi.fn().mockReturnValue(of({ member: [], totalItems: 0 }));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: InspectionStore,
          useValue: {
            create,
            resetCreateOperation,
            createCallState,
            isCreating: signal(false),
            createError: signal(null),
          },
        },
        { provide: EquipmentService, useValue: { list: equipmentList } },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(InspectionCreatePage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
  });

  it('should load the equipment picker options for the workspace on arrival', () => {
    expect(equipmentList).toHaveBeenCalledWith('org-1', { page: 1, itemsPerPage: 100 });
  });

  it('should send the submitted payload to the store', () => {
    fixture.componentInstance['onSubmitted']({
      equipmentId: 'equipment-1',
      result: 'pass',
      performedAt: '2026-08-10T00:00:00.000Z',
      inspectorType: 'user',
      inspectorName: 'Ada Lovelace',
    });

    expect(create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      input: {
        equipmentId: 'equipment-1',
        result: 'pass',
        performedAt: '2026-08-10T00:00:00.000Z',
        inspectorType: 'user',
        inspectorName: 'Ada Lovelace',
      },
    });
  });

  it('should navigate to the created record and reset the create state once the write succeeds', async () => {
    createCallState.set(successCallState(CREATED));
    await fixture.whenStable();

    expect(resetCreateOperation).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith([
      '/organizations',
      'org-1',
      'inspections',
      'inspection-9',
    ]);
  });

  it('should return to the inspection list on cancel', () => {
    fixture.componentInstance['onCancelled']();

    expect(navigate).toHaveBeenCalledWith(['/organizations', 'org-1', 'inspections']);
  });
});
