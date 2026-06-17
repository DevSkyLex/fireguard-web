import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { EMPTY } from 'rxjs';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import { InterventionDatabaseService } from '../intervention-database.service';
import { InterventionOutboxRepository } from '../intervention-outbox.repository';

describe('InterventionOutboxRepository', () => {
  it('persists a grouped field intention in one IndexedDB transaction', async () => {
    const database = {
      browser: false,
      ensureOwnerBound: vi.fn().mockResolvedValue(undefined),
      putTransaction: vi.fn().mockResolvedValue(undefined),
    };
    TestBed.configureTestingModule({
      providers: [
        InterventionOutboxRepository,
        { provide: InterventionDatabaseService, useValue: database },
        { provide: Events, useValue: { on: vi.fn().mockReturnValue(EMPTY) } },
        { provide: USER_IDENTITY_PORT, useValue: { profile: signal(null) } },
      ],
    });

    const operationIds = await TestBed.inject(InterventionOutboxRepository).queueMany(
      'intervention-1',
      [
        {
          type: 'equipment.create',
          payload: { clientId: 'equipment-1', type: 'fire_extinguisher' },
        },
        {
          type: 'work-item.create',
          payload: {
            clientId: 'work-item-1',
            intervention: '/api/interventions/intervention-1',
            action: 'inventory',
            target: '/api/equipment/equipment-1',
            source: 'discovered',
            required: false,
          },
        },
      ],
    );

    expect(operationIds).toHaveLength(2);
    expect(database.putTransaction).toHaveBeenCalledOnce();
    expect(database.putTransaction).toHaveBeenCalledWith({
      outbox: [
        expect.objectContaining({
          value: expect.objectContaining({
            type: 'equipment.create',
            payload: expect.objectContaining({ clientId: 'equipment-1' }),
          }),
        }),
        expect.objectContaining({
          value: expect.objectContaining({
            type: 'work-item.create',
            payload: expect.objectContaining({ clientId: 'work-item-1' }),
          }),
        }),
      ],
    });
  });
});
