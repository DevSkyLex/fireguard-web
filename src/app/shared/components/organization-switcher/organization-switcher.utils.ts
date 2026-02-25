/**
 * orgInitials
 *
 * @description
 * Returns up to two uppercase initials derived from the
 * organization name (first letter of each of the first two words).
 *
 * @since 2.0.0
 *
 * @param {string} name - Organization name.
 * @returns {string} One or two uppercase letters.
 */
export function orgInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

/**
 * orgColor
 *
 * @description
 * Derives a deterministic Tailwind background-color class from the
 * organization id so each org has a stable, distinct color.
 *
 * @since 2.0.0
 *
 * @param {string} id - Organization identifier.
 * @returns {string} A Tailwind bg-* class string.
 */
export function orgColor(id: string): string {
  const palette: string[] = [
    'bg-violet-500',
    'bg-blue-500',
    'bg-cyan-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];
  const index: number = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0) % palette.length;
  return palette[index];
}
