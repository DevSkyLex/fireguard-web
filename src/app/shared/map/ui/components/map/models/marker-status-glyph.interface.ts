/**
 * MarkerStatusGlyph
 * @interface MarkerStatusGlyph
 *
 * @description
 * What a marker button renders for one `MapMarkerStatusKind` — a glyph
 * character, so status never rests on colour alone (`PRODUCT.md`), plus the
 * Tailwind classes that colour it with the semantic theme tokens.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MarkerStatusGlyph {
  readonly glyph: string;
  readonly className: string;
}
