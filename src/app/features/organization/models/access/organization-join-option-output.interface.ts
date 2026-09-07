import type { HydraItem } from '@core/api/models';
/**
 * Interface OrganizationJoinOptionOutput
 * @interface OrganizationJoinOptionOutput
 *
 * @description
 * Minimal discoverable organization with explicit admission actions.
 *
 * @since 1.0.0
 */
export interface OrganizationJoinOptionOutput extends HydraItem {
  id: string;
  name: string;
  logoUrl?: string;
  domain: string;
  roleLabel?: string;
  actions: ('join' | 'request' | 'open' | 'view_request')[];
}
