import { ChangeDetectionStrategy, Component, inject, output, OutputEmitterRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrganizationDashboardAssetGrowthStore as AssetGrowthTrendStore } from '@features/organization/state/organization-dashboard';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectModule } from 'primeng/select';

/**
 * Component AssetGrowthToolbar
 * @class AssetGrowthToolbar
 *
 * @description
 * Action bar for the asset-growth trend card.
 * Reads granularity state directly from
 * {@link AssetGrowthTrendStore} and dispatches updates
 * without intermediate inputs, only propagating the overflow-menu trigger
 * to the parent via {@link menuToggle}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-asset-growth-toolbar',
  templateUrl: './asset-growth-toolbar.component.html',
  imports: [
    FormsModule,
    ButtonModule,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetGrowthToolbar {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store providing granularity state and the
   * {@link AssetGrowthTrendStore.setGranularity} mutation.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {AssetGrowthTrendStore}
   */
  protected readonly store: AssetGrowthTrendStore =
    inject<AssetGrowthTrendStore>(AssetGrowthTrendStore);

  //#endregion

  //#region Events

  /**
   * Event menuToggle
   *
   * @description
   * Emitted when the user clicks the overflow-menu button.
   * The parent card is responsible for toggling its popup menu instance.
   *
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<MouseEvent>}
   */
  readonly menuToggle: OutputEmitterRef<MouseEvent> = output<MouseEvent>();

  //#endregion
}
