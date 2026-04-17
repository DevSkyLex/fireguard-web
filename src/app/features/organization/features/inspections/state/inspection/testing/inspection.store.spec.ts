import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type {
  InspectionOutput,
  NonConformityOutput,
} from '@features/organization/features/inspections/models';
import { ActiveInspectionStore } from '../../active-inspection/active-inspection.store';
import { InspectionStore } from '../inspection.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('InspectionStore', () => {
  let store: InspectionStore;
  let mockInspectionService: {
    list: ReturnType<typeof vi.fn>;
    listNonConformities: ReturnType<typeof vi.fn>;
  };

  const inspection = { id: 'inspection-1', reference: 'INSP-1' } as unknown as InspectionOutput;
  const nonConformity = {
    id: 'nc-1',
    title: 'Door blocked',
  } as unknown as NonConformityOutput;
  const inspectionsCollection: HydraCollection<InspectionOutput> = {
    '@id': '/api/organizations/org-1/inspections',
    '@type': 'Collection',
    totalItems: 1,
    member: [inspection],
  };
  const nonConformitiesCollection: HydraCollection<NonConformityOutput> = {
    '@id': '/api/organizations/org-1/inspections/inspection-1/non-conformities',
    '@type': 'Collection',
    totalItems: 1,
    member: [nonConformity],
  };

  beforeEach(() => {
    mockInspectionService = {
      list: vi.fn().mockReturnValue(of(inspectionsCollection)),
      listNonConformities: vi.fn().mockReturnValue(of(nonConformitiesCollection)),
    };

    TestBed.configureTestingModule({
      providers: [
        InspectionStore,
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: InspectionService, useValue: mockInspectionService },
        {
          provide: ActiveInspectionStore,
          useValue: {
            selectedInspection: signal<InspectionOutput | null>(null),
            isLoadingInspection: signal(false),
          },
        },
      ],
    });

    store = TestBed.inject(InspectionStore);
  });

  it('should load inspections', async () => {
    store.load({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockInspectionService.list).toHaveBeenCalledWith('org-1', undefined);
    expect(store.inspections()).toEqual([inspection]);
    expect(store.totalInspections()).toBe(1);
  });

  it('should load non-conformities for an inspection', async () => {
    store.loadNonConformities({ organizationId: 'org-1', inspectionId: 'inspection-1' });
    await flushEffects();

    expect(mockInspectionService.listNonConformities).toHaveBeenCalledWith(
      'org-1',
      'inspection-1',
      undefined,
    );
    expect(store.nonConformities()).toEqual([nonConformity]);
    expect(store.totalNonConformities()).toBe(1);
  });
});
