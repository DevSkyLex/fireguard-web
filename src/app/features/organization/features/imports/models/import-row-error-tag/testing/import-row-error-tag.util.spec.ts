import type { ImportRowErrorCode } from '../../import-job/import-row-error-code.type';
import type { ImportRowErrorTagDescriptor } from '../import-row-error-tag-descriptor.interface';
import { resolveImportRowErrorTag } from '../import-row-error-tag.util';

const CODE_VALUES: readonly ImportRowErrorCode[] = [
  'would_create',
  'invalid',
  'missing_required',
  'quota_exceeded',
];

describe('resolveImportRowErrorTag', () => {
  it('should resolve every code value to a non-fallback descriptor', () => {
    for (const value of CODE_VALUES) {
      const descriptor: ImportRowErrorTagDescriptor = resolveImportRowErrorTag(value);

      expect(descriptor.icon).not.toBe('lucideTag');
      expect(descriptor.label.length).toBeGreaterThan(0);
    }
  });

  it('should render would_create as the one positive code, never as a failure', () => {
    expect(resolveImportRowErrorTag('would_create').severity).toBe('success');
  });

  it('should render invalid and missing_required as danger, and quota_exceeded as warning', () => {
    expect(resolveImportRowErrorTag('invalid').severity).toBe('danger');
    expect(resolveImportRowErrorTag('missing_required').severity).toBe('danger');
    expect(resolveImportRowErrorTag('quota_exceeded').severity).toBe('warning');
  });

  it('should fall back to a humanised neutral descriptor for an unknown value', () => {
    const descriptor: ImportRowErrorTagDescriptor = resolveImportRowErrorTag('some_unknown_value');

    expect(descriptor).toEqual({
      label: 'some unknown value',
      severity: 'neutral',
      icon: 'lucideTag',
    });
  });
});
