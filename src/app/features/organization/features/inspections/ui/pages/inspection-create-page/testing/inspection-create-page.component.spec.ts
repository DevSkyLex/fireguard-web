import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { idleCallState, successCallState, type CallState } from '@core/request-state';
import { ChecklistService } from '@features/organization/features/checklists/data-access';
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
  let checklistList: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    create = vi.fn();
    resetCreateOperation = vi.fn();
    createCallState = signal<CallState<InspectionOutput | null>>(idleCallState());
    equipmentList = vi.fn().mockReturnValue(of({ member: [], totalItems: 0 }));
    checklistList = vi.fn().mockReturnValue(of({ member: [], totalItems: 0 }));

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
        { provide: ChecklistService, useValue: { list: checklistList } },
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

  it('should load the active checklist options for the workspace on arrival', () => {
    expect(checklistList).toHaveBeenCalledWith('org-1', {
      itemsPerPage: 200,
      status: 'active',
    });
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
