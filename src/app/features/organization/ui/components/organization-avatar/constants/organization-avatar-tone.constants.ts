/**
 * Constant ORGANIZATION_AVATAR_TONE_CLASSES
 *
 * @description
 * The ten grounds a logo-less organization avatar can take, as literal class
 * strings so Tailwind's scanner sees them.
 *
 * Chroma is admitted here on the same terms as an operator-chosen label
 * colour: it identifies a record, it does not signal a state. The set
 * therefore excludes the three hues the status system owns — red, amber and
 * green — so a tinted initials square is never mistaken for a severity. Each
 * tone pairs a tint ground with a strong foreground of the same hue, and
 * flips to the inverse rung in dark mode so the pair keeps its contrast
 * instead of going muddy.
 *
 * @since 1.0.0
 *
 * @type {ReadonlyArray<string>}
 */
export const ORGANIZATION_AVATAR_TONE_CLASSES: ReadonlyArray<string> = [
  'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100',
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100',
  'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100',
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-100',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100',
  'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100',
  'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100',
];
