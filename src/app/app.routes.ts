import type { Routes } from '@angular/router';
import { withAccountMenu } from '@features/account';
import { withOrganizationNav, withOrganizationSwitcher } from '@features/organization';
import { DashboardLayout, provideDashboardLayoutSlots } from '@layouts/dashboard-layout';
import { FocusedLayout, provideFocusedLayoutSlots } from '@layouts/focused-layout';
import { provideSplitLayoutSlots, SplitLayout } from '@layouts/split-layout';
import {
  PlaceholderForm,
  withPlaceholderShowcase,
  withPlaceholderTools,
} from './layout-placeholder';

/**
 * Constant APP_ROUTES
 *
 * @description
 * Application root routes configuration: each shell on the URL it will keep.
 *
 * The dashboard shell is wired to real features — the organization switcher and
 * navigation, and the account menu — and mounts the organization route tree.
 * The split shell mounts the whole authentication workflow.
 *
 * Only `error` still carries **scaffolding** from `layout-placeholder.ts`: that
 * feature owns no `ui/` yet, and a shell route with no matching child cannot
 * activate at all. The split shell's showcase and the two header tool clusters
 * are scaffolding for the same reason. Replace each as its pages land.
 *
 * @since 1.0.0
 */
export const APP_ROUTES: Routes = [
  {
    path: 'auth',
    component: SplitLayout,
    providers: [
      provideSplitLayoutSlots({
        showcase: [withPlaceholderShowcase()],
        header: [withPlaceholderTools()],
      }),
    ],
    loadChildren: () => import('@features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'error',
    component: FocusedLayout,
    providers: [provideFocusedLayoutSlots({ header: [withPlaceholderTools()] })],
    children: [{ path: '**', component: PlaceholderForm }],
  },
  {
    path: '',
    component: DashboardLayout,
    providers: [
      provideDashboardLayoutSlots({
        sidebarHeader: [withOrganizationSwitcher()],
        sidebarNav: [withOrganizationNav()],
        sidebarFooter: [withAccountMenu()],
      }),
    ],
    children: [
      {
        path: 'organizations',
        loadChildren: () =>
          import('@features/organization/organization.routes').then((m) => m.ORGANIZATION_ROUTES),
      },
      { path: '', pathMatch: 'full', redirectTo: 'organizations' },
    ],
  },
];
