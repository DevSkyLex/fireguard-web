import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';

/**
 * Component FacilityEquipmentOverview
 * @class FacilityEquipmentOverview
 *
 * @description
 * Overview card summarizing the facility's equipment inventory as a set of
 * per-status progress bars. Reads previews from the component-scoped
 * {@link FacilityOverviewStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-equipment-overview',
  imports: [SkeletonModule],
  templateUrl: './facility-equipment-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityEquipmentOverview {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped overview store providing equipment previews.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityOverviewStore}
   */
  protected readonly store: InstanceType<typeof FacilityOverviewStore> =
    inject(FacilityOverviewStore);
  //#endregion
}
