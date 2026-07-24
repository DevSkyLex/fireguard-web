import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { HydraCollection, HydraItem } from '@core/api/models';
import { BillingService } from '@features/organization/data-access';
import type {
  CheckoutSessionOutput,
  InvoiceOutput,
  OrganizationSubscriptionOutput,
  PlanPricingOutput,
  PortalSessionOutput,
} from '@features/organization/models';
import { OrganizationBillingStore } from '../organization-billing.store';

const collection = <T extends HydraItem>(member: readonly T[]): HydraCollection<T> =>
  ({
    '@id': '/api/collection',
    '@type': 'Collection',
    member,
    totalItems: member.length,
  }) as HydraCollection<T>;
const flushEffects = async (): Promise<void> => void (await Promise.resolve());

describe('OrganizationBillingStore', () => {
  let store: OrganizationBillingStore;
  let assignSpy: ReturnType<typeof vi.fn>;

  const subscription = {
    id: 'subscription-1',
    organizationId: 'org-1',
    status: 'active',
  } as unknown as OrganizationSubscriptionOutput;
  const canceledSubscription = {
    ...subscription,
    status: 'canceled',
  } as unknown as OrganizationSubscriptionOutput;
  const pricing = { id: 'plan-1', planKey: 'starter' } as unknown as PlanPricingOutput;
  const invoice = { id: 'invoice-1', amount: 1000 } as unknown as InvoiceOutput;
  const checkoutSession = {
    id: 'checkout-1',
    organizationId: 'org-1',
    url: 'https://stripe.test/checkout',
  } as unknown as CheckoutSessionOutput;
  const portalSession = {
    id: 'portal-1',
    organizationId: 'org-1',
    url: 'https://stripe.test/portal',
  } as unknown as PortalSessionOutput;

  const billingService = {
    getSubscription: vi.fn(),
    getPricing: vi.fn(),
    getInvoices: vi.fn(),
    cancelSubscription: vi.fn(),
    resumeSubscription: vi.fn(),
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    billingService.getSubscription.mockReturnValue(of(subscription));
    billingService.getPricing.mockReturnValue(of(collection([pricing])));
    billingService.getInvoices.mockReturnValue(of(collection([invoice])));
    billingService.cancelSubscription.mockReturnValue(of(canceledSubscription));
    billingService.resumeSubscription.mockReturnValue(of(subscription));
    billingService.createCheckoutSession.mockReturnValue(of(checkoutSession));
    billingService.createPortalSession.mockReturnValue(of(portalSession));

    assignSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        OrganizationBillingStore,
        { provide: BillingService, useValue: billingService },
        {
          provide: DOCUMENT,
          useValue: {
            defaultView: {
              location: { assign: assignSpy },
            },
          },
        },
      ],
    });
    store = TestBed.inject(OrganizationBillingStore);
  });

  describe('initial state', () => {
    it('should start every call state idle', () => {
      expect(store.subscription()).toBeNull();
      expect(store.isLoadingSubscription()).toBe(false);
      expect(store.pricing()).toEqual([]);
      expect(store.isLoadingPricing()).toBe(false);
      expect(store.invoices()).toEqual([]);
      expect(store.isLoadingInvoices()).toBe(false);
      expect(store.invoicesError()).toBeNull();
      expect(store.isStartingCheckout()).toBe(false);
      expect(store.isStartingPortal()).toBe(false);
      expect(store.isCanceling()).toBe(false);
      expect(store.isResuming()).toBe(false);
      expect(store.cancelSucceeded()).toBe(false);
      expect(store.resumeSucceeded()).toBe(false);
      expect(store.billingError()).toBeNull();
    });
  });

  describe('loadSubscription', () => {
    it('should load the subscription on success', async () => {
      store.loadSubscription('org-1');
      await flushEffects();

      expect(billingService.getSubscription).toHaveBeenCalledWith('org-1');
      expect(store.subscription()).toEqual(subscription);
      expect(store.isLoadingSubscription()).toBe(false);
    });

    it('should expose a normalized error on failure', async () => {
      billingService.getSubscription.mockReturnValue(
        throwError(() => ({ status: 500, title: 'Server error' })),
      );

      store.loadSubscription('org-1');
      await flushEffects();

      expect(store.subscription()).toBeNull();
      expect(store.isLoadingSubscription()).toBe(false);
      expect(store.billingError()).not.toBeNull();
      expect(typeof store.billingError()?.message).toBe('string');
    });
  });

  describe('loadPricing', () => {
    it('should load the plan pricing catalog on success', async () => {
      store.loadPricing();
      await flushEffects();

      expect(billingService.getPricing).toHaveBeenCalled();
      expect(store.pricing()).toEqual([pricing]);
      expect(store.isLoadingPricing()).toBe(false);
    });

    it('should keep pricing empty on failure', async () => {
      billingService.getPricing.mockReturnValue(throwError(() => ({ status: 500 })));

      store.loadPricing();
      await flushEffects();

      expect(store.pricing()).toEqual([]);
      expect(store.isLoadingPricing()).toBe(false);
    });
  });

  describe('loadInvoices', () => {
    it('should load recent invoices on success', async () => {
      store.loadInvoices('org-1');
      await flushEffects();

      expect(billingService.getInvoices).toHaveBeenCalledWith('org-1');
      expect(store.invoices()).toEqual([invoice]);
      expect(store.isLoadingInvoices()).toBe(false);
      expect(store.invoicesError()).toBeNull();
    });

    it('should expose a normalized invoicesError on failure', async () => {
      billingService.getInvoices.mockReturnValue(throwError(() => ({ status: 500 })));

      store.loadInvoices('org-1');
      await flushEffects();

      expect(store.invoices()).toEqual([]);
      expect(store.isLoadingInvoices()).toBe(false);
      expect(store.invoicesError()).not.toBeNull();
    });
  });

  describe('cancelSubscription', () => {
    it('should apply the refreshed subscription and flag success', async () => {
      store.cancelSubscription('org-1');
      await flushEffects();

      expect(billingService.cancelSubscription).toHaveBeenCalledWith('org-1');
      expect(store.subscription()).toEqual(canceledSubscription);
      expect(store.cancelSucceeded()).toBe(true);
      expect(store.isCanceling()).toBe(false);
    });

    it('should surface a billingError on failure without flagging success', async () => {
      billingService.cancelSubscription.mockReturnValue(throwError(() => ({ status: 500 })));

      store.cancelSubscription('org-1');
      await flushEffects();

      expect(store.cancelSucceeded()).toBe(false);
      expect(store.isCanceling()).toBe(false);
      expect(store.billingError()).not.toBeNull();
    });
  });

  describe('resumeSubscription', () => {
    it('should apply the refreshed subscription and flag success', async () => {
      store.resumeSubscription('org-1');
      await flushEffects();

      expect(billingService.resumeSubscription).toHaveBeenCalledWith('org-1');
      expect(store.subscription()).toEqual(subscription);
      expect(store.resumeSucceeded()).toBe(true);
      expect(store.isResuming()).toBe(false);
    });

    it('should surface a billingError on failure without flagging success', async () => {
      billingService.resumeSubscription.mockReturnValue(throwError(() => ({ status: 500 })));

      store.resumeSubscription('org-1');
      await flushEffects();

      expect(store.resumeSucceeded()).toBe(false);
      expect(store.isResuming()).toBe(false);
      expect(store.billingError()).not.toBeNull();
    });
  });

  describe('startCheckout', () => {
    it('should redirect the browser to the Stripe checkout URL on success', async () => {
      store.startCheckout({ organizationId: 'org-1', planKey: 'starter', interval: 'month' });
      await flushEffects();

      expect(billingService.createCheckoutSession).toHaveBeenCalledWith('org-1', {
        planKey: 'starter',
        interval: 'month',
      });
      expect(assignSpy).toHaveBeenCalledWith(checkoutSession.url);
      expect(store.isStartingCheckout()).toBe(false);
    });

    it('should not redirect and should surface a billingError on failure', async () => {
      billingService.createCheckoutSession.mockReturnValue(throwError(() => ({ status: 500 })));

      store.startCheckout({ organizationId: 'org-1', planKey: 'starter', interval: 'month' });
      await flushEffects();

      expect(assignSpy).not.toHaveBeenCalled();
      expect(store.isStartingCheckout()).toBe(false);
      expect(store.billingError()).not.toBeNull();
    });
  });

  describe('startPortal', () => {
    it('should redirect the browser to the Stripe portal URL on success', async () => {
      store.startPortal('org-1');
      await flushEffects();

      expect(billingService.createPortalSession).toHaveBeenCalledWith('org-1');
      expect(assignSpy).toHaveBeenCalledWith(portalSession.url);
      expect(store.isStartingPortal()).toBe(false);
    });

    it('should not redirect and should surface a billingError on failure', async () => {
      billingService.createPortalSession.mockReturnValue(throwError(() => ({ status: 500 })));

      store.startPortal('org-1');
      await flushEffects();

      expect(assignSpy).not.toHaveBeenCalled();
      expect(store.isStartingPortal()).toBe(false);
      expect(store.billingError()).not.toBeNull();
    });
  });
});
