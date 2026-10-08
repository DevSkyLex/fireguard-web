import type { Routes } from '@angular/router';
import { unsavedChangesGuard } from '@shared/unsaved-changes';
import { ProcurementStore } from './state';

/**
 * Constant PROCUREMENT_ROUTES
 *
 * @description
 * Organization guards procurement read; this owner preserves physical source context and drafts
 * within its workspace. Secondary reads begin only after browser rendering.
 *
 * @since unreleased
 *
 * @type {Routes}
 */
export const PROCUREMENT_ROUTES: Routes = [
  {
    path: '',
    providers: [ProcurementStore],
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () =>
      import('./ui/pages/procurement-page/procurement-page.component').then(
        (module) => module.ProcurementPage,
      ),
    title: $localize`:@@route.procurement:Purchasing and receipts`,
    data: { breadcrumb: false },
  },
];
