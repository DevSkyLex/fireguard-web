import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
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
    expect(store.savingIds()).toEqual([]);
  });

  it('removes the deleted entity', () => {
    store.load({ organizationIri: '/api/organizations/org-1' });

    store.remove('recurrence-1');

    expect(store.recurrenceEntities()).toEqual([]);
    expect(store.removeCallStates()['recurrence-1']?.status).toBe('success');
  });
  it('keeps writes on distinct rows independent and excludes updates and deletes on a busy row', () => {
    store.load({ organizationIri: recurrence.organization });
    const first = new Subject<InterventionRecurrenceOutput>();
    const second = new Subject<InterventionRecurrenceOutput>();
    service.update.mockReturnValueOnce(first).mockReturnValueOnce(second);
    store.update({ recurrenceId: 'recurrence-1', input: { isActive: false } });
    store.update({ recurrenceId: 'recurrence-2', input: { isActive: false } });
    store.update({ recurrenceId: 'recurrence-1', input: { name: 'Ignored' } });
    store.remove('recurrence-1');
    expect(service.update).toHaveBeenCalledTimes(2);
    expect(service.remove).not.toHaveBeenCalled();
    expect(first.observed).toBe(true);
    expect(store.savingIds()).toEqual(['recurrence-1', 'recurrence-2']);
    second.error(new Error('Second row rejected'));
    expect(store.updateCallStates()['recurrence-2']?.status).toBe('error');
    expect(store.savingIds()).toEqual(['recurrence-1']);
    first.next({ ...recurrence, isActive: false });
    first.complete();
    expect(store.recurrenceEntities()[0]?.isActive).toBe(false);
    expect(store.updateCallStates()['recurrence-1']?.status).toBe('success');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: '[Intervention Recurrence Store] updateSucceeded',
        payload: expect.objectContaining({ recurrenceId: 'recurrence-1' }),
      }),
    );
    store.remove('recurrence-1');
    expect(service.remove).toHaveBeenCalledTimes(1);
  });

  it('holds the same row lock while a delete is in flight and allows other deletes', () => {
    const first = new Subject<void>();
    const second = new Subject<void>();
    service.remove.mockReturnValueOnce(first).mockReturnValueOnce(second);
    store.remove('recurrence-1');
    store.remove('recurrence-2');
    store.remove('recurrence-1');
    store.update({ recurrenceId: 'recurrence-1', input: { isActive: false } });
    expect(service.remove).toHaveBeenCalledTimes(2);
    expect(service.update).not.toHaveBeenCalled();
    expect(store.removingIds()).toEqual(['recurrence-1', 'recurrence-2']);
    first.next();
    first.complete();
    expect(store.removingIds()).toEqual(['recurrence-2']);
    second.error(new Error('Denied'));
    expect(store.removeCallStates()['recurrence-1']?.status).toBe('success');
    expect(store.removeCallStates()['recurrence-2']?.status).toBe('error');
  });

  it('ignores duplicate creates until the accepted request completes and permits retry', () => {
    const first = new Subject<InterventionRecurrenceOutput>();
    service.create.mockReturnValueOnce(first);
    const input = {
      organization: recurrence.organization,
      template: recurrence.template,
      name: recurrence.name,
      anchorDate: new Date(),
    };
    store.create(input);
    store.create(input);
    expect(service.create).toHaveBeenCalledTimes(1);
    expect(store.createCallState().status).toBe('pending');
    first.error(new Error('Denied'));
    expect(store.createCallState().status).toBe('error');
    store.create(input);
    expect(service.create).toHaveBeenCalledTimes(2);
    expect(store.createCallState().status).toBe('success');
  });

  it('invalidates an A mutation after A-B-A without releasing the new A lock', () => {
    store.setOrganization(recurrence.organization);
    const old = new Subject<InterventionRecurrenceOutput>();
    const current = new Subject<InterventionRecurrenceOutput>();
    service.update.mockReturnValueOnce(old).mockReturnValueOnce(current);
    store.update({ recurrenceId: recurrence.id, input: { isActive: false } });
    store.setOrganization('/api/organizations/org-2');
    store.load({ organizationIri: recurrence.organization });
    store.update({ recurrenceId: recurrence.id, input: { name: 'Current' } });
    old.next({ ...recurrence, name: 'Obsolete' });
    old.complete();
    expect(store.recurrenceEntities()[0]?.name).toBe(recurrence.name);
    expect(store.savingIds()).toEqual([recurrence.id]);
    store.remove(recurrence.id);
    expect(service.remove).not.toHaveBeenCalled();
    current.next({ ...recurrence, name: 'Current' });
    current.complete();
    expect(store.recurrenceEntities()[0]?.name).toBe('Current');
  });

  it('accepts a creation in the new organization while an old accepted write completes', () => {
    const old = new Subject<InterventionRecurrenceOutput>();
    service.create.mockReturnValueOnce(old);
    const input = {
      organization: recurrence.organization,
      template: recurrence.template,
      name: recurrence.name,
      anchorDate: new Date(),
    };
    store.create(input);
    const other = { ...recurrence, organization: '/api/organizations/org-2', id: 'other' };
    service.create.mockReturnValueOnce(of(other));
    store.create({ ...input, organization: other.organization });
    expect(old.observed).toBe(true);
    old.next(recurrence);
    old.complete();
    expect(store.recurrenceEntities()).toEqual([other]);
    expect(store.createCallState().status).toBe('success');
  });
});
