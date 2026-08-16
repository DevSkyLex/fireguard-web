import type { MapMarkerStatusKind } from '../../../../../models';
import type { MarkerStatusGlyph } from '../../models/marker-status-glyph.interface';

/**
 * Constant MARKER_STATUS_GLYPHS
 *
 * @description
 * The total map from every {@link MapMarkerStatusKind} to its glyph. Kept
 * total rather than falling back on an unknown value: `statusKind` is a
 * closed union, so a missing entry here is a compile error at the call
 * site, which is the point — widening the union should force this map to
 * widen too, not silently render a default glyph (§10.10).
 *
 * @since 1.0.0
 */
const MARKER_STATUS_GLYPHS: Readonly<Record<MapMarkerStatusKind, MarkerStatusGlyph>> = {
  neutral: { glyph: '●', className: 'bg-foreground text-background' },
  positive: { glyph: '✓', className: 'bg-primary text-primary-foreground' },
  warning: {
    glyph: '▲',
    className: 'bg-secondary text-secondary-foreground border border-foreground',
  },
  critical: { glyph: '✕', className: 'bg-destructive text-destructive-foreground' },
  muted: { glyph: '○', className: 'bg-muted text-muted-foreground' },
};

/**
 * Function resolveMarkerStatusGlyph
 *
 * @description
 * Resolves the glyph and Tailwind classes a marker button renders for its
 * `statusKind`, so status reaches the DOM as shape and colour together.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {MapMarkerStatusKind} statusKind - The marker's generic severity.
 *
 * @returns {MarkerStatusGlyph} Its glyph and classes.
 */
export function resolveMarkerStatusGlyph(statusKind: MapMarkerStatusKind): MarkerStatusGlyph {
  return MARKER_STATUS_GLYPHS[statusKind];
}
