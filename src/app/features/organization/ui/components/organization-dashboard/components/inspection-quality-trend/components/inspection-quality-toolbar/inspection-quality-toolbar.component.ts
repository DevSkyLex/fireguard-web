import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  OutputEmitterRef,
  type InputSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { SelectModule } from 'primeng/select';
import { OrganizationDashboardGranularity } from '@features/organization/models';
import { OrganizationDashboardInspectionQualityStore } from '@features/organization/state/organization-dashboard';

/**
 * Component InspectionQualityToolbar
 * @class InspectionQualityToolbar
 *
 * @description
 * Action bar for the inspection-quality trend card.
 * Reads granularity state directly from
 * {@link OrganizationDashboardInspectionQualityStore} and dispatches updates
 * without intermediate inputs, only propagating the overflow-menu trigger
 * to the parent via {@link menuToggle}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-quality-toolbar',
  templateUrl: './inspection-quality-toolbar.component.html',
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
export class InspectionQualityToolbar {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped store providing granularity state and the
   * {@link OrganizationDashboardInspectionQualityStore.setGranularity} mutation.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationDashboardInspectionQualityStore}
   */
  protected readonly store: OrganizationDashboardInspectionQualityStore =
    inject<OrganizationDashboardInspectionQualityStore>(
      OrganizationDashboardInspectionQualityStore,
    );

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
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<MouseEvent>}
   */
  public readonly menuToggle: OutputEmitterRef<MouseEvent> = output<MouseEvent>();

  //#endregion

  //#region Lifecycle

  /**
   * Creates an instance of InspectionQualityToolbar.
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
