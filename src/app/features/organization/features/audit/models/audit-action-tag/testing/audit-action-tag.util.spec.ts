import type { AuditActionId } from '../../audit-action/audit-action-id.type';
import { listAuditActionOptions, resolveAuditActionTag } from '../audit-action-tag.util';

describe('resolveAuditActionTag', () => {
  it('should resolve a known action id to its label, module and icon', () => {
    const descriptor = resolveAuditActionTag('facility.moved' satisfies AuditActionId);

    expect(descriptor.label).toBe('Facility moved');
    expect(descriptor.module).toBe('facility');
    expect(descriptor.moduleLabel).toBe('Facilities');
    expect(descriptor.icon).toBe('lucideBuilding2');
  });

  it('should resolve the correct module for an unknown action sharing a known prefix', () => {
    const descriptor = resolveAuditActionTag('facility.something_new');

    expect(descriptor.module).toBe('facility');
    expect(descriptor.icon).toBe('lucideBuilding2');
    expect(descriptor.label).toBe('facility something new');
  });

  it('should fall back to the "other" module for an id with no recognizable prefix', () => {
    const descriptor = resolveAuditActionTag('unknown_module.some_action');

    expect(descriptor.module).toBe('other');
    expect(descriptor.icon).toBe('lucideTag');
    expect(descriptor.label).toBe('unknown module some action');
  });

  it('should not throw on an action id carrying no dot at all', () => {
    const descriptor = resolveAuditActionTag('malformed');

    expect(descriptor.module).toBe('other');
    expect(descriptor.label).toBe('malformed');
  });
});

describe('listAuditActionOptions', () => {
  it('should list every known action id with a resolved descriptor', () => {
    const options = listAuditActionOptions();

    expect(options.length).toBe(72);
    expect(options.every((option) => option.descriptor.label.length > 0)).toBe(true);
  });

  it('should include an entry for every module', () => {
    const options = listAuditActionOptions();
    const modules = new Set(options.map((option) => option.descriptor.module));

    expect(modules.has('organization')).toBe(true);
    expect(modules.has('approval')).toBe(true);
    expect(modules.has('other')).toBe(false);
  });
});
