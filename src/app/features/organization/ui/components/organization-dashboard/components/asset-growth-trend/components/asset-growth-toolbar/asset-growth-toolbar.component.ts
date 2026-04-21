import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, effect, inject, output, OutputEmitterRef } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OrganizationDashboardGranularity } from '@features/organization/models';
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
    ReactiveFormsModule,
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

  /**
   * Property granularityControl
   * @readonly
   *
   * @description
   * Typed reactive control mirroring the selected dashboard granularity.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {FormControl<OrganizationDashboardGranularity>}
   */
  protected readonly granularityControl: FormControl<OrganizationDashboardGranularity> =
    new FormControl<OrganizationDashboardGranularity>(this.store.selectedGranularity(), {
      nonNullable: true,
    });

  //#endregion

  //#region Events

  /**
   * Event filterToggle
   *
   * @description
   * Emitted when the user opens the filter drawer.
   *
    * @access public
   * @since 2.1.0
   *
   * @type {OutputEmitterRef<void>}
   */
    public readonly filterToggle: OutputEmitterRef<void> = output<void>();

  /**
   * Event menuToggle
   *
   * @description
   * Emitted when the user clicks the overflow-menu button.
   * The parent card is responsible for toggling its popup menu instance.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<MouseEvent>}
   */
  public readonly menuToggle: OutputEmitterRef<MouseEvent> = output<MouseEvent>();

  //#endregion

  //#region Lifecycle

  /**
   * Creates an instance of AssetGrowthToolbar.
   *
   * @description
   * Synchronizes the typed granularity control with the store state.
   *
   * @access public
   * @since 2.1.0
   */
  public constructor() {
    this.granularityControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((granularity: OrganizationDashboardGranularity) => {
        this.store.setGranularity(granularity);
      });

    effect(() => {
      this.granularityControl.setValue(this.store.selectedGranularity(), { emitEvent: false });
    });
  }

  //#endregion
}
