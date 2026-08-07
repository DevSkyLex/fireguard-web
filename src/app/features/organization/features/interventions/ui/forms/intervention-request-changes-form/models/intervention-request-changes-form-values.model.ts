/**
 * What the reviewer sends back with an intervention.
 *
 * The note is what the field agent reads when the work returns to execution,
 * which is why the backend requires it rather than accepting a bare rejection.
 */
export interface InterventionRequestChangesFormValues {
  readonly note: string;
}
