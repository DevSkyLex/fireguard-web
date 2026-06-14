/**
 * Input used to load the field agent mission list.
 */
export interface MyMissionsLoadRequest {
  readonly organizationId: string | null;
  readonly online: boolean;
}
