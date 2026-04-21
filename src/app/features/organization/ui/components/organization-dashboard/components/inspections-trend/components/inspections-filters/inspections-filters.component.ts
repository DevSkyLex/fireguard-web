import { ChangeDetectionStrategy, Component, computed, effect, inject, type Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TrendBaseFiltersForm } from '@features/organization/ui/components/organization-dashboard/forms';
import { OrganizationDashboardInspectionsTrendStore } from '@features/organization/state/organization-dashboard';
import type {
  InspectionResultOption,
  InspectionStatusOption,
  InspectorTypeOption,
} from '@features/organization/ui/components/organization-dashboard/models';
import {
  INSPECTION_RESULT_OPTIONS,
  INSPECTION_STATUS_OPTIONS,
  INSPECTOR_TYPE_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';
import { SelectModule } from 'primeng/select';

/**
 * Type InspectionsFiltersForm
 *
 * @description
 * Typed reactive controls used by the inspections draft filter form.
 *
 * @since 2.1.0
 */
type InspectionsFiltersForm = {
  inspectionStatus: FormControl<InspectionStatusOption['value'] | null>;
  inspectionResult: FormControl<InspectionResultOption['value'] | null>;
  inspectorType: FormControl<InspectorTypeOption['value'] | null>;
};

/**
 * Component InspectionsFilters
 * @class InspectionsFilters
 *
 * @description
 * Drawer filter form for the inspections trend card.
 * All draft filter state is read and mutated directly through
 * {@link OrganizationDashboardInspectionsTrendStore}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspections-filters',
  templateUrl: './inspections-filters.component.html',
  imports: [ReactiveFormsModule, SelectModule, TrendBaseFiltersForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionsFilters {
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
   * @type {OrganizationDashboardInspectionsTrendStore}
   */
  protected readonly store: OrganizationDashboardInspectionsTrendStore =
    inject<OrganizationDashboardInspectionsTrendStore>(OrganizationDashboardInspectionsTrendStore);

  /**
   * Property form
   * @readonly
   *
   * @description
   * Typed reactive form group for inspections-specific draft filters.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {FormGroup<InspectionsFiltersForm>}
   */
  protected readonly form: FormGroup<InspectionsFiltersForm> = new FormGroup<InspectionsFiltersForm>({
    inspectionStatus: new FormControl<InspectionStatusOption['value'] | null>(null),
    inspectionResult: new FormControl<InspectionResultOption['value'] | null>(null),
    inspectorType: new FormControl<InspectorTypeOption['value'] | null>(null),
  });

  /**
   * Property inspectionStatusOptions
   * @readonly
   *
   * @description
   * Available inspection status filter options rendered in the first select.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {InspectionStatusOption[]}
   */
  protected readonly inspectionStatusOptions: InspectionStatusOption[] = [
    ...INSPECTION_STATUS_OPTIONS,
  ];

  /**
   * Property inspectionResultOptions
   * @readonly
   *
   * @description
   * Available inspection result filter options rendered in the second select.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {InspectionResultOption[]}
   */
  protected readonly inspectionResultOptions: InspectionResultOption[] = [
    ...INSPECTION_RESULT_OPTIONS,
  ];

  /**
   * Property inspectorTypeOptions
   * @readonly
   *
   * @description
   * Available inspector-type filter options rendered in the third select.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {InspectorTypeOption[]}
   */
  protected readonly inspectorTypeOptions: InspectorTypeOption[] = [...INSPECTOR_TYPE_OPTIONS];

  /**
   * Property selectedInspectionStatusOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected inspection status, or `null` when
   * cleared. Used by the `#selectedItem` template to render icon and colour.
   *
   * @since 2.0.0
   *
   * @access public
   * @type {Signal<InspectionStatusOption | null>}
   */
  public readonly selectedInspectionStatusOption: Signal<InspectionStatusOption | null> =
    computed<InspectionStatusOption | null>(
      () =>
        INSPECTION_STATUS_OPTIONS.find(
          (o) => o.value === this.store.draftInspectionStatus(),
        ) ?? null,
    );

  /**
   * Property selectedInspectionResultOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected inspection result, or `null` when
   * cleared. Used by the `#selectedItem` template to render icon and colour.
   *
   * @since 2.0.0
   *
   * @access public
   * @type {Signal<InspectionResultOption | null>}
   */
  public readonly selectedInspectionResultOption: Signal<InspectionResultOption | null> =
    computed<InspectionResultOption | null>(
      () =>
        INSPECTION_RESULT_OPTIONS.find(
          (o) => o.value === this.store.draftInspectionResult(),
        ) ?? null,
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
    this.form.controls.inspectionStatus.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((inspectionStatus: InspectionStatusOption['value'] | null): void => {
        this.store.setDraftInspectionStatus(inspectionStatus);
      });

    this.form.controls.inspectionResult.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((inspectionResult: InspectionResultOption['value'] | null): void => {
        this.store.setDraftInspectionResult(inspectionResult);
      });

    this.form.controls.inspectorType.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((inspectorType: InspectorTypeOption['value'] | null): void => {
        this.store.setDraftInspectorType(inspectorType);
      });

    effect((): void => {
      this.form.patchValue(
        {
          inspectionStatus: this.store.draftInspectionStatus(),
          inspectionResult: this.store.draftInspectionResult(),
          inspectorType: this.store.draftInspectorType(),
        },
        { emitEvent: false },
      );
    });
  }

  //#endregion
}
