/**
 * Interface MarkerStatusGlyph
 * @interface MarkerStatusGlyph
 *
 * @description
 * MarkerStatusGlyph
 * What a marker button renders for one `MapMarkerStatusKind` — a glyph
 * character, so status never rests on colour alone (`PRODUCT.md`), plus the
 * Tailwind classes that colour it with the semantic theme tokens.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MarkerStatusGlyph {
  /**
   * Property glyph
   * @readonly
   *
   * @description
   * Text glyph that preserves a non-color cue for the marker status.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly glyph: string;

  /**
   * Property className
   * @readonly
   *
   * @description
   * Semantic theme classes used to tint the marker status glyph.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly className: string;
}
