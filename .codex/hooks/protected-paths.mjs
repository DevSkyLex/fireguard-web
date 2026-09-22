import path from 'node:path';

const IMMUTABLE_PREFIXES = [
  'src/app/shared/ui/',
  '.agents/skills/spartan/',
  '.agents/skills/design-taste-frontend/',
];

/** Classifies canonical project paths without reading protected file contents. */
export function isImmutableSource(root, file) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const normalized = process.platform === 'win32' ? relative.toLowerCase() : relative;
  return IMMUTABLE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
