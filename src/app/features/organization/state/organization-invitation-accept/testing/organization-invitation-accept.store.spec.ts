import { TestBed } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { OrganizationInvitationService } from '@features/organization/data-access';
import type {
  OrganizationInvitationPreviewOutput,
  OrganizationMemberOutput,
} from '@features/organization/models';
import { organizationInvitationAcceptStoreEvents } from '../events';
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

const membership = { id: 'm1', organizationId: 'org-1' } as OrganizationMemberOutput;

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

  it('publishes the joined organization only after successful acceptance', async () => {
    const accepted = vi.fn();
    const subscription = TestBed.inject(Events)
      .on(organizationInvitationAcceptStoreEvents.acceptSucceeded)
      .subscribe(accepted);
    store.loadPreview('tok-1');
    store.accept('tok-1');
    await flush();
    expect(accepted).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { organizationId: 'org-1' } }),
    );
    subscription.unsubscribe();
  });

  it('records an acceptance failure', async () => {
    invitationService.accept.mockReturnValue(throwError(() => new Error('expired')));
    store.accept('tok-1');
    await flush();

    expect(store.isAcceptError()).toBe(true);
    expect(store.isAccepted()).toBe(false);
    expect(store.acceptError()).not.toBeNull();
  });
  it('emits one toast and one membership event from the accepted result despite repeated clicks and a changed preview', () => {
    const response = new Subject<OrganizationMemberOutput>();
    invitationService.accept.mockReturnValue(response);
    const accepted = vi.fn();
    const feedback = vi.fn();
    const events = TestBed.inject(Events);
    const membershipSubscription = events
      .on(organizationInvitationAcceptStoreEvents.acceptSucceeded)
      .subscribe(accepted);
    const feedbackSubscription = events
      .on(organizationInvitationAcceptStoreEvents.acceptFeedback)
      .subscribe(feedback);
    store.loadPreview('tok-1');
    store.accept('tok-1');
    store.accept('tok-1');
    invitationService.preview.mockReturnValue(of({ ...preview, organizationId: 'other-org' }));
    store.loadPreview('other-token');
    response.next(membership);
    response.complete();
    expect(invitationService.accept).toHaveBeenCalledTimes(1);
    expect(accepted).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ payload: { organizationId: 'org-1' } }),
    );
    expect(feedback).toHaveBeenCalledTimes(1);
    expect(store.acceptedOrganizationId()).toBe('org-1');
    membershipSubscription.unsubscribe();
    feedbackSubscription.unsubscribe();
  });
  it('emits one failure toast per attempt and no toast when preview loading fails', () => {
    const feedback = vi.fn();
    const subscription = TestBed.inject(Events)
      .on(organizationInvitationAcceptStoreEvents.acceptFailed)
      .subscribe(feedback);
    invitationService.preview.mockReturnValue(throwError(() => new Error('Invalid')));
    store.loadPreview('tok');
    expect(feedback).not.toHaveBeenCalled();
    invitationService.accept.mockReturnValue(throwError(() => new Error('Expired')));
    store.accept('tok');
    expect(feedback).toHaveBeenCalledTimes(1);
    store.accept('tok');
    expect(feedback).toHaveBeenCalledTimes(2);
    subscription.unsubscribe();
  });
});
