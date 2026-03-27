import {
  ChangeDetectionStrategy,
  Component,
  input,
  type InputSignal,
} from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import type { OverviewFocusBoardItem } from '../../organization-overview.types';

/**
 * Component OrganizationOverviewFocusBoardComponent
 * @class OrganizationOverviewFocusBoardComponent
 *
 * @description
 * Presentational card rendering the short list of notable overview
 * insights highlighted by the parent container.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview-focus-board',
  host: {
    style: 'display: block',
  },
  imports: [
    CardModule,
    TagModule,
  ],
  templateUrl: './organization-overview-focus-board.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewFocusBoardComponent {
  //#region Inputs
  /**
   * Input items
   * @readonly
   *
   * @description
   * Highlight items rendered in the focus board.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly OverviewFocusBoardItem[]>}
   */
  public readonly items: InputSignal<readonly OverviewFocusBoardItem[]> =
    input.required<readonly OverviewFocusBoardItem[]>();
  //#endregion
}
