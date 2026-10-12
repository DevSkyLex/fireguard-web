import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { WebhookService } from '../webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        WebhookService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(WebhookService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('preserves partial updates with merge-patch headers', () => {
    service
      .mutate('org', { kind: 'update', id: 'hook', input: { description: 'Changed' } })
      .subscribe();
    const request = http.expectOne('https://api.test/api/organizations/org/webhooks/hook');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
    expect(request.request.body).toEqual({ description: 'Changed' });
    request.flush({});
  });
  it('keeps server pagination and status filters in the owning delivery path', () => {
    service.deliveries('org', 'hook', 3, 'failed').subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/org/webhooks/hook/deliveries'));
    expect(request.request.params.get('page')).toBe('3');
    expect(request.request.params.get('itemsPerPage')).toBe('20');
    expect(request.request.params.get('status')).toBe('failed');
    request.flush({ member: [], totalItems: 0 });
  });
  it('never sends an active flag on create or invents an identity for redelivery', () => {
    service
      .mutate('org', {
        kind: 'create',
        input: {
          url: 'https://example.com',
          description: '',
          eventTypes: ['inspection.submitted'],
          isActive: false,
        },
      })
      .subscribe();
    const request = http.expectOne('https://api.test/api/organizations/org/webhooks');
    expect(request.request.body).not.toHaveProperty('isActive');
    request.flush({ secret: 'one-time' });
    service.mutate('org', { kind: 'redeliver', id: 'hook', deliveryId: 'original' }).subscribe();
    const retry = http.expectOne(
      'https://api.test/api/organizations/org/webhooks/hook/deliveries/original/redeliver',
    );
    expect(retry.request.method).toBe('POST');
    expect(retry.request.body).toBeNull();
    retry.flush({ status: 'queued' });
  });
  it('retains caller-owned keys across cold subscriptions for secret creation and rotation', () => {
    const options = { idempotencyKey: '6392c2db-e0c2-46c9-89d9-c5b272b53f31' };
    const creation = service.mutate(
      'org',
      {
        kind: 'create',
        input: {
          url: 'https://example.com',
          description: '',
          eventTypes: ['inspection.submitted'],
        },
      },
      options,
    );
    for (let retry = 0; retry < 2; ++retry) {
      creation.subscribe();
      const request = http.expectOne('https://api.test/api/organizations/org/webhooks');
      expect(request.request.headers.get('Idempotency-Key')).toBe(options.idempotencyKey);
      request.flush({ secret: 'original-secret' });
    }
    service.mutate('org', { kind: 'rotate', id: 'hook' }, options).subscribe();
    const rotation = http.expectOne(
      'https://api.test/api/organizations/org/webhooks/hook/rotate-secret',
    );
    expect(rotation.request.headers.get('Idempotency-Key')).toBe(options.idempotencyKey);
    expect(rotation.request.body).toBeNull();
    rotation.flush({ secret: 'rotated-secret' });
  });
  it.each([
    {
      action: { kind: 'update' as const, id: 'hook', input: { description: 'Changed' } },
      suffix: '',
    },
    { action: { kind: 'delete' as const, id: 'hook' }, suffix: '' },
    { action: { kind: 'ping' as const, id: 'hook' }, suffix: '/ping' },
    {
      action: { kind: 'redeliver' as const, id: 'hook', deliveryId: 'delivery' },
      suffix: '/deliveries/delivery/redeliver',
    },
  ])('passes the caller-owned key for $action.kind', ({ action, suffix }) => {
    const options = { idempotencyKey: '6392c2db-e0c2-46c9-89d9-c5b272b53f31' };
    service.mutate('org', action, options).subscribe();
    const request = http.expectOne(`https://api.test/api/organizations/org/webhooks/hook${suffix}`);
    expect(request.request.headers.get('Idempotency-Key')).toBe(options.idempotencyKey);
    request.flush({});
  });
});
