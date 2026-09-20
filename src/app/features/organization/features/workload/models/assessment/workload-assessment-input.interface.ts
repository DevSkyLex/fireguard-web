/**
 * Interface WorkloadAssessmentInput
 * @interface WorkloadAssessmentInput
 *
 * @description
 * Read-only simulation replacing existing task contributions.
 *
 * @since 1.0.0
 */
export interface WorkloadAssessmentInput {
  /**
   * Property changes
   * @readonly
   *
   * @description
   * Complete proposed contributions, not additive copies.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly { readonly taskId: string; readonly memberId: string | null; readonly remainingMinutes: number | null; readonly startsOn: string | null; readonly endsOn: string | null }[]}
   */
  readonly changes: readonly {
    readonly taskId: string;
    readonly memberId: string | null;
    readonly remainingMinutes: number | null;
    readonly startsOn: string | null;
    readonly endsOn: string | null;
  }[];

  /**
   * Property planInterventionId
   * @readonly
   *
   * @description
   * Draft whose entire prepared scope is promoted in the simulation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly planInterventionId?: string;
}
