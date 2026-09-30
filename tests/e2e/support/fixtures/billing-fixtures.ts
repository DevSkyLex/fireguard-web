/**
 * Organization quota, subscription, pricing, invoice and plan-catalog
 * transport fixtures for the e2e suite, mirroring the backend contract
 * consumed by the settings page's Usage and Subscription tabs. Plain factory
 * functions (like `api-fixtures.ts`), so tests override fields via object
 * spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';

export interface OrganizationQuotaItemOutputFixture {
  readonly resource: 'members' | 'facilities' | 'equipment' | 'inspections';
  readonly used: number;
  readonly limit: number | null;
}

export interface OrganizationQuotaOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly organizationId: string;
  readonly items: ReadonlyArray<OrganizationQuotaItemOutputFixture>;
}

/** Comfortably under every plan limit — renders the usage meters without a warning state. */
export function organizationQuotaOutput(
  overrides: Partial<OrganizationQuotaOutputFixture> = {},
): OrganizationQuotaOutputFixture {
  return {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/quota`,
    '@type': 'OrganizationQuota',
    organizationId: E2E_ORGANIZATION_ID,
    items: [
      { resource: 'members', used: 2, limit: 25 },
      { resource: 'facilities', used: 3, limit: 50 },
      { resource: 'equipment', used: 40, limit: 500 },
      { resource: 'inspections', used: 12, limit: null },
    ],
    ...overrides,
  };
}

export interface OrganizationSubscriptionOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly organizationId: string;
  readonly hasSubscription: boolean;
  readonly active: boolean;
  readonly status?: string | null;
  readonly planKey?: string | null;
  readonly interval?: 'month' | 'year' | null;
  readonly currentPeriodEnd?: string | null;
  readonly cancelAtPeriodEnd: boolean;
}

/** An active, renewing subscription on the Pro plan. */
export function organizationSubscriptionOutput(
  overrides: Partial<OrganizationSubscriptionOutputFixture> = {},
): OrganizationSubscriptionOutputFixture {
  return {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/billing/subscription`,
    '@type': 'OrganizationSubscription',
    organizationId: E2E_ORGANIZATION_ID,
    hasSubscription: true,
    active: true,
    status: 'active',
    planKey: 'pro',
    interval: 'month',
    currentPeriodEnd: '2026-09-11T00:00:00+00:00',
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

export interface PlanPricingOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly planKey: string;
  readonly currency: string;
  readonly monthlyAmount?: number | null;
  readonly yearlyAmount?: number | null;
}

/** Display pricing for the whole payable plan catalog. */
export const E2E_PLAN_PRICING: ReadonlyArray<PlanPricingOutputFixture> = [
  { '@id': '/api/billing/pricing/free', '@type': 'PlanPricing', planKey: 'free', currency: 'eur' },
  {
    '@id': '/api/billing/pricing/pro',
    '@type': 'PlanPricing',
    planKey: 'pro',
    currency: 'eur',
    monthlyAmount: 4900,
    yearlyAmount: 49000,
  },
];

export interface InvoiceOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly number?: string | null;
  readonly status: string;
  readonly amount: number;
  readonly currency: string;
  readonly createdAt?: string | null;
  readonly hostedInvoiceUrl?: string | null;
  readonly invoicePdf?: string | null;
}

/** One paid invoice — populates the Subscription tab's Invoices list. */
export function invoiceOutput(overrides: Partial<InvoiceOutputFixture> = {}): InvoiceOutputFixture {
  return {
    '@id': '/api/billing/invoices/e2e-invoice-1',
    '@type': 'Invoice',
    id: 'e2e-invoice-1',
    number: 'INV-2026-0001',
    status: 'paid',
    amount: 4900,
    currency: 'eur',
    createdAt: '2026-08-01T00:00:00+00:00',
    hostedInvoiceUrl: 'https://stripe.test/invoices/e2e-invoice-1',
    invoicePdf: 'https://stripe.test/invoices/e2e-invoice-1.pdf',
    ...overrides,
  };
}

export interface PlanQuotaOutputFixture {
  readonly resource: 'members' | 'facilities' | 'equipment' | 'inspections';
  readonly label: string;
  readonly limit: number | null;
  readonly summary: string;
}

export interface PlanOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly description?: string | null;
  readonly limits: Readonly<Record<string, number>>;
  readonly quotas: ReadonlyArray<PlanQuotaOutputFixture>;
  readonly isActive: boolean;
  readonly isDefault: boolean;
  readonly sortOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** The Pro catalog plan — marked current for the organization's `planId`. */
export function planOutput(overrides: Partial<PlanOutputFixture> = {}): PlanOutputFixture {
  return {
    '@id': '/api/plans/e2e-plan-pro',
    '@type': 'Plan',
    id: 'e2e-plan-pro',
    key: 'pro',
    name: 'Pro',
    description: 'For growing fire-safety teams.',
    limits: { members: 25, facilities: 50, equipment: 500 },
    quotas: [
      { resource: 'members', label: 'Members', limit: 25, summary: 'Up to 25 members' },
      { resource: 'facilities', label: 'Facilities', limit: 50, summary: 'Up to 50 facilities' },
      { resource: 'equipment', label: 'Equipment', limit: 500, summary: 'Up to 500 equipment' },
      {
        resource: 'inspections',
        label: 'Inspections',
        limit: null,
        summary: 'Unlimited inspections',
      },
    ],
    isActive: true,
    isDefault: false,
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  };
}
