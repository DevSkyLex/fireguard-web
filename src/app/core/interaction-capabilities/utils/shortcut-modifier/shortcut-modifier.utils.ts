import type { ShortcutModifier } from '../../models/shortcut-modifier.type';
import type { ShortcutPlatformEvidence } from '../../models/shortcut-platform-evidence.interface';

/**
 * Function resolveShortcutModifier
 * @description Resolves the platform modifier without assuming a browser global, so the
 * result remains safe to use during server rendering. Explicit platform fields win over
 * the user agent because privacy tools can expose a reduced or synthetic browser identity.
 * @access public
 * @since 1.0.0
 * @param {ShortcutPlatformEvidence | string} evidence - Browser platform evidence, or a
 * legacy user-agent string when only that value is available.
 * @returns {ShortcutModifier} The modifier to show in a keyboard shortcut hint.
 */
export function resolveShortcutModifier(
  evidence: ShortcutPlatformEvidence | string,
): ShortcutModifier {
  const platformEvidence =
    typeof evidence === 'string'
      ? ''
      : `${evidence.platform ?? ''} ${evidence.userAgentData?.platform ?? ''}`.trim();
  const userAgent = typeof evidence === 'string' ? evidence : (evidence.userAgent ?? '');

  if (platformEvidence.length > 0) {
    return /Mac|iPhone|iPad|iPod/iu.test(platformEvidence) ? '⌘' : 'Ctrl';
  }

  return /Mac|iPhone|iPad|iPod/iu.test(userAgent) ? '⌘' : 'Ctrl';
}

/**
 * Function formatShortcut
 * @description Formats a shortcut key with the platform-specific modifier.
 * @access public
 * @since 1.0.0
 * @param {ShortcutModifier} modifier - Platform modifier to display.
 * @param {string} key - Shortcut key, including punctuation such as `,`.
 * @returns {string} Human-readable shortcut hint.
 */
export function formatShortcut(modifier: ShortcutModifier, key: string): string {
  return modifier === '⌘' ? `${modifier}${key}` : `${modifier}+${key}`;
}
