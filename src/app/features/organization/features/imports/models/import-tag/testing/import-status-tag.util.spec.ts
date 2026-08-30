import type { ImportJobStatus } from '../../import-job/import-job-status.type';
import type { ImportStatusTagDescriptor } from '../import-status-tag-descriptor.interface';
import { resolveImportStatusTag } from '../import-status-tag.util';

const STATUS_VALUES: readonly ImportJobStatus[] = ['pending', 'processing', 'completed', 'failed'];

describe('resolveImportStatusTag', () => {
  it('should resolve every status value to a non-fallback descriptor', () => {
    for (const value of STATUS_VALUES) {
      const descriptor: ImportStatusTagDescriptor = resolveImportStatusTag(value);

      expect(descriptor.icon).not.toBe('lucideTag');
      expect(descriptor.label.length).toBeGreaterThan(0);
    }
  });

  it('should mark completed as success and failed as danger', () => {
    expect(resolveImportStatusTag('completed').severity).toBe('success');
    expect(resolveImportStatusTag('failed').severity).toBe('danger');
  });

  it('should keep every non-terminal state neutral', () => {
    expect(resolveImportStatusTag('processing').severity).toBe('neutral');
    expect(resolveImportStatusTag('pending').severity).toBe('neutral');
  });

  it('should fall back to a humanised neutral descriptor for an unknown value', () => {
    const descriptor: ImportStatusTagDescriptor = resolveImportStatusTag('some_unknown_value');

    expect(descriptor).toEqual({
      label: 'some unknown value',
      severity: 'neutral',
      icon: 'lucideTag',
    });
  });
});
