import type { HydraItem } from '@core/api/models';
/**
 * Interface OrganizationDomainOutput
 * @interface OrganizationDomainOutput
 *
 * @description
 * Organization-owned domain challenge and verification status.
 *
 * @since 1.0.0
 */
export interface OrganizationDomainOutput extends HydraItem {
  id: string;
  domain: string;
  status: 'pending' | 'verified' | 'suspended';
  dnsName: string;
  dnsValue: string;
  verifiedAt?: string;
  lastCheckedAt?: string;
}
