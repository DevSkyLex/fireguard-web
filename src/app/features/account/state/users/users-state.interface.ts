import type { OptionOutput } from '@core/models/api';
import type { UserOutput } from '@features/account/models';
import type { CallState } from '@core/state/request-state';

export interface UsersState {
  readonly totalUsers: number;
  readonly listCallState: CallState;
  readonly createCallState: CallState<UserOutput>;
  readonly updateCallState: CallState<UserOutput>;
  readonly deleteCallState: CallState;
  readonly statuses: ReadonlyArray<OptionOutput>;
  readonly statusesCallState: CallState;
}
