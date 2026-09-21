import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IndexedDbService } from '@core/indexed-db';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import { MessagingDatabaseService } from '../messaging-database.service';

describe('MessagingDatabaseService ownership', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });
  it('binds the canonical account id and changes owner when the account changes', async () => {
    const profile = signal({ id: 'current-id', sub: 'old-claim' });
    const bind = vi.spyOn(IndexedDbService.prototype, 'ensureOwnerBound').mockResolvedValue();
    TestBed.configureTestingModule({
      providers: [{ provide: USER_IDENTITY_PORT, useValue: { profile } }],
    });
    const database = TestBed.inject(MessagingDatabaseService);
    await database.ensureOwnerBound();
    expect(bind).toHaveBeenLastCalledWith('current-id');
    profile.set({ id: 'next-id', sub: 'next-claim' });
    await database.ensureOwnerBound();
    expect(bind).toHaveBeenLastCalledWith('next-id');
  });
  it('keeps compatibility with an identity exposing only sub', async () => {
    const bind = vi.spyOn(IndexedDbService.prototype, 'ensureOwnerBound').mockResolvedValue();
    TestBed.configureTestingModule({
      providers: [
        { provide: USER_IDENTITY_PORT, useValue: { profile: signal({ sub: 'legacy-id' }) } },
      ],
    });
    await TestBed.inject(MessagingDatabaseService).ensureOwnerBound();
    expect(bind).toHaveBeenCalledWith('legacy-id');
  });
});
