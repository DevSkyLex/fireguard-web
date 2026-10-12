import type { CalendarFeedSourceOutput } from './calendar-feed-source-output.interface';

/**
 * Type CalendarSourceKey
 *
 * @description
 * Identifier of a source contributed to the backend's unified calendar feed.
 * The authorized source transport defines the open key; historical and additional sources also
 * render safely.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export type CalendarSourceKey = CalendarFeedSourceOutput['sourceKey'];
