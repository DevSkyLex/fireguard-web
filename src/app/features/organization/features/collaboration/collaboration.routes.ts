import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';

/**
 * Constant COLLABORATION_ROUTES
 *
 * @description
 * The direct-messages workspace, mounted under one organization.
 *
 * Master-detail rather than two sibling routes: the conversation list is the
 * parent and the open conversation its child, so moving between conversations
 * leaves the list alone rather than rebuilding and refetching it.
 *
 * The permission guard sits on the parent only. It re-runs on an organization
 * switch — the route params change and the router re-evaluates — and guarding
 * just the child would leave the list itself open to a member without messaging
 * access. Writing is a separate grant the guard does not check; the composer
 * gates on it independently.
 *
 * The child suppresses its breadcrumb because parent route data is inherited,
 * and without that it would render "Messages / Messages". The counterpart's
 * name cannot go there either — resolving it needs the whole conversation list
 * plus the member directory, which is more than a title resolver can ask for —
 * so it lives in the conversation's own header.
 *
 * @since 2.0.0
 */
export const COLLABORATION_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({
        permissions: [ORGANIZATION_PERMISSION.MESSAGING_READ],
      }),
    ],
    loadComponent: () =>
      import('./ui/pages/direct-messages-page/direct-messages-page.component').then(
        (m) => m.DirectMessagesPage,
      ),
    title: $localize`:@@route.messages:Messages`,
    data: { breadcrumb: $localize`:@@route.messages:Messages` },
    children: [
      {
        path: 'saved',
        loadComponent: () =>
          import('./ui/pages/saved-messages-page/saved-messages-page.component').then(
            (m) => m.SavedMessagesPage,
          ),
        title: $localize`:@@route.savedMessages:Saved messages`,
        data: { breadcrumb: false },
      },
      {
        path: ':conversationId',
        loadComponent: () =>
          import('./ui/pages/direct-conversation-page/direct-conversation-page.component').then(
            (m) => m.DirectConversationPage,
          ),
        data: { breadcrumb: false },
      },
    ],
  },
];
