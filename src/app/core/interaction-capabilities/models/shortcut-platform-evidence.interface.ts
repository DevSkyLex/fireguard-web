/**
 * Interface ShortcutPlatformEvidence
 * @interface ShortcutPlatformEvidence
 * @description Browser platform evidence used to choose a keyboard shortcut modifier.
 * @since 1.0.0
 */
export interface ShortcutPlatformEvidence {
  /** Navigator platform, when exposed by the browser. */
  readonly platform?: string;
  /** Legacy user-agent string, when exposed by the browser. */
  readonly userAgent?: string;
  /** Optional low-entropy client hint for the platform. */
  readonly userAgentData?: { readonly platform?: string };
}
