import type { OrganizationStatusTagSeverity } from '../models';

/**
 * Constant ORGANIZATION_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the organization status icon, and on
 * nothing else, per `DESIGN.md`'s glyph rule.
 *
 * @since 1.9.0
 *
 * @type {Readonly<Record<OrganizationStatusTagSeverity, string>>}
 */
export const ORGANIZATION_STATUS_TAG_ICON_CLASS: Readonly<
  Record<OrganizationStatusTagSeverity, string>
> = {
  neutral: 'text-muted-foreground',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};
