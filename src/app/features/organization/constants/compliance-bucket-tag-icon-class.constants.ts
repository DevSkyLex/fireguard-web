/**
 * Constant COMPLIANCE_BUCKET_TAG_ICON_CLASS
 *
 * @description
 * The colour each `ComplianceBucketTagDescriptor.severity` puts on the
 * compliance badge's **icon**, and on nothing else — the badge itself stays
 * `outline`, transparent ground and muted text, mirroring
 * `facilities/ui/components/facility-status-tag`'s glyph rule
 * (`DESIGN.md`). Values are the theme's status tokens, which flip with the
 * appearance on their own — the same map `FACILITY_STATUS_TAG_ICON_CLASS`
 * keeps for itself (`ARCHITECTURE.md` §2.8).
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<'success' | 'warning' | 'danger' | 'neutral', string>>}
 */
export const COMPLIANCE_BUCKET_TAG_ICON_CLASS: Readonly<
  Record<'success' | 'warning' | 'danger' | 'neutral', string>
> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  neutral: 'text-muted-foreground',
};
