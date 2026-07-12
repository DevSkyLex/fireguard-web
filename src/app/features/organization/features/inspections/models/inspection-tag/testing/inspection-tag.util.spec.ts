import { inspectionTagOptions, resolveInspectionTag } from '../inspection-tag.util';

describe('resolveInspectionTag', () => {
  it('resolves inspection status descriptors', () => {
    expect(resolveInspectionTag('status', 'draft')).toEqual({
      label: 'Draft',
      severity: 'info',
      icon: 'pi pi-file-edit',
    });
    expect(resolveInspectionTag('status', 'submitted').severity).toBe('warn');
    expect(resolveInspectionTag('status', 'closed').severity).toBe('secondary');
    expect(resolveInspectionTag('status', 'cancelled').severity).toBe('danger');
  });

  it('resolves inspection result descriptors', () => {
    expect(resolveInspectionTag('result', 'pass')).toEqual({
      label: 'Pass',
      severity: 'success',
      icon: 'pi pi-check-circle',
    });
    expect(resolveInspectionTag('result', 'partial').severity).toBe('warn');
    expect(resolveInspectionTag('result', 'fail').severity).toBe('danger');
  });

  it('resolves non-conformity severity descriptors', () => {
    expect(resolveInspectionTag('nonConformitySeverity', 'low').severity).toBe('secondary');
    expect(resolveInspectionTag('nonConformitySeverity', 'medium').severity).toBe('warn');
    expect(resolveInspectionTag('nonConformitySeverity', 'high').severity).toBe('danger');
    expect(resolveInspectionTag('nonConformitySeverity', 'critical').severity).toBe('danger');
  });

  it('resolves non-conformity status descriptors', () => {
    expect(resolveInspectionTag('nonConformityStatus', 'open').severity).toBe('danger');
    expect(resolveInspectionTag('nonConformityStatus', 'in_progress')).toEqual({
      label: 'In progress',
      severity: 'warn',
      icon: 'pi pi-spinner',
    });
    expect(resolveInspectionTag('nonConformityStatus', 'done').severity).toBe('success');
    expect(resolveInspectionTag('nonConformityStatus', 'waived').severity).toBe('secondary');
  });

  it('falls back to a neutral descriptor for unknown values', () => {
    const descriptor = resolveInspectionTag('status', 'something_else');
    expect(descriptor.severity).toBe('secondary');
    expect(descriptor.label).toBe('something else');
    expect(descriptor.icon).toBe('pi pi-circle');
  });

  it('maps a family to select options in declaration order', () => {
    expect(inspectionTagOptions('status').map((option) => option.value)).toEqual([
      'draft',
      'submitted',
      'closed',
      'cancelled',
    ]);
    expect(inspectionTagOptions('result').map((option) => option.value)).toEqual([
      'pass',
      'partial',
      'fail',
    ]);
  });
});
