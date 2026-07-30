import { tagSeverityDotClass } from '../tag-severity-dot-class.utils';
import type { TagSeverity } from '../tag-severity.type';

const SEVERITIES: readonly TagSeverity[] = [
  'success',
  'info',
  'warn',
  'danger',
  'secondary',
  'contrast',
];

describe('tagSeverityDotClass', () => {
  it('resolves a background utility for every severity', () => {
    for (const severity of SEVERITIES) {
      expect(tagSeverityDotClass(severity)).toMatch(/(^|\s)bg-/);
    }
  });

  it('gives each severity a distinct class so dots stay decodable', () => {
    const classes = SEVERITIES.map(tagSeverityDotClass);

    expect(new Set(classes).size).toBe(SEVERITIES.length);
  });

  it('keeps every class a complete literal so the Tailwind scanner keeps it', () => {
    for (const severity of SEVERITIES) {
      expect(tagSeverityDotClass(severity)).not.toContain('${');
    }
  });

  it('pairs the neutral severities with a dark-mode variant', () => {
    expect(tagSeverityDotClass('secondary')).toContain('dark:');
    expect(tagSeverityDotClass('contrast')).toContain('dark:');
  });
});
