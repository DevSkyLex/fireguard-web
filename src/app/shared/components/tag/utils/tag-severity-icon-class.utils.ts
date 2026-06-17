import type { TagSeverity } from '../models';

/**
 * Tailwind icon-colour class per severity. Only the icon carries the colour,
 * keeping the pill neutral and matching the organization table badges and
 * dashboard trend-card filter selects. Dark variants keep the colour legible
 * on the dark surface. Each value is a complete literal string so Tailwind's
 * content scanner keeps the utilities.
 */
const SEVERITY_ICON_CLASS: Record<TagSeverity, string> = {
  success: 'text-green-600 dark:text-green-400',
  info: 'text-blue-600 dark:text-blue-400',
  warn: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
  secondary: 'text-surface-500 dark:text-surface-400',
  contrast: 'text-surface-600 dark:text-surface-300',
};

/**
 * Resolves the Tailwind icon-colour class for a severity.
 *
 * @param {TagSeverity} severity - Severity colour role.
 * @returns {string} The matching `text-*` utility class string.
 */
export function tagSeverityIconClass(severity: TagSeverity): string {
  return SEVERITY_ICON_CLASS[severity];
}
