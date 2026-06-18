import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import { InterventionDatabaseService } from '../intervention-database.service';

describe('InterventionDatabaseService (server platform)', () => {
  let service: InterventionDatabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InterventionDatabaseService,
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: USER_IDENTITY_PORT, useValue: { profile: () => null } },
      ],
    });
    service = TestBed.inject(InterventionDatabaseService);
  });

  it('should report a non-browser platform', () => {
    expect(service.browser).toBe(false);
  });

  it('should return empty reads without touching IndexedDB on the server', async () => {
    expect(await service.get('metadata', 'ownerUserId')).toBeNull();
    expect(await service.getAll('workItems')).toEqual([]);
    expect(await service.count('outbox')).toBe(0);
  });

  it('should treat writes and owner binding as no-ops on the server', async () => {
    await expect(service.put('metadata', 'key', 'value')).resolves.toBeUndefined();
    await expect(service.ensureOwnerBound('user-1')).resolves.toBeUndefined();
  });
});
