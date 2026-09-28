import { displayNotificationBody } from '../notification-body.utils';

describe('displayNotificationBody', () => {
  it('removes the legacy session UUID without changing the completion date', () => {
    expect(
      displayNotificationBody(
        'Congratulations! Your organization onboarding (session 01a0e27e-36d0-7b49-a1b5-649f2a321646) has been completed on 2026-09-27T10:57:25+00:00.',
      ),
    ).toBe(
      'Congratulations! Your organization onboarding has been completed on 2026-09-27T10:57:25+00:00.',
    );
  });

  it('preserves unrelated messages and a missing preview', () => {
    expect(displayNotificationBody('An intervention was assigned to you.')).toBe(
      'An intervention was assigned to you.',
    );
    expect(displayNotificationBody(null)).toBeNull();
  });
});
