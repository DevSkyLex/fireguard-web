/**
 * Interface ShortcutPlatformEvidence
 * @interface ShortcutPlatformEvidence
 *
 * @description
 * Browser platform evidence used to choose a keyboard shortcut modifier.
 *
 * @since 1.0.0
 */
export interface ShortcutPlatformEvidence {
  /**
   * Property platform
   * @readonly
   *
   * @description
   * Navigator platform, when exposed by the browser.
   *
   * @type {string}
   */
  readonly platform?: string;

  /**
   * Property userAgent
   * @readonly
   *
   * @description
   * Legacy user-agent string, when exposed by the browser.
   *
   * @type {string}
   */
  readonly userAgent?: string;

  /**
   * Property userAgentData
   * @readonly
   *
   * @description
   * Optional low-entropy client hint for the platform.
   *
   * @type {{ readonly platform?: string }}
   */
  readonly userAgentData?: { readonly platform?: string };
}
