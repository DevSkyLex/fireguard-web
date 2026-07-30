import { DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { TagModule } from 'primeng/tag';
import {
  resolveFacilityTag,
  type FacilityOutput,
} from '@features/organization/features/facilities/models';
import { type TagDescriptor } from '@shared/tag';

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
  imports: [DatePipe, TitleCasePipe, TagModule],
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
   * Resolves the facility status badge descriptor from the shared facility tag
   * registry so status carries a label and icon, never colour alone.
   *
   * @param {FacilityOutput['status']} status - Facility lifecycle status.
   * @returns {TagDescriptor} Matching status descriptor.
   */
  protected statusDescriptor(status: FacilityOutput['status']): TagDescriptor {
    return resolveFacilityTag('status', status);
  }
  //#endregion
}
