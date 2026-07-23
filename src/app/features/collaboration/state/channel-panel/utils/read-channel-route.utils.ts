import type { ActivatedRoute } from '@angular/router';

/**
 * Interface ChannelRouteContext
 * @interface ChannelRouteContext
 *
 * @description
 * The routed channel, once both ids are known.
 *
 * @since 1.0.0
 */
export interface ChannelRouteContext {
  readonly organizationId: string;
  readonly channelId: string;
}

/**
 * Function readChannelRoute
 * @function readChannelRoute
 *
 * @description
 * Reads the routed organization and channel off the deepest activated route,
 * or `null` when the current URL is not a channel conversation.
 *
 * The panel is instantiated by the layout, so it never receives a routed input
 * — it has to read the router itself. Walking to the deepest child is what
 * `BreadcrumbService` already does; `paramsInheritanceStrategy: 'always'` is
 * what makes `organizationId` visible that far down.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {ActivatedRoute} root - Router state root.
 *
 * @returns {ChannelRouteContext | null} The routed channel, or `null`.
 */
export function readChannelRoute(root: ActivatedRoute): ChannelRouteContext | null {
  let deepest: ActivatedRoute = root;

  while (deepest.firstChild !== null) {
    deepest = deepest.firstChild;
  }

  const channelId: string | null = deepest.snapshot.paramMap.get('channelId');
  const organizationId: string | null = deepest.snapshot.paramMap.get('organizationId');

  if (channelId === null || organizationId === null) return null;

  return { organizationId, channelId };
}
