import type { ShortcutModifier } from '../../../models/shortcut-modifier.type';
import type { ShortcutPlatformEvidence } from '../../../models/shortcut-platform-evidence.interface';
import { formatShortcut, resolveShortcutModifier } from '../shortcut-modifier.utils';

describe('shortcut-modifier.utils', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Ctrl'],
    ['Mozilla/5.0 (X11; Linux x86_64)', 'Ctrl'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', '⌘'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', '⌘'],
  ])('resolves %s to %s', (userAgent: string, expected: string) => {
    expect(resolveShortcutModifier({ userAgent })).toBe(expected);
  });

  it('prioritizes Windows platform evidence over a conflicting user agent', () => {
    const evidence: ShortcutPlatformEvidence = {
      platform: 'Win32',
      userAgent: 'Macintosh; Intel Mac OS X',
    };

    expect(resolveShortcutModifier(evidence)).toBe('Ctrl');
  });

  it('uses a non-Apple platform over a synthetic Apple user agent', () => {
    const evidence: ShortcutPlatformEvidence = {
      platform: 'Linux x86_64',
      userAgent: 'Macintosh; Intel Mac OS X',
    };

    expect(resolveShortcutModifier(evidence)).toBe('Ctrl');
  });

  it('uses an explicit Apple platform when the user agent is reduced', () => {
    const evidence: ShortcutPlatformEvidence = {
      platform: 'MacIntel',
      userAgent: 'Mozilla/5.0',
    };

    expect(resolveShortcutModifier(evidence)).toBe('⌘');
  });

  it.each([
    ['Ctrl', 'P', 'Ctrl+P'],
    ['Ctrl', ',', 'Ctrl+,'],
    ['⌘', 'P', '⌘P'],
    ['⌘', ',', '⌘,'],
  ])('formats %s and %s as %s', (modifier, key, expected) => {
    expect(formatShortcut(modifier as ShortcutModifier, key)).toBe(expected);
  });
});
