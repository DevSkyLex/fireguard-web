/**
 * Type StatTileTone
 *
 * @description
 * The tile's achromatic-by-default severity: `neutral` (the default) or
 * `destructive` for a metric currently in a bad state (an overdue count,
 * say). Chroma is confined to the tile's icon — the Glyph Rule
 * (`DESIGN.md`) — the surface, border, value and label never carry it.
 *
 * @since 1.2.0
 */
export type StatTileTone = 'neutral' | 'destructive';
