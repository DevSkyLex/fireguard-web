export interface UpsertOrganizationLegalProfileInput {
  readonly legalName: string;
  readonly legalType: string;
  readonly countryCode: string;
  readonly registrationNumber?: string | null;
  readonly vatNumber?: string | null;
  readonly address?: string | null;
  readonly city?: string | null;
  readonly postalCode?: string | null;
}
