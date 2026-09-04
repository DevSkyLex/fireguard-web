import { computed, inject, type Provider } from '@angular/core';
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
import { ChannelsStore } from '../../state';
import { ChannelsPanel } from '../../ui/components/channels-panel';

/**
 * Function withChannelsSidebarExtension
 * @function withChannelsSidebarExtension
 *
 * @description
 * Supplies the channel tree next to the primary sidebar on channel routes.
 * Below desktop width, the index shows this list and child routes show the main
 * content instead. Requires provideChannelsWorkspace() in the shell route.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {SlotFeature<SidebarExtensionContribution>} Exclusive extension factory.
 */
export function withChannelsSidebarExtension(): SlotFeature<SidebarExtensionContribution> {
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
        () => `/organizations/${context.selectedOrganizationId() ?? ''}/channels`,
      );

      return {
        id: 'channels',
        priority: 20,
        component: ChannelsPanel,
        label: $localize`:@@route.channels:Channels`,
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

/**
 * Function provideChannelsWorkspace
 * @function provideChannelsWorkspace
 *
 * @description
 * Shares channel state between the sidebar extension and routed conversations.
 * The dashboard route owns its lifetime; collaboration owns loading and commands.
 *
 * @access public
 * @since 1.0.0
 *
 * @returns {Provider[]} Providers for the dashboard route injector.
 */
export function provideChannelsWorkspace(): Provider[] {
  return [ChannelsStore];
}
