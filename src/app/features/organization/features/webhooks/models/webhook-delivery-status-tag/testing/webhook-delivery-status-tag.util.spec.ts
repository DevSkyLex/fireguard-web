import type { WebhookDeliveryOutput } from '../../delivery/webhook-delivery-output.interface';
import type { WebhookDeliveryStatusTagDescriptor } from '../webhook-delivery-status-tag-descriptor.interface';
import { resolveWebhookDeliveryStatusTag } from '../webhook-delivery-status-tag.util';

const STATUS_VALUES: readonly WebhookDeliveryOutput['status'][] = [
  'pending',
  'delivered',
  'failed',
];

describe('resolveWebhookDeliveryStatusTag', () => {
  it('should resolve every status value to a non-fallback descriptor', () => {
    for (const value of STATUS_VALUES) {
      const descriptor: WebhookDeliveryStatusTagDescriptor = resolveWebhookDeliveryStatusTag(value);

      expect(descriptor.icon).not.toBe('lucideTag');
      expect(descriptor.label.length).toBeGreaterThan(0);
    }
  });

  it('should mark delivered as success and failed as danger, so they never look identical', () => {
    expect(resolveWebhookDeliveryStatusTag('delivered').severity).toBe('success');
    expect(resolveWebhookDeliveryStatusTag('failed').severity).toBe('danger');
  });

  it('should give delivered, failed and pending different icons, so no two look identical', () => {
    const icons = STATUS_VALUES.map((value) => resolveWebhookDeliveryStatusTag(value).icon);

    expect(new Set(icons).size).toBe(icons.length);
  });

  it('should fall back to a humanised neutral descriptor for an unknown value', () => {
    const descriptor: WebhookDeliveryStatusTagDescriptor =
      resolveWebhookDeliveryStatusTag('some_unknown');

    expect(descriptor).toEqual({ label: 'some unknown', severity: 'neutral', icon: 'lucideTag' });
  });
});
