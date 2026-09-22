import { Clipboard } from '@angular/cdk/clipboard';
import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { Subject } from 'rxjs';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  WebhookMutation,
  WebhookSubscriptionOutput,
} from '@features/organization/features/webhooks/models';
import {
  WebhookSubscriptionsStore,
  webhookSubscriptionsEvents,
} from '@features/organization/features/webhooks/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { WebhooksPage } from '../webhooks-page.component';

/**
 * Constant subscription
 * @description A subscription already visible in the current organization.
 * @since 1.0.0
 */
const subscription: WebhookSubscriptionOutput = {
  '@id': '/api/organizations/org-1/webhooks/hook-1',
  '@type': 'WebhookSubscription',
  id: 'hook-1',
  organizationId: 'org-1',
  url: 'https://receiver.example/webhooks',
  description: 'Inspection receiver',
  eventTypes: ['inspection.submitted'],
  isActive: true,
  createdAt: '2026-09-21T10:00:00Z',
  updatedAt: '2026-09-21T10:00:00Z',
};

describe('WebhooksPage', () => {
  let fixture: ComponentFixture<WebhooksPage>;
  const organizationId = signal<string | null>('org-1');
  const managementAllowed = signal(true);
  const isMutating = signal(false);
  const mobile = signal(false);
  const permissions = { hasPermission: vi.fn() };
  const clipboard = { copy: vi.fn() };
  const store = {
    isMutating,
    load: vi.fn(),
    loadCatalog: vi.fn(),
    clearMutationFeedback: vi.fn(),
    mutate: vi.fn(),
  };
  let completed: Subject<ReturnType<typeof webhookSubscriptionsEvents.completed>>;

  /**
   * Function createPage
   * @description Tests page commands and transient state independently of the form and store internals.
   * Angular's server flag suppresses afterNextRender; PLATFORM_ID alone does not select that runtime.
   * @access private
   * @since 1.0.0
   * @param {'browser' | 'server'} platform - Render environment.
   * @returns {Promise<WebhooksPage>} Settled page instance.
   */
  const createPage = async (platform: 'browser' | 'server' = 'browser'): Promise<WebhooksPage> => {
    if (platform === 'server') vi.stubGlobal('ngServerMode', true);
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: Clipboard, useValue: clipboard },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganizationId: organizationId },
        },
        { provide: OrganizationPermissionService, useValue: permissions },
        { provide: INTERACTION_CAPABILITIES_PORT, useValue: { isMobileInteractionMode: mobile } },
        { provide: Events, useValue: { on: vi.fn().mockReturnValue(completed) } },
      ],
    }).overrideComponent(WebhooksPage, {
      set: {
        template: '',
        imports: [],
        providers: [{ provide: WebhookSubscriptionsStore, useValue: store }],
      },
    });
    fixture = TestBed.createComponent(WebhooksPage);
    await fixture.whenStable();
    return fixture.componentInstance;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    organizationId.set('org-1');
    managementAllowed.set(true);
    isMutating.set(false);
    mobile.set(false);
    permissions.hasPermission.mockImplementation(() => managementAllowed());
    clipboard.copy.mockReturnValue(true);
    completed = new Subject();
  });

  afterEach(() => {
    fixture?.destroy();
    vi.unstubAllGlobals();
  });

  it('loads the current organization after browser rendering and checks the independent manage grant', async () => {
    const page = await createPage();
    expect(store.load).toHaveBeenLastCalledWith({ organizationId: 'org-1', page: 1 });
    expect(permissions.hasPermission).toHaveBeenCalledWith(ORGANIZATION_PERMISSION.WEBHOOKS_MANAGE);
    expect(store.loadCatalog).not.toHaveBeenCalled();
    expect(page['side']()).toBe('right');
    mobile.set(true);
    expect(page['side']()).toBe('bottom');
  });

  it('keeps the authenticated store scope empty on the server', async () => {
    await createPage('server');
    expect(store.load).toHaveBeenCalledExactlyOnceWith({ organizationId: null, page: 1 });
  });

  it('opens a fresh editor and loads its catalog only on an authorized user action', async () => {
    const page = await createPage();
    page['dirty'].set(true);
    page['openEditor'](subscription);
    expect(page['editing']()).toEqual(subscription);
    expect(page['editorOpen']()).toBe(true);
    expect(page['dirty']()).toBe(false);
    expect(store.loadCatalog).toHaveBeenCalledOnce();
    expect(store.clearMutationFeedback).toHaveBeenCalledOnce();
  });

  it.each(['denied', 'pending'] as const)('blocks management while %s', async (reason) => {
    const page = await createPage();
    if (reason === 'denied') managementAllowed.set(false);
    else isMutating.set(true);
    page['openEditor'](subscription);
    page['request']({ kind: 'delete', id: subscription.id });
    expect(page['editorOpen']()).toBe(false);
    expect(page['confirmation']()).toBeNull();
    expect(store.loadCatalog).not.toHaveBeenCalled();
    expect(store.clearMutationFeedback).not.toHaveBeenCalled();
  });

  it('sends only changed update fields and closes an unchanged editor without writing', async () => {
    const page = await createPage();
    page['openEditor'](subscription);
    page['save']({ description: 'Updated receiver' });
    expect(store.mutate).toHaveBeenCalledExactlyOnceWith({
      kind: 'update',
      id: 'hook-1',
      input: { description: 'Updated receiver' },
    });
    store.mutate.mockClear();
    page['save']({});
    expect(page['editorOpen']()).toBe(false);
    expect(store.mutate).not.toHaveBeenCalled();
  });

  it('requires destination and events for creation and defaults only the optional description', async () => {
    const page = await createPage();
    page['openEditor'](null);
    page['save']({ url: subscription.url });
    page['save']({ eventTypes: subscription.eventTypes });
    expect(store.mutate).not.toHaveBeenCalled();
    page['save']({ url: subscription.url, eventTypes: subscription.eventTypes });
    expect(store.mutate).toHaveBeenLastCalledWith({
      kind: 'create',
      input: { url: subscription.url, eventTypes: subscription.eventTypes, description: '' },
    });
    page['save']({ url: subscription.url, eventTypes: [], description: 'New receiver' });
    expect(store.mutate).toHaveBeenLastCalledWith({
      kind: 'create',
      input: { url: subscription.url, eventTypes: [], description: 'New receiver' },
    });
  });

  it('retains a pending or dirty editor until saving finishes or discard is confirmed', async () => {
    const page = await createPage();
    page['openEditor'](subscription);
    isMutating.set(true);
    page['closeEditor']();
    expect(page['editorOpen']()).toBe(true);
    isMutating.set(false);
    page['dirty'].set(true);
    page['closeEditor']();
    expect(page['discardState']()).toBe('open');
    expect(page['editing']()).toEqual(subscription);
    page['discard']();
    expect(page['editorOpen']()).toBe(false);
    expect(page['editing']()).toBeNull();
    expect(page['dirty']()).toBe(false);
    expect(page['discardState']()).toBe('closed');
  });

  it('closes a pristine editor immediately', async () => {
    const page = await createPage();
    page['openEditor'](subscription);
    page['closeEditor']();
    expect(page['editorOpen']()).toBe(false);
    expect(page['editing']()).toBeNull();
    expect(page['discardState']()).toBe('closed');
  });

  it.each([
    [{ kind: 'delete', id: 'hook-1' }, 'Delete this webhook?', 'permanently deleted'],
    [{ kind: 'rotate', id: 'hook-1' }, 'Replace the signing secret?', 'stop working immediately'],
    [
      { kind: 'redeliver', id: 'hook-1', deliveryId: 'delivery-1' },
      'Send this delivery again?',
      'prevent duplicate processing',
    ],
  ] satisfies [WebhookMutation, string, string][])(
    'confirms the captured %s command and explains its consequence',
    async (action, title, hint) => {
      const page = await createPage();
      page['confirm']();
      expect(store.mutate).not.toHaveBeenCalled();
      page['request'](action);
      expect(page['confirmationTitle']()).toBe(title);
      expect(page['confirmationDescription']()).toContain(hint);
      expect(store.mutate).not.toHaveBeenCalled();
      page['confirm']();
      expect(store.mutate).toHaveBeenCalledExactlyOnceWith(action);
    },
  );

  it('exposes a returned secret only to the current manager and reflects actual clipboard success', async () => {
    const page = await createPage();
    page['copySecret']();
    expect(clipboard.copy).not.toHaveBeenCalled();
    page['openEditor'](null);
    page['dirty'].set(true);
    completed.next(
      webhookSubscriptionsEvents.completed({
        organizationId: 'org-1',
        kind: 'create',
        subscriptionId: 'hook-1',
        secret: 'one-time-value',
      }),
    );
    expect(page['secret']()).toBe('one-time-value');
    expect(page['editorOpen']()).toBe(false);
    expect(page['editing']()).toBeNull();
    expect(page['dirty']()).toBe(false);
    expect(page['notice']()).toBeNull();
    page['copySecret']();
    expect(clipboard.copy).toHaveBeenCalledExactlyOnceWith('one-time-value');
    expect(page['copied']()).toBe(true);
    clipboard.copy.mockReturnValue(false);
    page['copySecret']();
    expect(page['copied']()).toBe(false);
  });

  it.each(['ping', 'redeliver'] as const)(
    'presents %s completion as queued until a new read confirms delivery',
    async (kind) => {
      const page = await createPage();
      completed.next(
        webhookSubscriptionsEvents.completed({
          organizationId: 'org-1',
          kind,
          subscriptionId: 'hook-1',
        }),
      );
      expect(page['notice']()).toBe(
        'The delivery is queued. Refresh its history to check the result.',
      );
      expect(page['secret']()).toBeNull();
      page['refresh'](3);
      expect(page['notice']()).toBeNull();
      expect(store.load).toHaveBeenLastCalledWith({ organizationId: 'org-1', page: 3 });
    },
  );

  it('prevents refresh from clearing mutation feedback during an accepted write', async () => {
    const page = await createPage();
    store.load.mockClear();
    isMutating.set(true);
    page['refresh'](2);
    expect(store.load).not.toHaveBeenCalled();
    expect(store.clearMutationFeedback).not.toHaveBeenCalled();
  });

  it('clears secrets and pending dialogs after management rights are removed', async () => {
    const page = await createPage();
    page['openEditor'](subscription);
    page['request']({ kind: 'rotate', id: 'hook-1' });
    page['secret'].set('temporary-secret');
    managementAllowed.set(false);
    await fixture.whenStable();
    expect(page['editorOpen']()).toBe(false);
    expect(page['confirmation']()).toBeNull();
    expect(page['secret']()).toBeNull();
    completed.next(
      webhookSubscriptionsEvents.completed({
        organizationId: 'org-1',
        kind: 'rotate',
        subscriptionId: 'hook-1',
        secret: 'late-secret',
      }),
    );
    expect(page['secret']()).toBeNull();
  });

  it('resets organization-scoped drafts and ignores completions from the previous scope', async () => {
    const page = await createPage();
    page['openEditor'](subscription);
    page['request']({ kind: 'rotate', id: 'hook-1' });
    page['dirty'].set(true);
    page['secret'].set('old-secret');
    page['copied'].set(true);
    organizationId.set('org-2');
    await fixture.whenStable();
    completed.next(
      webhookSubscriptionsEvents.completed({
        organizationId: 'org-1',
        kind: 'rotate',
        subscriptionId: 'hook-1',
        secret: 'late-secret',
      }),
    );
    expect(page['secret']()).toBeNull();
    expect(page['copied']()).toBe(false);
    expect(page['confirmation']()).toBeNull();
    expect(page['editing']()).toBeNull();
    expect(page['dirty']()).toBe(false);
    expect(page['discardState']()).toBe('closed');
    expect(store.load).toHaveBeenLastCalledWith({ organizationId: 'org-2', page: 1 });
    fixture.destroy();
    expect(completed.observed).toBe(false);
  });

  it.each([
    ['webhook_timeout', 'The destination did not respond in time.'],
    ['webhook_http_error', "Check the HTTP status and your receiver's logs."],
    [
      'webhook_destination_disallowed',
      'Use a public HTTPS destination allowed by the webhook policy.',
    ],
    [
      'webhook_destination_unreachable',
      'Check that the destination is reachable and accepts public connections.',
    ],
    ['webhook_subscription_missing', 'The subscription no longer exists.'],
    ['internal-dns-address', 'The delivery could not be completed.'],
  ])(
    'maps %s to actionable text without exposing internal error detail',
    async (code, expected) => {
      const page = await createPage();
      expect(page['failureLabel'](code)).toBe(expected);
    },
  );

  it('labels delivery states consistently with the filter choices', async () => {
    const page = await createPage();
    expect(page['statusLabel']('pending')).toBe('Pending');
    expect(page['statusLabel']('delivered')).toBe('Delivered');
    expect(page['statusLabel']('failed')).toBe('Failed');
  });
});
