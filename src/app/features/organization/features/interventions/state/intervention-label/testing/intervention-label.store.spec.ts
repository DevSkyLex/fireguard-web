import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { InterventionLabelService } from '@features/organization/features/interventions/data-access';
import { InterventionLabelStore } from '../intervention-label.store';

describe('InterventionLabelStore', () => {
  let store: InstanceType<typeof InterventionLabelStore>;
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
      list: vi
        .fn()
        .mockReturnValue(
          of({ member: [{ id: 'label-1', name: 'Compliance', color: '#ff0000' }], totalItems: 1 }),
        ),
      create: vi.fn().mockReturnValue(of({ id: 'label-2', name: 'Urgent', color: '#00ff00' })),
      update: vi.fn().mockReturnValue(of({ id: 'label-1', name: 'Renamed', color: '#ff0000' })),
      remove: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        InterventionLabelStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: InterventionLabelService, useValue: service },
      ],
    });

    store = TestBed.inject(InterventionLabelStore);
  });

  it('loads the label catalog into entities', () => {
    store.load('/api/organizations/org-1');

    expect(service.list).toHaveBeenCalledWith('/api/organizations/org-1');
    expect(store.labelEntities()).toEqual([
      { id: 'label-1', name: 'Compliance', color: '#ff0000' },
    ]);
    expect(store.listCallState().status).toBe('success');
  });

  it('dispatches loadFailed on a load error', () => {
    service.list.mockReturnValue(throwError(() => new Error('boom')));

    store.load('/api/organizations/org-1');

    expect(store.listCallState().status).toBe('error');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Intervention Label Store] loadFailed' }),
    );
  });

  it('adds the created label to entities', () => {
    store.create({ organization: '/api/organizations/org-1', name: 'Urgent', color: '#00ff00' });

    expect(store.labelEntities()).toEqual([{ id: 'label-2', name: 'Urgent', color: '#00ff00' }]);
    expect(store.createCallState().status).toBe('success');
  });

  it('applies an update to the matching entity', () => {
    store.create({
      organization: '/api/organizations/org-1',
      name: 'Compliance',
      color: '#ff0000',
    });
    service.create.mockReturnValueOnce(of({ id: 'label-1', name: 'Compliance', color: '#ff0000' }));

    store.update({ labelId: 'label-1', input: { name: 'Renamed' } });

    expect(service.update).toHaveBeenCalledWith('label-1', { name: 'Renamed' });
    expect(store.updateCallState().status).toBe('success');
    expect(store.savingId()).toBeNull();
  });

  it('removes the deleted entity', () => {
    store.load('/api/organizations/org-1');

    store.remove('label-1');

    expect(service.remove).toHaveBeenCalledWith('label-1');
    expect(store.labelEntities()).toEqual([]);
    expect(store.removeCallState().status).toBe('success');
  });
});
