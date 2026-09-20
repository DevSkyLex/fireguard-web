/**
 * Interface WorkloadAssessment
 * @interface WorkloadAssessment
 *
 * @description
 * Confirmation bound to the exact before and after projection.
 *
 * @since 1.0.0
 */
export interface WorkloadAssessment {
  /**
   * Property confirmationRequired
   * @readonly
   *
   * @description
   * Whether daily overload is created or increased.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly confirmationRequired: boolean;

  /**
   * Property increases
   * @readonly
   *
   * @description
   * Affected people and daily overload before and after.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly { readonly memberId: string; readonly date?: string | null; readonly reason: string; readonly beforeMinutes: number; readonly afterMinutes: number; readonly capacityMinutes?: number | null }[]}
   */
  readonly increases: readonly {
    readonly memberId: string;
    readonly memberName?: string;
    readonly date?: string | null;
    readonly reason: string;
    readonly beforeMinutes: number;
    readonly afterMinutes: number;
    readonly capacityMinutes?: number | null;
  }[];

  /**
   * Property completeness
   * @readonly
   *
   * @description
   * Unknown work must remain visible.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {'complete' | 'partial' | 'unavailable'}
   */
  readonly completeness: 'complete' | 'partial' | 'unavailable';

  /**
   * Property confirmationToken
   * @readonly
   *
   * @description
   * Opaque agreement token; never reuse after a changed assessment.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly confirmationToken: string;
}
