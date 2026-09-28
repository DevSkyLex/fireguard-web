import { humanizeNotificationCategory } from '../notification-category-label.utils';

describe('humanizeNotificationCategory', () => {
  it('replaces separators with spaces and capitalizes the first letter', () => {
    expect(humanizeNotificationCategory('non_conformity')).toBe('Non conformity');
  });

  it('handles dot and hyphen separators the same way', () => {
    expect(humanizeNotificationCategory('billing.invoice')).toBe('Billing invoice');
    expect(humanizeNotificationCategory('team-invite')).toBe('Team invite');
  });

  it('returns the raw category when it collapses to nothing readable', () => {
    expect(humanizeNotificationCategory('___')).toBe('___');
  });

  it('leaves an already-readable single word capitalized', () => {
    expect(humanizeNotificationCategory('security')).toBe('Security');
  });
});
