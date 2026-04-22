import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { OrganizationDashboardNonConformitiesOpenedStore } from '@features/organization/state/organization-dashboard';
import { TrendBaseFiltersForm } from '@features/organization/ui/components/organization-dashboard/forms';
import type {
  NonConformityStatusOption,
  NonConformitySeverityOption,
} from '@features/organization/ui/components/organization-dashboard/models';
import {
  NON_CONFORMITY_SEVERITY_OPTIONS,
  NON_CONFORMITY_STATUS_OPTIONS,
} from '@features/organization/ui/components/organization-dashboard/options';

/**
 * Type NonConformitiesOpenedFiltersForm
 *
 * @description
 * Typed reactive controls used by the opened non-conformities draft filter form.
 *
 * @since 2.1.0
 */
type NonConformitiesOpenedFiltersForm = {
  nonConformityStatus: FormControl<NonConformityStatusOption['value'] | null>;
  nonConformitySeverity: FormControl<NonConformitySeverityOption['value'] | null>;
};

/**
 * Component NonConformitiesOpenedFilters
 * @class NonConformitiesOpenedFilters
 *
 * @description
 * Drawer filter form for the non-conformities-opened trend card.
 * All draft filter state is read and mutated directly through
 * {@link OrganizationDashboardNonConformitiesOpenedStore}.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-non-conformities-opened-filters',
  templateUrl: './non-conformities-opened-filters.component.html',
  imports: [ReactiveFormsModule, SelectModule, TrendBaseFiltersForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformitiesOpenedFilters {
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
   * @type {OrganizationDashboardNonConformitiesOpenedStore}
   */
  protected readonly store: OrganizationDashboardNonConformitiesOpenedStore =
    inject<OrganizationDashboardNonConformitiesOpenedStore>(
      OrganizationDashboardNonConformitiesOpenedStore,
    );

  /**
   * Property form
   * @readonly
   *
   * @description
   * Typed reactive form group for opened non-conformity draft filters.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {FormGroup<NonConformitiesOpenedFiltersForm>}
   */
  protected readonly form: FormGroup<NonConformitiesOpenedFiltersForm> =
    new FormGroup<NonConformitiesOpenedFiltersForm>({
      nonConformityStatus: new FormControl<NonConformityStatusOption['value'] | null>(null),
      nonConformitySeverity: new FormControl<NonConformitySeverityOption['value'] | null>(null),
    });

  /**
   * Property nonConformityStatusOptions
   * @readonly
   *
   * @description
   * Available non-conformity status filter options rendered in the first select.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {NonConformityStatusOption[]}
   */
  protected readonly nonConformityStatusOptions: NonConformityStatusOption[] = [
    ...NON_CONFORMITY_STATUS_OPTIONS,
  ];

  /**
   * Property nonConformitySeverityOptions
   * @readonly
   *
   * @description
   * Available non-conformity severity filter options rendered in the second select.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {NonConformitySeverityOption[]}
   */
  protected readonly nonConformitySeverityOptions: NonConformitySeverityOption[] = [
    ...NON_CONFORMITY_SEVERITY_OPTIONS,
  ];

  /**
   * Property selectedNonConformityStatusOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected non-conformity status, or `null` when
   * cleared. Used by the `#selectedItem` template to render icon and colour.
   *
   * @since 2.0.0
   *
   * @access public
   * @type {Signal<NonConformityStatusOption | null>}
   */
  public readonly selectedNonConformityStatusOption: Signal<NonConformityStatusOption | null> =
    computed<NonConformityStatusOption | null>(
      () =>
        NON_CONFORMITY_STATUS_OPTIONS.find(
          (o) => o.value === this.store.draftNonConformityStatus(),
        ) ?? null,
    );

  /**
   * Property selectedSeverityOption
   * @readonly
   *
   * @description
   * Full option object for the currently selected severity, or `null` when
   * cleared. Used by the `#selectedItem` template to render the colour swatch.
   *
   * @since 2.0.0
   *
   * @access public
   * @type {Signal<NonConformitySeverityOption | null>}
   */
  public readonly selectedSeverityOption: Signal<NonConformitySeverityOption | null> =
    computed<NonConformitySeverityOption | null>(
      () =>
        NON_CONFORMITY_SEVERITY_OPTIONS.find(
          (o) => o.value === this.store.draftNonConformitySeverity(),
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
    this.form.controls.nonConformityStatus.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((nonConformityStatus: NonConformityStatusOption['value'] | null): void => {
        this.store.setDraftNonConformityStatus(nonConformityStatus);
      });

    this.form.controls.nonConformitySeverity.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((nonConformitySeverity: NonConformitySeverityOption['value'] | null): void => {
        this.store.setDraftNonConformitySeverity(nonConformitySeverity);
      });

    effect((): void => {
      this.form.patchValue(
        {
          nonConformityStatus: this.store.draftNonConformityStatus(),
          nonConformitySeverity: this.store.draftNonConformitySeverity(),
        },
        { emitEvent: false },
      );
    });
  }

  //#endregion
}
