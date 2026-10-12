import { TestBed } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { ApiRequestOptions, HydraCollection, HydraItem } from '@core/api/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { WebhookService } from '@features/organization/features/webhooks/data-access';
import type {
  WebhookSubscriptionOutput,
  WebhookSecretOutput,
} from '@features/organization/features/webhooks/models';
import { webhookSubscriptionsEvents } from '../webhook-subscriptions.events';
import { WebhookSubscriptionsStore } from '../webhook-subscriptions.store';

const endpoint: WebhookSubscriptionOutput = {
  '@id': '/webhooks/hook',
  '@type': 'WebhookSubscription',
  id: 'hook',
  organizationId: 'org',
  url: 'https://example.com/hook',
  description: 'Receiver',
  eventTypes: ['inspection.submitted'],
  isActive: true,
  createdAt: '2026-09-21T10:00:00Z',
  updatedAt: '2026-09-21T10:00:00Z',
};
const collection = <T extends HydraItem>(
  member: readonly T[],
  totalItems = member.length,
): HydraCollection<T> => ({ '@id': '/collection', '@type': 'Collection', member, totalItems });

describe('WebhookSubscriptionsStore', () => {
  const api = { list: vi.fn(), deliveries: vi.fn(), events: vi.fn(), mutate: vi.fn() };
  const permissions = { hasPermission: vi.fn() };
  const sessionRevision = signal(0);
  const isAuthenticated = signal(true);
  const lastKey = (): string | undefined => {
    const options = api.mutate.mock.calls.at(-1)?.[2] as ApiRequestOptions | undefined;
    return options?.idempotencyKey;
  };
  beforeEach(() => {
    vi.resetAllMocks();
    sessionRevision.set(0);
    isAuthenticated.set(true);
    api.list.mockReturnValue(of(collection([endpoint], 41)));
    api.deliveries.mockReturnValue(of(collection([], 61)));
    api.events.mockReturnValue(
      of(
        collection([
          {
            '@id': '/events/a',
            '@type': 'WebhookEvent',
            value: 'inspection.submitted',
            label: 'Inspection submitted',
          },
        ]),
      ),
    );
    permissions.hasPermission.mockReturnValue(true);
    TestBed.configureTestingModule({
      providers: [
        WebhookSubscriptionsStore,
        { provide: AUTH_SESSION_PORT, useValue: { sessionRevision, isAuthenticated } },
        { provide: WebhookService, useValue: api },
        { provide: OrganizationPermissionService, useValue: permissions },
      ],
    });
  });
  it('keeps independent server totals for subscriptions and filtered history', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    store.load({ organizationId: 'org', page: 2 });
    expect(store.pageCount()).toBe(3);
    expect(store.deliveryPageCount()).toBe(4);
    store.loadDeliveries(3, 'failed');
    expect(api.deliveries).toHaveBeenLastCalledWith('org', 'hook', 3, 'failed');
  });
  it('does not load the catalog before the editor requests it', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    store.load({ organizationId: 'org', page: 1 });
    expect(api.events).not.toHaveBeenCalled();
    store.loadCatalog();
    store.loadCatalog();
    expect(api.events).toHaveBeenCalledTimes(1);
  });
  it('rejects management without the independent permission or a visible subscription', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    store.load({ organizationId: 'org', page: 1 });
    permissions.hasPermission.mockReturnValue(false);
    store.mutate({ kind: 'rotate', id: 'hook' });
    permissions.hasPermission.mockReturnValue(true);
    store.mutate({ kind: 'rotate', id: 'another-organization-hook' });
    expect(api.mutate).not.toHaveBeenCalled();
  });
  it('emits a secret once without retaining it in state or duplicating a pending rotation', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    const request = new Subject<WebhookSecretOutput>();
    api.mutate.mockReturnValue(request);
    const received: unknown[] = [];
    const subscription = TestBed.inject(Events)
      .on(webhookSubscriptionsEvents.completed)
      .subscribe((event) => received.push(event.payload));
    store.load({ organizationId: 'org', page: 1 });
    store.mutate({ kind: 'rotate', id: 'hook' });
    store.mutate({ kind: 'rotate', id: 'hook' });
    expect(api.mutate).toHaveBeenCalledTimes(1);
    request.next({ ...endpoint, secret: 'one-time-test-secret' });
    request.complete();
    expect(received).toEqual([
      {
        organizationId: 'org',
        kind: 'rotate',
        subscriptionId: 'hook',
        secret: 'one-time-test-secret',
      },
    ]);
    expect(JSON.stringify(store.subscriptionEntities())).not.toContain('one-time-test-secret');
    expect(JSON.stringify(store.mutationCallState())).not.toContain('one-time-test-secret');
    subscription.unsubscribe();
  });
  it('discards a secret response after an organization round trip', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    const request = new Subject<WebhookSecretOutput>();
    api.mutate.mockReturnValue(request);
    const received = vi.fn();
    const subscription = TestBed.inject(Events)
      .on(webhookSubscriptionsEvents.completed)
      .subscribe(received);
    store.load({ organizationId: 'org', page: 1 });
    store.mutate({ kind: 'rotate', id: 'hook' });
    store.load({ organizationId: 'other', page: 1 });
    store.load({ organizationId: 'org', page: 1 });
    request.next({ ...endpoint, secret: 'obsolete-secret' });
    request.complete();
    expect(received).not.toHaveBeenCalled();
    expect(store.isMutating()).toBe(false);
    subscription.unsubscribe();
  });
  it('cancels old reads and clears private data when organization context disappears', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    const history = new Subject<HydraCollection<HydraItem>>();
    api.deliveries.mockReturnValue(history);
    store.load({ organizationId: 'org', page: 1 });
    store.loadCatalog();
    store.load({ organizationId: null, page: 1 });
    history.next(collection([{ '@id': '/old', '@type': 'Delivery', id: 'private' }]));
    expect(store.subscriptionEntities()).toEqual([]);
    expect(store.deliveryEntities()).toEqual([]);
    expect(store.events()).toEqual([]);
    expect(store.selected()).toBeNull();
  });
  it('keeps a failed command visible without automatically retrying it', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    api.mutate.mockReturnValue(throwError(() => new Error('response lost')));
    store.load({ organizationId: 'org', page: 1 });
    store.mutate({ kind: 'rotate', id: 'hook' });
    expect(store.mutationCallState().error).not.toBeNull();
    store.load({ organizationId: 'org', page: 1 });
    expect(api.mutate).toHaveBeenCalledTimes(1);
  });
  it('reads the queued delivery after an accepted test instead of marking it delivered', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    api.mutate.mockReturnValue(
      of({ deliveryId: 'delivery', subscriptionId: 'hook', status: 'queued' }),
    );
    store.load({ organizationId: 'org', page: 1 });
    api.deliveries.mockReturnValue(
      of(
        collection([
          {
            '@id': '/delivery',
            '@type': 'WebhookDelivery',
            id: 'delivery',
            subscriptionId: 'hook',
            status: 'pending',
            attempts: 0,
          },
        ]),
      ),
    );
    store.mutate({ kind: 'ping', id: 'hook' });
    expect(store.deliveryEntities()[0]?.status).toBe('pending');
  });
  it('reuses an unchanged create intention after a lost response and cleared feedback', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    store.load({ organizationId: 'org', page: 1 });
    api.mutate.mockReturnValue(throwError(() => new Error('response lost')));
    const input = {
      url: endpoint.url,
      description: endpoint.description,
      eventTypes: endpoint.eventTypes,
      isActive: false,
    };
    store.mutate({ kind: 'create', input });
    const key = lastKey();
    expect(key).toMatch(/^[\da-f-]{36}$/);
    store.clearMutationFeedback();
    store.load({ organizationId: 'org', page: 1 });
    store.mutate({
      kind: 'create',
      input: { ...input, isActive: true },
    });
    expect(api.mutate).toHaveBeenCalledTimes(2);
    expect(lastKey()).toBe(key);
  });
  it('starts a new create intention when the actual wire payload changes', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    store.load({ organizationId: 'org', page: 1 });
    api.mutate.mockReturnValue(throwError(() => new Error('response lost')));
    const input = {
      url: endpoint.url,
      description: endpoint.description,
      eventTypes: endpoint.eventTypes,
    };
    store.mutate({ kind: 'create', input });
    const key = lastKey();
    store.mutate({ kind: 'create', input: { ...input, url: 'https://example.com/changed' } });
    expect(lastKey()).not.toBe(key);
  });
  it('keeps a rotation retry identity until success and then starts a fresh rotation', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    store.load({ organizationId: 'org', page: 1 });
    api.mutate.mockReturnValueOnce(throwError(() => new Error('response lost')));
    api.mutate.mockReturnValue(of({ ...endpoint, secret: 'replayed-secret' }));
    store.mutate({ kind: 'rotate', id: 'hook' });
    const key = lastKey();
    store.mutate({ kind: 'rotate', id: 'hook' });
    expect(lastKey()).toBe(key);
    expect(store.mutationCallState().status).toBe('success');
    store.mutate({ kind: 'rotate', id: 'hook' });
    expect(lastKey()).not.toBe(key);
    expect(api.mutate).toHaveBeenCalledTimes(3);
  });
  it('retains an expired secret replay identity without automatically repeating the write', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    store.load({ organizationId: 'org', page: 1 });
    api.mutate.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              status: 409,
              title: 'Replay expired',
              detail: 'The completed operation cannot disclose its secret again.',
              code: 'idempotency_replay_expired',
              operationCompleted: true,
            },
          }),
      ),
    );
    store.mutate({ kind: 'rotate', id: 'hook' });
    const key = lastKey();
    expect(api.mutate).toHaveBeenCalledTimes(1);
    expect(store.mutationCallState().error).not.toBeNull();
    store.clearMutationFeedback();
    store.mutate({ kind: 'rotate', id: 'hook' });
    expect(lastKey()).toBe(key);
    expect(api.mutate).toHaveBeenCalledTimes(2);
  });
  it('releases unresolved keys on organization round trips and session replacement', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    api.mutate.mockReturnValue(throwError(() => new Error('response lost')));
    store.load({ organizationId: 'org', page: 1 });
    store.mutate({ kind: 'rotate', id: 'hook' });
    const originalKey = lastKey();
    store.load({ organizationId: 'other', page: 1 });
    store.load({ organizationId: 'org', page: 1 });
    store.mutate({ kind: 'rotate', id: 'hook' });
    const newScopeKey = lastKey();
    expect(newScopeKey).not.toBe(originalKey);
    sessionRevision.set(1);
    store.load({ organizationId: 'org', page: 1 });
    store.mutate({ kind: 'rotate', id: 'hook' });
    expect(lastKey()).not.toBe(newScopeKey);
  });
  it('fences a late secret immediately on session replacement before the reset effect runs', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    const request = new Subject<WebhookSecretOutput>();
    api.mutate.mockReturnValue(request);
    const received = vi.fn();
    const subscription = TestBed.inject(Events)
      .on(webhookSubscriptionsEvents.completed)
      .subscribe(received);
    store.load({ organizationId: 'org', page: 1 });
    store.mutate({ kind: 'rotate', id: 'hook' });
    sessionRevision.set(1);
    request.next({ ...endpoint, secret: 'previous-session-secret' });
    request.complete();
    expect(received).not.toHaveBeenCalled();
    TestBed.tick();
    expect(store.organizationId()).toBeNull();
    expect(store.subscriptionEntities()).toEqual([]);
    expect(store.mutationCallState().status).toBe('idle');
    subscription.unsubscribe();
  });
  it('clears private reads and fences a late error when the session ends', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    const request = new Subject<WebhookSecretOutput>();
    api.mutate.mockReturnValue(request);
    store.load({ organizationId: 'org', page: 1 });
    store.loadCatalog();
    store.mutate({ kind: 'rotate', id: 'hook' });
    isAuthenticated.set(false);
    request.error(new Error('obsolete error'));
    TestBed.tick();
    expect(store.subscriptionEntities()).toEqual([]);
    expect(store.deliveryEntities()).toEqual([]);
    expect(store.events()).toEqual([]);
    expect(store.mutationCallState().status).toBe('idle');
    store.mutate({ kind: 'rotate', id: 'hook' });
    expect(api.mutate).toHaveBeenCalledTimes(1);
  });
  it('releases pending write subscriptions when the route store is destroyed', () => {
    const store = TestBed.inject(WebhookSubscriptionsStore);
    const request = new Subject<WebhookSecretOutput>();
    api.mutate.mockReturnValue(request);
    const received = vi.fn();
    TestBed.inject(Events).on(webhookSubscriptionsEvents.completed).subscribe(received);
    store.load({ organizationId: 'org', page: 1 });
    store.mutate({ kind: 'rotate', id: 'hook' });
    TestBed.resetTestingModule();
    expect(request.observed).toBe(false);
    request.next({ ...endpoint, secret: 'destroyed-route-secret' });
    expect(received).not.toHaveBeenCalled();
  });
});
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
