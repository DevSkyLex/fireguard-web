import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { OrganizationInvitationService } from '@features/organization/data-access';
import type {
  OrganizationInvitationPreviewOutput,
  OrganizationMemberOutput,
} from '@features/organization/models';
import { OrganizationInvitationAcceptStore } from '../organization-invitation-accept.store';

const flush = async (): Promise<void> => {
  await Promise.resolve();
};

const preview = {
  organizationId: 'org-1',
  organizationName: 'Acme',
  organizationLogoUrl: null,
  inviterDisplayName: 'Alice',
  invitedEmail: 'bob@example.com',
  status: 'pending',
  expiresAt: '2026-02-01',
} as unknown as OrganizationInvitationPreviewOutput;

const membership = { id: 'm1' } as unknown as OrganizationMemberOutput;

describe('OrganizationInvitationAcceptStore', () => {
  let store: OrganizationInvitationAcceptStore;
  let invitationService: {
    preview: ReturnType<typeof vi.fn>;
    accept: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    invitationService = {
      preview: vi.fn().mockReturnValue(of(preview)),
      accept: vi.fn().mockReturnValue(of(membership)),
    };

    TestBed.configureTestingModule({
      providers: [
        OrganizationInvitationAcceptStore,
        { provide: OrganizationInvitationService, useValue: invitationService },
      ],
    });
    store = TestBed.inject(OrganizationInvitationAcceptStore);
  });

  it('loads the public invitation preview', async () => {
    store.loadPreview('tok-1');
    await flush();

    expect(invitationService.preview).toHaveBeenCalledWith('tok-1');
    expect(store.preview()?.organizationName).toBe('Acme');
    expect(store.isLoadingPreview()).toBe(false);
    expect(store.isPreviewError()).toBe(false);
  });

  it('flags an invalid or unknown preview token as an error', async () => {
    invitationService.preview.mockReturnValue(throwError(() => new Error('not found')));
    store.loadPreview('bad');
    await flush();

    expect(store.isPreviewError()).toBe(true);
    expect(store.preview()).toBeNull();
  });

  it('accepts an invitation token', async () => {
    store.accept('tok-1');
    await flush();

    expect(invitationService.accept).toHaveBeenCalledWith({ token: 'tok-1' });
    expect(store.isAccepted()).toBe(true);
    expect(store.isAcceptError()).toBe(false);
  });

  it('records an acceptance failure', async () => {
    invitationService.accept.mockReturnValue(throwError(() => new Error('expired')));
    store.accept('tok-1');
    await flush();

    expect(store.isAcceptError()).toBe(true);
    expect(store.isAccepted()).toBe(false);
    expect(store.acceptError()).not.toBeNull();
  });
});
