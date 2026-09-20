import type { HydraItem } from '@core/api/models';

/**
 * Interface CapacityOutput
 * @interface CapacityOutput
 *
 * @description
 * Historical weeks and active exceptions for one scope.
 *
 * @since 1.0.0
 */
export interface CapacityOutput extends HydraItem {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property configuration
   * @readonly
   *
   * @description
   * Server history and active availability exceptions.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {{ readonly weeks: readonly { readonly id: string; readonly scopeId: string; readonly effectiveOn: string; readonly minutes: readonly number[] }[]; readonly exceptions: readonly { readonly id: string; readonly memberId: string; readonly startsOn: string; readonly endsOn: string; readonly minutes: number }[] }}
   */
  readonly configuration: {
    readonly weeks: readonly {
      readonly id: string;
      readonly scopeId: string;
      readonly effectiveOn: string;
      readonly minutes: readonly number[];
    }[];
    readonly exceptions: readonly {
      readonly id: string;
      readonly memberId: string;
      readonly startsOn: string;
      readonly endsOn: string;
      readonly minutes: number;
    }[];
  };
}
