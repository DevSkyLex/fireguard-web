import { resolveAuditActorLabel } from '../resolve-audit-actor-label.utils';

describe('resolveAuditActorLabel', () => {
  it('should render the resolved display name for a user actor', () => {
    expect(resolveAuditActorLabel('user', 'Jane Doe')).toBe('Jane Doe');
  });

  it('should fall back to "Unknown member" for a user actor with no resolved name', () => {
    expect(resolveAuditActorLabel('user')).toBe('Unknown member');
  });

  it('should fall back to "Unknown member" for an empty resolved name', () => {
    expect(resolveAuditActorLabel('user', '')).toBe('Unknown member');
  });

  it('should render "System" for a system actor', () => {
    expect(resolveAuditActorLabel('system')).toBe('System');
  });

  it('should render "API client" for a client actor', () => {
    expect(resolveAuditActorLabel('client')).toBe('API client');
  });

  it('should render "Anonymous" for an anonymous actor', () => {
    expect(resolveAuditActorLabel('anonymous')).toBe('Anonymous');
  });
});
