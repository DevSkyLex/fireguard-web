import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { unsavedChangesGuard } from '@shared/unsaved-changes';
/**
 * Constant INVENTORY_ROUTES
 *
 * @description
 * All stock sections share organization read access; actions require their dedicated permission.
 */
export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    canActivate: [
      organizationPermissionGuard({ permissions: [ORGANIZATION_PERMISSION.INVENTORY_READ] }),
    ],
    data: { breadcrumb: $localize`:@@inventory.title:Inventory` },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'balances' },
      ...(['balances', 'parts', 'warehouses', 'consumptions', 'movements'] as const).map(
        (section) => ({
          path: section,
          canDeactivate: [unsavedChangesGuard],
          loadComponent: () =>
            import('./ui/pages/inventory-page/inventory-page.component').then(
              (module) => module.InventoryPage,
            ),
          title:
            section === 'balances'
              ? $localize`:@@inventory.section.balances:Stock`
              : section === 'parts'
                ? $localize`:@@inventory.section.parts:Parts and consumables`
                : section === 'warehouses'
                  ? $localize`:@@inventory.section.warehouses:Warehouses`
                  : section === 'consumptions'
                    ? $localize`:@@inventory.section.consumptions:Consumption declarations`
                    : $localize`:@@inventory.section.movements:Movement history`,
          data: { section, breadcrumb: false },
        }),
      ),
    ],
  },
];
