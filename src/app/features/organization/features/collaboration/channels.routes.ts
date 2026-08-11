import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { channelTitleResolver } from './http/resolvers/channel-title';

/**
 * Constant CHANNEL_ROUTES
 *
 * @description
 * The channels workspace, mounted under one organization.
 *
 * Master-detail, mirroring `COLLABORATION_ROUTES`: the channel list is the
 * parent and the open channel its child, so moving between channels leaves
 * the list alone rather than rebuilding and refetching it.
 *
 * The permission guard sits on the parent only. It re-runs on an organization
 * switch — the route params change and the router re-evaluates — and
 * guarding just the child would leave the list itself open to a member
 * without messaging access. Writing, and channel administration, are
 * separate grants the guard does not check; the composer and the
 * administration surfaces gate on them independently.
 *
 * Unlike the direct-messages child, this one does not suppress its
 * breadcrumb: `channelTitleResolver` can resolve `#name` from `:channelId`
 * alone, which a direct conversation's counterpart cannot — that needs the
 * whole conversation list plus the member directory. Declaring it only as
 * `title` is deliberate rather than incomplete — `BreadcrumbService` falls
 * back to the resolved route title when no `data.breadcrumb` or
 * `resolve.breadcrumb` is present, so repeating it under `resolve.breadcrumb`
 * would fetch the same channel twice per navigation for no gain.
 *
 * @since 1.0.0
 */
export const CHANNEL_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({
        permissions: [ORGANIZATION_PERMISSION.MESSAGING_READ],
      }),
    ],
    loadComponent: () =>
      import('./ui/pages/channels-page/channels-page.component').then((m) => m.ChannelsPage),
    title: $localize`:@@route.channels:Channels`,
    data: { breadcrumb: $localize`:@@route.channels:Channels` },
    children: [
      {
        path: ':channelId',
        loadComponent: () =>
          import('./ui/pages/channel-conversation-page/channel-conversation-page.component').then(
            (m) => m.ChannelConversationPage,
          ),
        title: channelTitleResolver,
      },
    ],
  },
];
