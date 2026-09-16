/**
 * Interface InterventionTableRequest
 * @interface InterventionTableRequest
 * @description Context- and generation-bound execution command; delay applies only to text edits.
 * @since 6.2.0
 */
export interface InterventionTableRequest<TCriteria> {
  readonly interventionId: string;
  readonly criteria: TCriteria;
  readonly generation: number;
  readonly delay: number;
}
