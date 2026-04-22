import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, OutputEmitterRef, type InputSignal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { OrganizationDashboardGranularity } from '@features/organization/models';
import { OrganizationDashboardFacilitiesCreatedStore } from '@features/organization/state/organization-dashboard';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { SelectModule } from 'primeng/select';

/**
 * Component FacilitiesCreatedToolbar
 * @class FacilitiesCreatedToolbar
 *
 * @description
 * Action bar for the facilities-created trend card.
 * Reads granularity state directly from
 * {@link OrganizationDashboardFacilitiesCreatedStore} and dispatches updates
 * without intermediate inputs, only propagating the overflow-menu trigger
 * to the parent via {@link menuToggle}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facilities-created-toolbar',
  templateUrl: './facilities-created-toolbar.component.html',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputGroupModule,
    InputGroupAddonModule,
    OverlayBadgeModule,
    SelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilitiesCreatedToolbar {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store providing granularity state and the
   * {@link OrganizationDashboardFacilitiesCreatedStore.setGranularity} mutation.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationDashboardFacilitiesCreatedStore}
   */
  protected readonly store: OrganizationDashboardFacilitiesCreatedStore =
    inject<OrganizationDashboardFacilitiesCreatedStore>(OrganizationDashboardFacilitiesCreatedStore);

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

  /**
   * Property activeFilterCount
   * @readonly
   *
   * @description
   * Number of currently applied filters displayed on the Filters button.
   *
   * @access public
   * @since 2.2.0
   *
   * @type {InputSignal<number>}
   */
  public readonly activeFilterCount: InputSignal<number> = input<number>(0);

  /**
   * Property filtersAvailable
   * @readonly
   *
   * @description
   * Controls whether the filter drawer can be opened from this toolbar.
   *
   * @access public
   * @since 2.2.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly filtersAvailable: InputSignal<boolean> = input<boolean>(true);

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
   * Creates an instance of FacilitiesCreatedToolbar.
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
