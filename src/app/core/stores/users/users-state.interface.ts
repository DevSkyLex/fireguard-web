import type { OptionOutput } from '@core/models/api';
import type { UserOutput } from '@core/models/user';
import type { CollectionOperation, Operation } from '../operations';

export interface UsersState {
  readonly totalUsers: number;
  readonly isLoading: boolean;
  readonly createOperation: Operation<UserOutput | null, unknown>;
  readonly updateOperation: Operation<UserOutput | null, unknown>;
  readonly deleteOperation: Operation<void, unknown>;
  readonly statuses: ReadonlyArray<OptionOutput>;
  readonly statusesOperation: CollectionOperation<OptionOutput, unknown>;
}
