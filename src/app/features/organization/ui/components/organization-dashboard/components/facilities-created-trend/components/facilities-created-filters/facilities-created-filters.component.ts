import { ChangeDetectionStrategy, Component, computed, effect, inject, type Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TrendBaseFiltersForm } from '@features/organization/ui/components/organization-dashboard/forms';
import { OrganizationDashboardFacilitiesCreatedStore } from '@features/organization/state/organization-dashboard';
import type { FacilityTypeOption } from '@features/organization/ui/components/organization-dashboard/models';
import { FACILITY_TYPE_OPTIONS } from '@features/organization/ui/components/organization-dashboard/options';
import { SelectModule } from 'primeng/select';

/**
 * Type FacilitiesCreatedFiltersForm
 *
 * @description
 * Typed reactive controls used by the facilities-created draft filter form.
 *
 * @since 2.1.0
 */
type FacilitiesCreatedFiltersForm = {
  facilityType: FormControl<FacilityTypeOption['value'] | null>;
};

/**
 * Component FacilitiesCreatedFilters
 * @class FacilitiesCreatedFilters
 *
 * @description
 * Drawer filter form for the facilities-created trend card.
 * All draft filter state is read and mutated directly through
 * {@link OrganizationDashboardFacilitiesCreatedStore}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facilities-created-filters',
  templateUrl: './facilities-created-filters.component.html',
  imports: [ReactiveFormsModule, SelectModule, TrendBaseFiltersForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilitiesCreatedFilters {
  //#region Properties

  /**
   * Property store
   * @readonly
   *
   * @description
  * Component-scoped store used to read and mutate all draft filter selections.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationDashboardFacilitiesCreatedStore}
   */
  protected readonly store: OrganizationDashboardFacilitiesCreatedStore =
    inject<OrganizationDashboardFacilitiesCreatedStore>(OrganizationDashboardFacilitiesCreatedStore);

  /**
   * Property form
   * @readonly
   *
   * @description
   * Typed reactive form group for facilities-created-specific draft filters.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {FormGroup<FacilitiesCreatedFiltersForm>}
   */
  protected readonly form: FormGroup<FacilitiesCreatedFiltersForm> =
    new FormGroup<FacilitiesCreatedFiltersForm>({
      facilityType: new FormControl<FacilityTypeOption['value'] | null>(null),
    });

  /**
   * Property facilityTypeOptions
   * @readonly
   *
   * @description
   * Available facility type filter options rendered in the select.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {FacilityTypeOption[]}
   */
  protected readonly facilityTypeOptions: FacilityTypeOption[] = [...FACILITY_TYPE_OPTIONS];

  /**
   * Property selectedFacilityTypeOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected facility type, or `null` when
   * cleared. Used by the `#selectedItem` template to render the icon.
   *
   * @since 2.0.0
   *
   * @access public
   * @type {Signal<FacilityTypeOption | null>}
   */
  public readonly selectedFacilityTypeOption: Signal<FacilityTypeOption | null> =
    computed<FacilityTypeOption | null>(
      () => FACILITY_TYPE_OPTIONS.find((o) => o.value === this.store.draftFacilityType()) ?? null,
    );

  //#endregion

  //#region Constructor

  /**
   * @constructor
   *
   * @description
   * Synchronises the reactive controls with the dashboard draft state.
   *
   * @access public
   * @since 2.1.0
   */
  public constructor() {
    this.form.controls.facilityType.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((facilityType: FacilityTypeOption['value'] | null): void => {
        this.store.setDraftFacilityType(facilityType);
      });

    effect((): void => {
      this.form.patchValue(
        {
          facilityType: this.store.draftFacilityType(),
        },
        { emitEvent: false },
      );
    });
  }

  //#endregion
}
