import type { OrganizationAssistantSettings } from '@features/organization/models';

/**
 * Type OrganizationAssistantFormValues
 *
 * @description
 * The shape the assistant form edits. Excludes
 * {@link OrganizationAssistantSettings}'s `model` — rendered read-only, per
 * `FEATURE.md`, until a model picker has a catalog to pick from.
 *
 * @since 1.0.0
 */
export type OrganizationAssistantFormValues = Pick<
  OrganizationAssistantSettings,
  'enabled' | 'temperature' | 'includeBusinessContext'
>;
