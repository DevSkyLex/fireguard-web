import type { ChecklistStatus } from '../../checklist/checklist-output.interface';
import type { ChecklistStatusTagDescriptor } from '../checklist-status-tag-descriptor.interface';
import { resolveChecklistStatusTag } from '../checklist-status-tag.util';

describe('resolveChecklistStatusTag', () => {
  it('should resolve the active descriptor as success', () => {
    const descriptor: ChecklistStatusTagDescriptor = resolveChecklistStatusTag('active');

    expect(descriptor).toEqual({
      label: 'Active',
      severity: 'success',
      icon: 'lucideCircleCheck',
    });
  });

  it('should resolve the archived descriptor as neutral, not danger', () => {
    const descriptor: ChecklistStatusTagDescriptor = resolveChecklistStatusTag('archived');

    expect(descriptor).toEqual({
      label: 'Archived',
      severity: 'neutral',
      icon: 'lucideArchive',
    });
  });

  it('should resolve every ChecklistStatus union member to a non-empty descriptor', () => {
    const values: readonly ChecklistStatus[] = ['active', 'archived'];

    for (const value of values) {
      const descriptor: ChecklistStatusTagDescriptor = resolveChecklistStatusTag(value);

      expect(descriptor.label.length).toBeGreaterThan(0);
      expect(descriptor.icon.length).toBeGreaterThan(0);
    }
  });
});
