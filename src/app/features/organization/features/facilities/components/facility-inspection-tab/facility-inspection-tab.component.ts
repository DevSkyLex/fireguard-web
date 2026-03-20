import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { ActiveOrganizationStore } from '@core/stores/organization';
import { InspectionStore } from '@core/stores/inspection';
import type { InspectionOutput, InspectionResult, InspectionStatus } from '@core/models/inspection';

/**
 * Component FacilityInspectionTab
 * @class FacilityInspectionTab
 *
 * @description
 * Tab content component that displays inspections associated
 * with a facility. Provides its own {@link InspectionStore}
 * instance and loads inspections filtered by the given
 * `facilityId`.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-inspection-tab',
  imports: [
    DatePipe,
    SkeletonModule,
  ],
  providers: [InspectionStore],
  templateUrl: './facility-inspection-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityInspectionTab {
  //#region Inputs
  /**
   * Input facilityId
   * @readonly
   *
   * @description
   * The facility ID to filter inspections by.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly facilityId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @description
   * Root-scoped store providing the current organization context.
   * Used to obtain the `organizationId` required by the store load.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped InspectionStore instance. Provided at this
   * component level so its lifecycle is tied to the tab's lifetime.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InspectionStore}
   */
  protected readonly store: InspectionStore =
    inject<InspectionStore>(InspectionStore);

  /**
   * Property inspections
   * @readonly
   *
   * @description
   * Flat list of inspections currently held in the store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ReadonlyArray<InspectionOutput>>}
   */
  protected readonly inspections: Signal<ReadonlyArray<InspectionOutput>> =
    computed<ReadonlyArray<InspectionOutput>>(() => this.store.inspections());

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * Whether the inspection list request is currently in-flight.
   * Used to toggle skeleton placeholders.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> =
    computed<boolean>(() => this.store.isLoadingInspections());

  /**
   * Property isEmpty
   * @readonly
   *
   * @description
   * Whether the inspection collection is empty and no request is
   * in-flight. Used to display the empty-state placeholder.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isEmpty: Signal<boolean> =
    computed<boolean>(() => this.store.isEmpty());

  /**
   * Property statusColors
   * @readonly
   *
   * @description
   * Maps each {@link InspectionStatus} to a Tailwind background
   * color class used for the status dot indicator.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Record<InspectionStatus, string>}
   */
  private readonly statusColors: Record<InspectionStatus, string> = {
    draft: 'bg-surface-400',
    submitted: 'bg-blue-500',
    closed: 'bg-green-500',
  };

  /**
   * Property statusLabels
   * @readonly
   *
   * @description
   * Maps each {@link InspectionStatus} to a human-readable label
   * displayed inside the status badge.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Record<InspectionStatus, string>}
   */
  private readonly statusLabels: Record<InspectionStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    closed: 'Closed',
  };

  /**
   * Property resultColors
   * @readonly
   *
   * @description
   * Maps each {@link InspectionResult} to a Tailwind background
   * color class used for the result dot indicator.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Record<InspectionResult, string>}
   */
  private readonly resultColors: Record<InspectionResult, string> = {
    pass: 'bg-green-500',
    fail: 'bg-red-500',
    partial: 'bg-orange-500',
  };

  /**
   * Property resultLabels
   * @readonly
   *
   * @description
   * Maps each {@link InspectionResult} to a human-readable label
   * displayed inside the result badge.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Record<InspectionResult, string>}
   */
  private readonly resultLabels: Record<InspectionResult, string> = {
    pass: 'Pass',
    fail: 'Fail',
    partial: 'Partial',
  };
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Sets up a reactive effect that reloads the inspection list
   * whenever `facilityId` or the current organisation changes.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      const facilityId: string = this.facilityId();
      const organizationId: string | undefined = this.activeOrganizationStore.selectedOrganization()?.id;
      if (organizationId && facilityId) {
        this.store.load({
          organizationId,
          options: { facilityId },
        });
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method getStatusColor
   * @method getStatusColor
   *
   * @description
   * Returns the Tailwind background class corresponding to the
   * given inspection status for use in dot indicators.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionStatus} status - The inspection status.
   *
   * @returns {string} A Tailwind `bg-*` class name.
   */
  protected getStatusColor(status: InspectionStatus): string {
    return this.statusColors[status];
  }

  /**
   * Method getStatusLabel
   * @method getStatusLabel
   *
   * @description
   * Returns a human-readable label for the given inspection status.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionStatus} status - The inspection status.
   *
   * @returns {string} A display-ready label string.
   */
  protected getStatusLabel(status: InspectionStatus): string {
    return this.statusLabels[status];
  }

  /**
   * Method getResultColor
   * @method getResultColor
   *
   * @description
   * Returns the Tailwind background class corresponding to the
   * given inspection result for use in dot indicators.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionResult} result - The inspection result.
   *
   * @returns {string} A Tailwind `bg-*` class name.
   */
  protected getResultColor(result: InspectionResult): string {
    return this.resultColors[result];
  }

  /**
   * Method getResultLabel
   * @method getResultLabel
   *
   * @description
   * Returns a human-readable label for the given inspection result.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionResult} result - The inspection result.
   *
   * @returns {string} A display-ready label string.
   */
  protected getResultLabel(result: InspectionResult): string {
    return this.resultLabels[result];
  }
  //#endregion
}
