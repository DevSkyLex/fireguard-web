import type { QuotaStatusTagDescriptor } from './quota-status-tag/quota-status-tag-descriptor.interface';

/**
 * Interface OrganizationUsageRow
 *
 * @description
 * A quota usage item joined with its label, resolved status descriptor and
 * meter percentage, ready for one meter row. `percent` is `null` for an
 * unlimited resource, which renders no bar.
 *
 * @since 1.0.0
 */
export interface OrganizationUsageRow {
  readonly resource: string;
  readonly label: string;
  readonly used: number;
  readonly limit: number | null;
  readonly percent: number | null;
  readonly status: QuotaStatusTagDescriptor;
}
