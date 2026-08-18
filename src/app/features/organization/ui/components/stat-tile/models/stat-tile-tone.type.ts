/**
 * Type StatTileTone
 *
 * @description
 * The tile's achromatic-by-default severity: `neutral` (the default),
 * `success` for a metric currently in a good state (a desirable trend, a
 * cleared threshold), or `destructive` for one in a bad state (an overdue
 * count, an undesirable trend). Matches the vocabulary `DESIGN.md`'s
 * tertiary glyph palette already names (`text-success` alongside
 * `text-destructive`). Chroma is confined to the tile's icon — the Glyph
 * Rule (`DESIGN.md`) — the surface, border, value and label never carry it.
 *
 * @since 1.2.0
 */
export type StatTileTone = 'neutral' | 'success' | 'destructive';
