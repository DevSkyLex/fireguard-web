import type { Routes } from '@angular/router';
import { organizationPermissionGuard } from '@features/organization/http/guards';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { unsavedChangesGuard } from '@shared/unsaved-changes';

/**
 * Constant SECTION_TITLES
 *
 * @description
 * Localized route titles for each quantitative inventory section.
 */
const SECTION_TITLES = {
  balances: $localize`:@@inventory.section.balances:Stock`,
  parts: $localize`:@@inventory.section.parts:Parts and consumables`,
  warehouses: $localize`:@@inventory.section.warehouses:Warehouses`,
  consumptions: $localize`:@@inventory.section.consumptions:Consumption declarations`,
  movements: $localize`:@@inventory.section.movements:Movement history`,
};
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
          title: SECTION_TITLES[section],
          data: { section, breadcrumb: false },
        }),
      ),
    ],
  },
];
