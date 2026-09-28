import type { AutomationAttemptOutput } from '../../automation/automation-output.interface';
import type { AutomationStatusTagDescriptor } from '../automation-status-tag-descriptor.interface';
import { resolveAutomationStatusTag } from '../automation-status-tag.util';

const STATUS_VALUES: readonly AutomationAttemptOutput['status'][] = [
  'pending',
  'running',
  'failed',
  'succeeded',
  'skipped',
];

describe('resolveAutomationStatusTag', () => {
  it('should resolve every status value to a non-fallback descriptor', () => {
    for (const value of STATUS_VALUES) {
      const descriptor: AutomationStatusTagDescriptor = resolveAutomationStatusTag(value);

      expect(descriptor.icon).not.toBe('lucideTag');
      expect(descriptor.label.length).toBeGreaterThan(0);
    }
  });

  it('should mark failed as danger and succeeded as success, so they never look identical', () => {
    expect(resolveAutomationStatusTag('failed').severity).toBe('danger');
    expect(resolveAutomationStatusTag('succeeded').severity).toBe('success');
  });

  it('should give succeeded and skipped different icons, so they never look identical', () => {
    expect(resolveAutomationStatusTag('succeeded').icon).not.toBe(
      resolveAutomationStatusTag('skipped').icon,
    );
  });

  it('should fall back to a humanised neutral descriptor for an unknown value', () => {
    const descriptor: AutomationStatusTagDescriptor = resolveAutomationStatusTag('some_unknown');

    expect(descriptor).toEqual({ label: 'some unknown', severity: 'neutral', icon: 'lucideTag' });
  });
});
