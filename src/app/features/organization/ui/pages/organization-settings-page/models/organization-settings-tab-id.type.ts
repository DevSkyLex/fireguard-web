/**
 * Type OrganizationSettingsTabId
 *
 * @description
 * Which of the settings page's eight sections is showing, driven by the
 * `?tab=` query parameter: `general` (identity and logo), `subscription`
 * (plan and billing), `usage` (quota meters), `notifications`, `regional`
 * (formats), `compliance` (SLAs, inspection periodicity, automation, and the
 * read-only approval summary), `assistant` (AI-assistant policy), or
 * `danger` (deletion). `general` is the default a missing or unrecognized
 * value falls back to.
 *
 * @since 1.0.0
 */
export type OrganizationSettingsTabId =
  | 'general'
  | 'subscription'
  | 'usage'
  | 'notifications'
  | 'regional'
  | 'compliance'
  | 'danger';
