import { invitationExpiryBucket } from '../invitation-expiry.utils';

describe('invitationExpiryBucket', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('classifies a past date as expired', () => {
    expect(invitationExpiryBucket('2026-06-14T12:00:00.000Z', now)).toBe('expired');
  });

  it('classifies the same day as today', () => {
    expect(invitationExpiryBucket('2026-06-15T18:00:00.000Z', now)).toBe('today');
  });

  it('classifies the next day as tomorrow', () => {
    expect(invitationExpiryBucket('2026-06-16T18:00:00.000Z', now)).toBe('tomorrow');
  });

  it('classifies anything further out as later', () => {
    expect(invitationExpiryBucket('2026-06-22T12:00:00.000Z', now)).toBe('later');
  });
});
