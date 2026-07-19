import type { HydraItem } from '@core/api/models';

/**
 * The card on file for an organization, as Stripe reports it.
 *
 * Read-only: changing it goes through the Stripe billing portal, never through
 * this app — card details must not touch our forms.
 *
 * Every field but `hasPaymentMethod` is null when no card is attached, so the
 * boolean is the one to branch on rather than probing `last4`.
 *
 * @since 1.0.0
 */
export interface PaymentMethodOutput extends HydraItem {
  readonly organizationId: string;
  readonly hasPaymentMethod: boolean;
  readonly brand: string | null;
  readonly last4: string | null;
  readonly expMonth: number | null;
  readonly expYear: number | null;
}
