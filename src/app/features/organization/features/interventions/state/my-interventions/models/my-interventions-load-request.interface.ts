/**
 * Input used to load the field agent intervention list.
 */
export interface MyInterventionsLoadRequest {
  readonly organizationId: string | null;
  readonly online: boolean;
}
