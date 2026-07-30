import { tagSeverityIconClass } from '../tag-severity-icon-class.utils';
import type { TagSeverity } from '../tag-severity.type';

const SEVERITIES: readonly TagSeverity[] = [
  'success',
  'info',
  'warn',
  'danger',
  'secondary',
  'contrast',
];

describe('tagSeverityIconClass', () => {
  it('resolves a text-colour utility for every severity', () => {
    for (const severity of SEVERITIES) {
      expect(tagSeverityIconClass(severity)).toMatch(/(^|\s)text-/);
    }
  });

  it('gives each severity a distinct class so icons stay decodable', () => {
    const classes = SEVERITIES.map(tagSeverityIconClass);

    expect(new Set(classes).size).toBe(SEVERITIES.length);
  });

  it('pairs every severity with a dark-mode variant so it stays legible on dark surfaces', () => {
    for (const severity of SEVERITIES) {
      expect(tagSeverityIconClass(severity)).toContain('dark:');
    }
  });

  it('keeps every class a complete literal so the Tailwind scanner keeps it', () => {
    for (const severity of SEVERITIES) {
      expect(tagSeverityIconClass(severity)).not.toContain('${');
    }
  });
});
