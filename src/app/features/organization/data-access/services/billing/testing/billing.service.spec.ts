import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Observable } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { ENV_CONFIG } from '@core/config';
import type {
  BillingInterval,
  CheckoutSessionOutput,
  InvoiceOutput,
  OrganizationSubscriptionOutput,
  PlanPricingOutput,
  PortalSessionOutput,
} from '@features/organization/models';
import { BillingService } from '../billing.service';

describe('BillingService', () => {
  let service: BillingService;
  let httpMock: HttpTestingController;

  const apiUrl = 'https://api.test.com';
  const billingUrl = `${apiUrl}/api/organizations/org-1/billing`;
  const subscription: OrganizationSubscriptionOutput = {
    '@id': '/api/organizations/org-1/billing/subscription',
    '@type': 'OrganizationSubscription',
    organizationId: 'org-1',
    hasSubscription: true,
    active: true,
    status: 'active',
    planKey: 'pro',
    interval: 'year',
    currentPeriodEnd: '2027-09-22T00:00:00+00:00',
    cancelAtPeriodEnd: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        BillingService,
        { provide: ENV_CONFIG, useValue: { apiUrl } },
      ],
    });
    service = TestBed.inject(BillingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it.each<BillingInterval>(['month', 'year'])(
    'requests Checkout for the selected plan and %s cadence without changing the subscription',
    (interval) => {
      const response: CheckoutSessionOutput = {
        '@id': '/api/organizations/org-1/billing/checkout',
        '@type': 'CheckoutSession',
        organizationId: 'org-1',
        url: 'https://checkout.stripe.com/c/pay/session-1',
      };
      let result: CheckoutSessionOutput | undefined;

      service
        .createCheckoutSession('org-1', { planKey: 'pro', interval })
        .subscribe((value) => (result = value));

      const request = httpMock.expectOne(`${billingUrl}/checkout`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ planKey: 'pro', interval });
      expect(request.request.withCredentials).toBe(true);
      expect(request.request.headers.get('Content-Type')).toBe('application/ld+json');
      request.flush(response);

      expect(result).toEqual(response);
      httpMock.expectNone(`${billingUrl}/subscription`);
    },
  );

  it('preserves Checkout validation codes and field violations', () => {
    const error = {
      '@type': 'ConstraintViolation',
      status: 422,
      code: 'billing_plan_unavailable',
      detail: 'The requested plan is unavailable.',
      violations: [{ propertyPath: 'planKey', message: 'Choose an available plan.' }],
    };
    let caught: unknown;

    service
      .createCheckoutSession('org-1', { planKey: 'retired', interval: 'month' })
      .subscribe({ error: (value: unknown) => (caught = value) });

    httpMock
      .expectOne(`${billingUrl}/checkout`)
      .flush(error, { status: 422, statusText: 'Unprocessable Entity' });

    expect(caught).toEqual(error);
  });

  it('creates a portal session with a credentialed bodyless action', () => {
    const response: PortalSessionOutput = {
      '@id': '/api/organizations/org-1/billing/portal',
      '@type': 'PortalSession',
      organizationId: 'org-1',
      url: 'https://billing.stripe.com/p/session-1',
    };
    let result: PortalSessionOutput | undefined;

    service.createPortalSession('org-1').subscribe((value) => (result = value));

    const request = httpMock.expectOne(`${billingUrl}/portal`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.withCredentials).toBe(true);
    request.flush(response);

    expect(result).toEqual(response);
  });

  it.each([
    { method: 'cancelSubscription', action: 'cancel', cancelAtPeriodEnd: true },
    { method: 'resumeSubscription', action: 'resume', cancelAtPeriodEnd: false },
  ] as const)(
    '$action returns the server subscription state without changing its active period',
    ({ method, action, cancelAtPeriodEnd }) => {
      const response = { ...subscription, cancelAtPeriodEnd };
      let result: OrganizationSubscriptionOutput | undefined;

      service[method]('org-1').subscribe((value) => (result = value));

      const request = httpMock.expectOne(`${billingUrl}/${action}`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toBeNull();
      expect(request.request.withCredentials).toBe(true);
      request.flush(response);

      expect(result).toEqual(response);
    },
  );

  it.each([
    { method: 'createPortalSession', action: 'portal' },
    { method: 'cancelSubscription', action: 'cancel' },
    { method: 'resumeSubscription', action: 'resume' },
  ] as const)('propagates a forbidden $action without retrying', ({ method, action }) => {
    const error = {
      '@type': 'Error',
      status: 403,
      code: 'access_denied',
      detail: 'Billing access was removed.',
    };
    let caught: unknown;

    const actionResult: Observable<PortalSessionOutput | OrganizationSubscriptionOutput> =
      service[method]('org-1');
    actionResult.subscribe({ error: (value: unknown) => (caught = value) });

    httpMock
      .expectOne(`${billingUrl}/${action}`)
      .flush(error, { status: 403, statusText: 'Forbidden' });

    expect(caught).toEqual(error);
    httpMock.expectNone(`${billingUrl}/${action}`);
  });

  it.each([
    subscription,
    {
      '@id': subscription['@id'],
      '@type': subscription['@type'],
      organizationId: 'org-1',
      hasSubscription: false,
      active: false,
      cancelAtPeriodEnd: false,
    },
  ] satisfies OrganizationSubscriptionOutput[])(
    'reads the authoritative subscription when hasSubscription=$hasSubscription',
    (response) => {
      let result: OrganizationSubscriptionOutput | undefined;

      service.getSubscription('org-1').subscribe((value) => (result = value));

      const request = httpMock.expectOne(`${billingUrl}/subscription`);
      expect(request.request.method).toBe('GET');
      expect(request.request.withCredentials).toBe(true);
      request.flush(response);

      expect(result).toEqual(response);
    },
  );

  it('forwards invoice pagination and preserves server totals and navigation links', () => {
    const response: HydraCollection<InvoiceOutput> = {
      '@id': '/api/organizations/org-1/billing/invoices',
      '@type': 'Collection',
      member: [
        {
          '@id': '/api/organizations/org-1/billing/invoices/invoice-2',
          '@type': 'Invoice',
          id: 'invoice-2',
          number: 'FG-2026-002',
          status: 'paid',
          amount: 2900,
          currency: 'eur',
          invoicePdf: 'https://invoice.stripe.com/invoice-2.pdf',
        },
      ],
      totalItems: 15,
      view: {
        '@id': '/api/organizations/org-1/billing/invoices?page=2',
        '@type': 'PartialCollectionView',
        next: '/api/organizations/org-1/billing/invoices?page=3',
      },
    };
    let result: HydraCollection<InvoiceOutput> | undefined;

    service
      .getInvoices('org-1', { page: 2, itemsPerPage: 5 })
      .subscribe((value) => (result = value));

    const request = httpMock.expectOne((candidate) => candidate.url === `${billingUrl}/invoices`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('itemsPerPage')).toBe('5');
    expect(request.request.withCredentials).toBe(true);
    request.flush(response);

    expect(result).toEqual(response);
  });

  it('reads the global pricing catalog with caller options and unavailable annual pricing intact', () => {
    const response: HydraCollection<PlanPricingOutput> = {
      '@id': '/api/billing/pricing',
      '@type': 'Collection',
      member: [
        {
          '@id': '/api/billing/pricing/pro',
          '@type': 'PlanPricing',
          planKey: 'pro',
          currency: 'eur',
          monthlyAmount: 2900,
          yearlyAmount: null,
        },
      ],
      totalItems: 1,
    };
    let result: HydraCollection<PlanPricingOutput> | undefined;

    service
      .getPricing({ page: 1, itemsPerPage: 20, headers: { 'Accept-Language': 'fr' } })
      .subscribe((value) => (result = value));

    const request = httpMock.expectOne(
      (candidate) => candidate.url === `${apiUrl}/api/billing/pricing`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('itemsPerPage')).toBe('20');
    expect(request.request.headers.get('Accept-Language')).toBe('fr');
    expect(request.request.headers.get('Accept')).toBe('application/ld+json');
    request.flush(response);

    expect(result).toEqual(response);
  });
});
