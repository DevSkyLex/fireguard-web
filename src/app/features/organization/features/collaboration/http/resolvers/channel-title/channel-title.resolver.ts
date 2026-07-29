import { inject } from '@angular/core';
import type { ActivatedRouteSnapshot, MaybeAsync, ResolveFn } from '@angular/router';
import { catchError, map, of, type Observable } from 'rxjs';
import { ChannelService } from '@features/organization/features/collaboration/data-access';
import type { ChannelOutput } from '@features/organization/features/collaboration/models';

/**
 * Constant CHANNEL_TITLE_FALLBACK
 * @const CHANNEL_TITLE_FALLBACK
 *
 * @description
 * Neutral label used for the page title and breadcrumb when the channel name
 * cannot be resolved (missing id, or the read failed), so the tab and the
 * header degrade gracefully instead of showing a raw id or just the app name.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
const CHANNEL_TITLE_FALLBACK: string = $localize`:@@route.channel:Channel`;

/**
 * Resolver channelTitleResolver
 *
 * @description
 * Resolves a channel's name — prefixed with `#`, the way a channel is named
 * everywhere else in the workspace — for the page title and breadcrumb. The
 * route otherwise carried a static "Channel" label, so every channel shared one
 * breadcrumb and the browser tab only ever showed the app name.
 *
 * The `ChannelService` is root-provided, so the resolver reads it directly; the
 * page's component-scoped `ChannelsStore` is unreachable before activation. A
 * failed read falls back to a neutral label rather than blocking the route.
 *
 * Used as both a `title` resolver and a `breadcrumb` resolver.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @param {ActivatedRouteSnapshot} route - Activated route snapshot carrying `:channelId`.
 *
 * @returns {MaybeAsync<string>} The `#`-prefixed channel name, or a neutral fallback.
 */
export const channelTitleResolver: ResolveFn<string> = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<string> => {
  const channelService: ChannelService = inject(ChannelService);

  const channelId: string | null = route.paramMap.get('channelId');
  if (!channelId) return CHANNEL_TITLE_FALLBACK;

  return channelService.get(channelId).pipe(
    map((channel: ChannelOutput): string => `#${channel.name}`),
    catchError((): Observable<string> => of(CHANNEL_TITLE_FALLBACK)),
  );
};
