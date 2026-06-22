import type { TagSeverity } from '../models';

/**
 * Tailwind background-colour class per severity, for solid indicators such as
 * calendar event bars and category dots. The colour fills the shape (unlike the
 * icon-only colour used by the neutral pill), so it carries the same semantic
 * role across surfaces. Each value is a complete literal string so Tailwind's
 * content scanner keeps the utilities.
 */
const SEVERITY_DOT_CLASS: Record<TagSeverity, string> = {
  success: 'bg-green-500',
  info: 'bg-blue-500',
  warn: 'bg-amber-500',
  danger: 'bg-red-500',
  secondary: 'bg-surface-400 dark:bg-surface-500',
  contrast: 'bg-surface-600 dark:bg-surface-300',
};

/**
 * Resolves the Tailwind background-colour class for a severity dot or bar.
 *
 * @param {TagSeverity} severity - Severity colour role.
 * @returns {string} The matching `bg-*` utility class string.
 */
export function tagSeverityDotClass(severity: TagSeverity): string {
  return SEVERITY_DOT_CLASS[severity];
}
