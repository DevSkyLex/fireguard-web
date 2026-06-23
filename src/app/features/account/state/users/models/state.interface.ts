import type { OptionOutput } from '@core/api/models';
import type { CallState } from '@core/request-state';
import type { UserOutput } from '@features/account/models';

export interface UsersState {
  readonly totalUsers: number;
  readonly listCallState: CallState;
  readonly createCallState: CallState<UserOutput>;
  readonly updateCallState: CallState<UserOutput>;
  readonly deleteCallState: CallState;
  readonly statuses: ReadonlyArray<OptionOutput>;
  readonly statusesCallState: CallState;
}
