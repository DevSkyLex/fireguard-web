import type { StatTileTone } from './stat-tile-tone.type';

/**
 * Interface StatTileBadge
 * @interface StatTileBadge
 *
 * @description
 * An honest, data-derived qualifier shown as an outline pill in the tile's
 * header — a share of a total, a threshold crossed, a plain status word.
 * Never a fabricated trend: the caller only sets this when a real figure or
 * state backs the label. {@link tone} colours {@link icon} alone (the Glyph
 * Rule, `DESIGN.md`); the pill's surface and text stay neutral.
 *
 * @since 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface StatTileBadge {
  /** The qualifier's text, already localized by the caller. */
  readonly label: string;
  /** Optional registered lucide icon name, decorative. */
  readonly icon: string | null;
  /** Colours {@link icon} only — the pill itself stays neutral either way. */
  readonly tone: StatTileTone;
}
