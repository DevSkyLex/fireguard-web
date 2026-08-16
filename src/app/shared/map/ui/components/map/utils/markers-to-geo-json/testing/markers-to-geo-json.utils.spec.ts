import { describe, expect, it } from 'vitest';
import type { MapMarker } from '../../../../../../models';
import { markersToGeoJson } from '../markers-to-geo-json.utils';

describe('markersToGeoJson', () => {
  it('returns an empty collection for no markers', () => {
    expect(markersToGeoJson([])).toEqual({ type: 'FeatureCollection', features: [] });
  });

  it('projects each marker to a Point feature keyed by its id', () => {
    const markers: readonly MapMarker[] = [
      { id: 'a', latitude: 48.8566, longitude: 2.3522, statusKind: 'neutral', label: 'A' },
      { id: 'b', latitude: 45.764, longitude: 4.8357, statusKind: 'critical', label: 'B' },
    ];

    expect(markersToGeoJson(markers)).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'a',
          properties: { markerId: 'a' },
          geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
        },
        {
          type: 'Feature',
          id: 'b',
          properties: { markerId: 'b' },
          geometry: { type: 'Point', coordinates: [4.8357, 45.764] },
        },
      ],
    });
  });
});
