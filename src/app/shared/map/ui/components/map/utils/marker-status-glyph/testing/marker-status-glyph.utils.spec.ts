import { describe, expect, it } from 'vitest';
import type { MapMarkerStatusKind } from '../../../../../../models';
import { resolveMarkerStatusGlyph } from '../marker-status-glyph.utils';

describe('resolveMarkerStatusGlyph', () => {
  it('resolves a distinct glyph and class per status kind', () => {
    const kinds: readonly MapMarkerStatusKind[] = [
      'neutral',
      'positive',
      'warning',
      'critical',
      'muted',
    ];

    const resolved = kinds.map((kind) => resolveMarkerStatusGlyph(kind));

    expect(new Set(resolved.map((entry) => entry.glyph)).size).toBe(kinds.length);
    for (const entry of resolved) {
      expect(entry.className.length).toBeGreaterThan(0);
    }
  });

  it('pairs critical with the destructive token, never colour alone', () => {
    expect(resolveMarkerStatusGlyph('critical')).toEqual({
      glyph: '✕',
      className: 'bg-destructive text-destructive-foreground',
    });
  });
});
