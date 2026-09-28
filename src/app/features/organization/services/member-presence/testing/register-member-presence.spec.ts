import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { PresenceStatus } from '@features/organization/models';
import { MEMBER_PRESENCE_PORT, ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { registerMemberPresence } from '../register-member-presence';

@Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
class RegisteredPresenceHost {
  public readonly members = signal<readonly string[]>(['member']);
  public readonly statuses = registerMemberPresence(() => this.members());
}

describe('registerMemberPresence', () => {
  const selectedOrganizationId = signal<string | null>('org-1');
  const byId = signal<Readonly<Record<string, PresenceStatus>>>({ member: 'active' });
  let presence: {
    byId: typeof byId;
    register: ReturnType<typeof vi.fn>;
    unregister: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    selectedOrganizationId.set('org-1');
    byId.set({ member: 'active' });
    presence = { byId, register: vi.fn(), unregister: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: MEMBER_PRESENCE_PORT, useValue: presence },
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: { selectedOrganizationId } },
      ],
    });
  });

  it('reregisters unchanged member IDs on organization changes using the same owner', () => {
    const fixture = TestBed.createComponent(RegisteredPresenceHost);
    TestBed.tick();
    const owner: unknown = presence.register.mock.calls[0]?.[0];
    expect(owner).toBeDefined();
    expect(presence.register).toHaveBeenLastCalledWith(owner, ['member']);
    selectedOrganizationId.set('org-2');
    TestBed.tick();
    expect(presence.register).toHaveBeenCalledTimes(2);
    expect(presence.register).toHaveBeenLastCalledWith(owner, ['member']);
    fixture.componentInstance.members.set(['replacement']);
    TestBed.tick();
    expect(presence.register).toHaveBeenLastCalledWith(owner, ['replacement']);
    expect(fixture.componentInstance.statuses).toBe(byId);
  });

  it('uses independent owners and unregisters only the destroyed consumer', () => {
    const first = TestBed.createComponent(RegisteredPresenceHost);
    const second = TestBed.createComponent(RegisteredPresenceHost);
    TestBed.tick();
    const firstOwner: unknown = presence.register.mock.calls[0]?.[0];
    const secondOwner: unknown = presence.register.mock.calls[1]?.[0];
    expect(firstOwner).toBeDefined();
    expect(secondOwner).toBeDefined();
    expect(firstOwner).not.toBe(secondOwner);
    first.destroy();
    expect(presence.unregister).toHaveBeenCalledOnce();
    expect(presence.unregister).toHaveBeenCalledWith(firstOwner);
    second.componentInstance.members.set(['other']);
    TestBed.tick();
    expect(presence.register).toHaveBeenLastCalledWith(secondOwner, ['other']);
    second.destroy();
    expect(presence.unregister).toHaveBeenLastCalledWith(secondOwner);
  });
});
