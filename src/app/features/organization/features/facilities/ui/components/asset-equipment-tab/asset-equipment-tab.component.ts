import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  PLATFORM_ID,
  signal,
  type InputSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import type { RequestOptions } from '@core/api';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { FacilityEquipmentTable } from '@features/organization/features/facilities/ui/tables';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Component AssetEquipmentTab
 * @class AssetEquipmentTab
 *
 * @description
 * The estate's equipment, at either scope: one site's when `facilityId` is
 * given, the whole organization's when it is not.
 *
 * The same pane therefore serves the facility record and both axes of the
 * assets explorer — browsing a site, or searching every serial number in the
 * organization — instead of a second copy of the same orchestration.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-asset-equipment-tab',
  imports: [FacilityEquipmentTable],
  providers: [EquipmentStore],
  templateUrl: './asset-equipment-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetEquipmentTab {
  //#region Inputs
  /**
   * Input facilityId
   * @readonly
   *
   * @description
   * Site to scope the equipment to. Left out, the pane covers the whole
   * organization — which is what the explorer's flat axis is for.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly facilityId: InputSignal<string | undefined> = input<string>();
  //#endregion

  //#region Properties
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  private readonly router: Router = inject<Router>(Router);

  private readonly platformId: object = inject<object>(PLATFORM_ID);

  protected readonly store: EquipmentStore = inject<EquipmentStore>(EquipmentStore);

  protected readonly page = signal<number>(1);
  //#endregion

  //#region Methods
  protected onAdd(): void {
    const facilityId: string | undefined = this.facilityId();

    void this.router.navigate(this.equipmentPath('create'), {
      queryParams: facilityId ? { facilityId } : undefined,
    });
  }

  protected onView(equipment: EquipmentOutput): void {
    void this.router.navigate(this.equipmentPath(equipment.id));
  }

  protected onEdit(equipment: EquipmentOutput): void {
    void this.router.navigate(this.equipmentPath(equipment.id, 'edit'));
  }

  /**
   * Method equipmentPath
   *
   * @description
   * Absolute path into the equipments subfeature.
   *
   * Absolute on purpose: this pane is hosted both by the facility record, two
   * segments deep, and by the assets explorer, one — a relative `../..` meant
   * the right destination from one host and a dead URL from the other.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {...string} segments - Segments below `equipments`.
   * @returns {readonly string[]} Router commands.
   */
  private equipmentPath(...segments: readonly string[]): readonly string[] {
    const organizationId: string | null = this.activeOrganizationStore.selectedOrganizationId();

    return ['/organizations', organizationId ?? '', 'equipments', ...segments];
  }

  protected onLoad(options: RequestOptions): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const organizationId: string | null = this.activeOrganizationStore.selectedOrganizationId();
    if (!organizationId) return;

    const facilityId: string | undefined = this.facilityId();

    this.store.load({
      organizationId,
      options: {
        ...options,
        params: facilityId ? { ...options.params, facilityId } : options.params,
      },
    });
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
  }
  //#endregion
}
