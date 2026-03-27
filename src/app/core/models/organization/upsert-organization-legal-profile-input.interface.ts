/**
 * Interface UpsertOrganizationLegalProfileInput
 *
 * @description
 * Payload used to create or update an organization legal profile.
 */
export interface UpsertOrganizationLegalProfileInput {
  readonly countryCode?: string | null;
  readonly legalType: 'company' | 'non_profit' | 'public_sector' | 'individual' | 'other';
  readonly legalName: string;
  readonly registrationNumber?: string | null;
  readonly vatNumber?: string | null;
}
