import type { ApprovalStatus } from '../../approval-request/approval-status.type';
import type { ApprovalTagDescriptor } from '../approval-tag-descriptor.interface';
import { resolveApprovalTag } from '../approval-tag.util';

const STATUS_VALUES: readonly ApprovalStatus[] = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'expired',
];

describe('resolveApprovalTag', () => {
  it('should resolve every status value to a non-fallback descriptor', () => {
    for (const value of STATUS_VALUES) {
      const descriptor: ApprovalTagDescriptor = resolveApprovalTag(value);

      expect(descriptor.icon).not.toBe('lucideTag');
      expect(descriptor.label.length).toBeGreaterThan(0);
    }
  });

  it('should mark rejected as danger and approved as success', () => {
    expect(resolveApprovalTag('rejected').severity).toBe('danger');
    expect(resolveApprovalTag('approved').severity).toBe('success');
  });

  it('should mark pending as warning, and cancelled/expired as neutral', () => {
    expect(resolveApprovalTag('pending').severity).toBe('warning');
    expect(resolveApprovalTag('cancelled').severity).toBe('neutral');
    expect(resolveApprovalTag('expired').severity).toBe('neutral');
  });

  it('should fall back to a humanised neutral descriptor for an unknown value', () => {
    const descriptor: ApprovalTagDescriptor = resolveApprovalTag('some_unknown_value');

    expect(descriptor).toEqual({
      label: 'some unknown value',
      severity: 'neutral',
      icon: 'lucideTag',
    });
  });
});
