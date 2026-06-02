import { DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import type { FacilityOutput } from '@features/organization/features/facilities/models';

/**
 * Component FacilityInformationPanel
 * @class FacilityInformationPanel
 *
 * @description
 * Presentational sidebar panel summarizing the facility's descriptive
 * attributes (type, status, code, address, creation date) on the detail
 * overview tab.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-information-panel',
  imports: [DatePipe, TitleCasePipe],
  templateUrl: './facility-information-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityInformationPanel {
  //#region Inputs
  /**
   * Property facility
   * @readonly
   *
   * @description
   * The facility whose information is displayed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<FacilityOutput>}
   */
  public readonly facility: InputSignal<FacilityOutput> = input.required<FacilityOutput>();
  //#endregion

  //#region Methods
  /**
   * Returns the Tailwind background token for the facility status dot.
   *
   * @param {FacilityOutput['status']} status - Facility lifecycle status.
   * @returns {string} Tailwind background color class.
   */
  protected getStatusDotClass(status: FacilityOutput['status']): string {
    return status === 'active' ? 'bg-green-500' : 'bg-orange-500';
  }
  //#endregion
}
