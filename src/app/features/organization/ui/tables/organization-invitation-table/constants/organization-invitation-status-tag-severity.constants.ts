import type { OrganizationInvitationStatusTagSeverity } from '../models';

/**
 * Constant ORGANIZATION_INVITATION_STATUS_TAG_ICON_CLASS
 *
 * @description
 * The colour each severity puts on the badge's **icon**, and on nothing else
 * — the badge itself stays `outline`, transparent ground and muted text, per
 * `DESIGN.md`'s glyph rule. Values are the same literal Tailwind palette
 * pairs every other status registry in this codebase uses; `success` is the
 * one severity with a theme token (`--success`, so no `dark:` twin), and the
 * literal pairs that remain are the sanctioned exception (`ARCHITECTURE.md`
 * §2.8).
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<OrganizationInvitationStatusTagSeverity, string>>}
 */
export const ORGANIZATION_INVITATION_STATUS_TAG_ICON_CLASS: Readonly<
  Record<OrganizationInvitationStatusTagSeverity, string>
> = {
  neutral: 'text-muted-foreground',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};
