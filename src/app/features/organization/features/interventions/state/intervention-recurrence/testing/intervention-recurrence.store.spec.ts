import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { InterventionRecurrenceService } from '@features/organization/features/interventions/data-access';
import type { InterventionRecurrenceOutput } from '@features/organization/features/interventions/models';
import { InterventionRecurrenceStore } from '../intervention-recurrence.store';

const recurrence = {
  '@id': '/api/intervention-recurrences/recurrence-1',
  '@type': 'InterventionRecurrence',
  id: 'recurrence-1',
  organization: '/api/organizations/org-1',
  template: '/api/intervention-templates/template-1',
  name: 'Monthly extinguisher check',
  site: null,
  responsible: null,
  frequency: 'monthly',
  interval: 1,
  anchorDate: '2026-01-15T00:00:00Z',
  timezone: 'Europe/Paris',
  leadTimeDays: 7,
  nextOccurrenceAt: '2026-02-15T00:00:00Z',
  lastMaterializedAt: null,
  isActive: true,
  endAt: null,
  createdAt: '',
  updatedAt: '',
} as InterventionRecurrenceOutput;

describe('InterventionRecurrenceStore', () => {
  let store: InstanceType<typeof InterventionRecurrenceStore>;
  let service: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let dispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dispatch = vi.fn();
    service = {
      list: vi.fn().mockReturnValue(of({ member: [recurrence], totalItems: 1 })),
      create: vi.fn().mockReturnValue(of(recurrence)),
      update: vi.fn().mockReturnValue(of({ ...recurrence, isActive: false })),
      remove: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        InterventionRecurrenceStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: InterventionRecurrenceService, useValue: service },
      ],
    });

    store = TestBed.inject(InterventionRecurrenceStore);
  });

  it('loads recurrences into entities', () => {
    store.load({ organizationIri: '/api/organizations/org-1' });

    expect(service.list).toHaveBeenCalledWith('/api/organizations/org-1', undefined);
    expect(store.recurrenceEntities()).toEqual([recurrence]);
    expect(store.listCallState().status).toBe('success');
  });

  it('dispatches loadFailed on a load error', () => {
    service.list.mockReturnValue(throwError(() => new Error('boom')));

    store.load({ organizationIri: '/api/organizations/org-1' });

    expect(store.listCallState().status).toBe('error');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Intervention Recurrence Store] loadFailed' }),
    );
  });

  it('adds a created recurrence to entities', () => {
    store.create({
      organization: '/api/organizations/org-1',
      template: '/api/intervention-templates/template-1',
      name: 'Monthly extinguisher check',
      anchorDate: new Date('2026-01-15T00:00:00.000Z'),
    });

    expect(store.recurrenceEntities()).toEqual([recurrence]);
    expect(store.createCallState().status).toBe('success');
  });

  it('applies the server response — including the recomputed nextOccurrenceAt — to the updated entity', () => {
    store.load({ organizationIri: '/api/organizations/org-1' });

    store.update({ recurrenceId: 'recurrence-1', input: { isActive: false } });

    expect(service.update).toHaveBeenCalledWith('recurrence-1', { isActive: false });
    expect(store.recurrenceEntities()[0]?.isActive).toBe(false);
    expect(store.savingId()).toBeNull();
  });

  it('removes the deleted entity', () => {
    store.load({ organizationIri: '/api/organizations/org-1' });

    store.remove('recurrence-1');

    expect(store.recurrenceEntities()).toEqual([]);
    expect(store.removeCallState().status).toBe('success');
  });
});
