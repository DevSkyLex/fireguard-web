import type { MapCoordinates } from './map-coordinates.interface';

/**
 * MapClickEvent
 * @description
 * The position an interactive click on the map resolved to, emitted by
 * {@link Map}'s `mapClicked` output. Identical in shape to
 * {@link MapCoordinates} — kept as its own name because it is an event
 * payload, not a static position.
 */
export type MapClickEvent = MapCoordinates;
