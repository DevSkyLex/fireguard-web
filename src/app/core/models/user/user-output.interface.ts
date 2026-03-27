import type { HydraItem } from '@core/models/api';

/**
 * Interface UserOutput
 *
 * @description
 * Read model returned by user endpoints.
 */
export interface UserOutput extends HydraItem {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly avatarUrl?: string | null;
  readonly status?: string | null;
  readonly emailVerified: boolean;
  readonly tenantId?: string | null;
  readonly createdAt?: string | null;
  readonly lastLoginAt?: string | null;
}
