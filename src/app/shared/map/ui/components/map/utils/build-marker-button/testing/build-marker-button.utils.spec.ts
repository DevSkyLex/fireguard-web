import { describe, expect, it } from 'vitest';
import type { MapMarker } from '../../../../../../models';
import { buildMarkerButton } from '../build-marker-button.utils';

describe('buildMarkerButton', () => {
  it('builds a keyboard-focusable button carrying the marker label as its accessible name', () => {
    const marker: MapMarker = {
      id: 'facility-1',
      latitude: 48.8566,
      longitude: 2.3522,
      statusKind: 'warning',
      label: 'Site Nord',
    };

    const button = buildMarkerButton(marker);

    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Site Nord');
    expect(button.dataset['markerId']).toBe('facility-1');
    expect(button.textContent).toBe('▲');
  });

  it('gives each status kind a distinct glyph, not only a colour', () => {
    const base: Omit<MapMarker, 'statusKind'> = {
      id: 'x',
      latitude: 0,
      longitude: 0,
      label: 'X',
    };

    const glyphs = new Set(
      (['neutral', 'positive', 'warning', 'critical', 'muted'] as const).map(
        (statusKind) => buildMarkerButton({ ...base, statusKind }).textContent,
      ),
    );

    expect(glyphs.size).toBe(5);
  });
});
