/**
 * Constant COMPLIANCE_BUCKET_TAG_ICON_CLASS
 *
 * @description
 * The colour each `ComplianceBucketTagDescriptor.severity` puts on the
 * compliance badge's **icon**, and on nothing else — the badge itself stays
 * `outline`, transparent ground and muted text, mirroring
 * `facilities/ui/components/facility-status-tag`'s glyph rule
 * (`DESIGN.md`). The theme carries no `--warning`/`--danger` token, so a
 * private literal Tailwind pair is the sanctioned exception
 * (`ARCHITECTURE.md` §2.8) — the same pair `FACILITY_STATUS_TAG_ICON_CLASS`
 * already uses.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<'success' | 'warning' | 'danger' | 'neutral', string>>}
 */
export const COMPLIANCE_BUCKET_TAG_ICON_CLASS: Readonly<
  Record<'success' | 'warning' | 'danger' | 'neutral', string>
> = {
  success: 'text-success',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-red-500 dark:text-red-400',
  neutral: 'text-neutral-500 dark:text-neutral-400',
};
