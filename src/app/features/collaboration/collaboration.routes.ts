import type { Routes } from '@angular/router';
import { channelTitleResolver } from '@features/collaboration/http/resolvers/channel-title';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';

/**
 * Constant COLLABORATION_ROUTES
 *
 * @description
 * Conversational destinations, mounted inside the workspace shell.
 *
 * A channel id doubles as its conversation id, so `channels/:channelId` needs
 * no separate lookup.
 *
 * @since 1.0.0
 */
export const COLLABORATION_ROUTES: Routes = [
  {
    path: 'channels/:channelId',
    canActivate: [
      organizationPermissionGuard({
        permissions: [ORGANIZATION_PERMISSION.MESSAGING_READ],
      }),
    ],
    loadComponent: () =>
      import('./ui/pages/channel-conversation/channel-conversation.component').then(
        (m) => m.ChannelConversationPage,
      ),
    resolve: { breadcrumb: channelTitleResolver },
    title: channelTitleResolver,
  },
  {
    path: 'direct/:conversationId',
    canActivate: [
      organizationPermissionGuard({
        permissions: [ORGANIZATION_PERMISSION.MESSAGING_READ],
      }),
    ],
    loadComponent: () =>
      import('./ui/pages/direct-conversation/direct-conversation.component').then(
        (m) => m.DirectConversationPage,
      ),
    // The counterpart's name lives in the in-column header, not the breadcrumb:
    // a direct conversation has no subject label, so a title resolver would
    // need the whole list plus the member directory. A static crumb is honest.
    title: $localize`:@@route.direct:Direct message`,
    data: { breadcrumb: $localize`:@@route.direct:Direct message` },
  },
  {
    path: 'saved',
    canActivate: [
      organizationPermissionGuard({
        permissions: [ORGANIZATION_PERMISSION.MESSAGING_READ],
      }),
    ],
    loadComponent: () =>
      import('./ui/pages/saved-messages/saved-messages.component').then((m) => m.SavedMessagesPage),
    title: $localize`:@@route.saved:Saved`,
    data: { breadcrumb: $localize`:@@route.saved:Saved` },
  },
];
