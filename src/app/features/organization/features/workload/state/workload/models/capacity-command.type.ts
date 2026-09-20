import type {
  CapacityExceptionInput,
  CapacityWeekInput,
} from '@features/organization/features/workload/models';

/**
 * Type CapacityCommand
 * @type CapacityCommand
 *
 * @description
 * Non-cancellable capacity write with a fixed organization and target.
 *
 * @since 1.0.0
 */
export type CapacityCommand =
  | {
      readonly kind: 'week';
      readonly organizationId: string;
      readonly memberId: string | null;
      readonly input: CapacityWeekInput;
    }
  | {
      readonly kind: 'exception';
      readonly organizationId: string;
      readonly memberId: string;
      readonly input: CapacityExceptionInput;
    }
  | {
      readonly kind: 'cancel';
      readonly organizationId: string;
      readonly memberId: string;
      readonly exceptionId: string;
    };
