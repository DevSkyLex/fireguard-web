import { resolveWebhookEventLabel } from '../webhook-event-label.utils';

describe('resolveWebhookEventLabel', () => {
  it('should resolve a curated allowlist key to its localized label', () => {
    expect(resolveWebhookEventLabel('facility.facility_created_event')).toBe('Facility created');
  });

  it('should fall back to the catalog label for a key with no curated entry', () => {
    expect(resolveWebhookEventLabel('some.new_event', 'Some New Event')).toBe('Some New Event');
  });

  it('should fall back to the raw key when neither a curated label nor a catalog label exists', () => {
    expect(resolveWebhookEventLabel('some.new_event')).toBe('some.new_event');
  });

  it('should prefer the curated label over a supplied catalog label', () => {
    expect(
      resolveWebhookEventLabel(
        'facility.facility_created_event',
        'Facility Facility Created Event',
      ),
    ).toBe('Facility created');
  });
});
