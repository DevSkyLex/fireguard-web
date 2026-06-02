import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  type InputSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { RequestOptions } from '@core/services/hydra-api';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { EquipmentTable } from '@features/organization/features/equipments/ui/tables';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Component FacilityEquipmentTab
 * @class FacilityEquipmentTab
 *
 * @description
 * Tab content component that displays equipment assigned to a
 * facility. Provides its own {@link EquipmentStore} instance and
 * loads equipment filtered by the given `facilityId`.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-equipment-tab',
  imports: [EquipmentTable],
  providers: [EquipmentStore],
  templateUrl: './facility-equipment-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityEquipmentTab {
  //#region Inputs
  /**
   * Input facilityId
   * @readonly
   *
   * @description
   * The facility ID to filter equipment by.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly facilityId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  private readonly router: Router = inject<Router>(Router);

  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  protected readonly store: EquipmentStore = inject<EquipmentStore>(EquipmentStore);

  protected readonly page = signal<number>(1);
  //#endregion

  //#region Methods
  protected onAdd(): void {
    this.router.navigate(['..', '..', 'equipments', 'create'], {
      relativeTo: this.route,
      queryParams: { facilityId: this.facilityId() },
    });
  }

  protected onLoad(options: RequestOptions): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    const facilityId: string = this.facilityId();

    if (organizationId && facilityId) {
      this.store.load({
        organizationId,
        options: {
          ...options,
          params: {
            ...(options.params ?? {}),
            facilityId,
          },
        },
      });
    }
  }

  protected onPageChange(page: number): void {
    this.page.set(page);
  }
  //#endregion
}
