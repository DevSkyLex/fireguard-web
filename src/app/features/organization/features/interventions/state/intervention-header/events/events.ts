import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

/**
 * Constant interventionHeaderEvents
 * @const interventionHeaderEvents
 *
 * @description
 * Events dispatched by the layout-rendered intervention header actions
 * (page-header slot) and consumed by the detail page, which owns the
 * corresponding orchestration (command invocation, request-changes drawer,
 * prev/next navigation).
 *
 * @since 1.0.0
 */
export const interventionHeaderEvents = eventGroup({
  source: 'Intervention Header',
  events: {
    commandInvoked: type<void>(),
    changesRequested: type<void>(),
    prevRequested: type<void>(),
    nextRequested: type<void>(),
  },
});
