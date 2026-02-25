import type { HydraItem } from '@core/models/api';

export interface OrganizationMemberOutput extends HydraItem {
  readonly id: string;
  readonly userId: string;
  readonly email: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly roles: ReadonlyArray<string>;
  readonly joinedAt: string;
}
