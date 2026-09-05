import { computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { matchesOrganizationPermission } from '@features/organization/navigation';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';
import type { SidebarExtensionContribution } from '@layouts/dashboard-layout';
import type { SlotFeature } from '@shared/layout-slot';
import { DirectMessagesPanel } from '../../ui/components/direct-messages-panel';

/**
 * Function withDirectMessagesSidebarExtension
 * @function withDirectMessagesSidebarExtension
 *
 * @description
 * Supplies the conversation list next to the primary sidebar on messaging routes.
 * Below desktop width, the index shows this list and child routes show the main
 * content instead. Route state and permission decisions stay with collaboration.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {SlotFeature<SidebarExtensionContribution>} Exclusive extension factory.
 */
export function withDirectMessagesSidebarExtension(): SlotFeature<SidebarExtensionContribution> {
  return {
    useFactory: () => {
      const router = inject(Router);
      const context = inject(ORGANIZATION_CONTEXT_PORT);
      const access = inject(ORGANIZATION_MEMBER_ACCESS_PORT);
      const url = toSignal(
        router.events.pipe(
          filter((event): event is NavigationEnd => event instanceof NavigationEnd),
          map((event) => event.urlAfterRedirects),
        ),
        { initialValue: router.url },
      );
      const path = computed(() => url().split(/[?#]/)[0]?.replace(/\/$/, '') ?? '');
      const base = computed(
        () => `/organizations/${context.selectedOrganizationId() ?? ''}/messages`,
      );

      return {
        id: 'direct-messages',
        priority: 20,
        component: DirectMessagesPanel,
        label: $localize`:@@route.messages:Messages`,
        contentPadding: false,
        active: computed(
          () =>
            context.selectedOrganizationId() !== null &&
            access
              .permissions()
              .some((grant) =>
                matchesOrganizationPermission(grant, ORGANIZATION_PERMISSION.MESSAGING_READ),
              ) &&
            (path() === base() || path().startsWith(base() + '/')),
        ),
        mobileVisible: computed(() => path() === base()),
      };
    },
  };
}
