import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButtonModule } from 'primeng/selectbutton';
import type { NotificationFilter } from '@core/models/notification';

interface TypeOption {
  label: string;
  value: NotificationFilter | null;
}

/**
 * Component NotificationBellFilter
 * @class NotificationBellFilter
 *
 * @description
 * Filter bar inside the notification bell popover allowing
 * the user to narrow notifications by category.
 * Emits the selected filter value whenever the selection changes.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-notification-bell-filter',
  imports: [SelectButtonModule, FormsModule],
  templateUrl: './notification-bell-filter.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellFilter {
  //#region Properties
  /**
   * Property options
   * @readonly
   *
   * @description
   * Static list of filter options rendered in the select-button.
   * The first entry (All) clears the active filter by emitting null.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {TypeOption[]}
   */
  protected readonly options: TypeOption[] = [
    { label: 'All', value: null },
    { label: 'System', value: { category: 'system' } },
    { label: 'Security', value: { category: 'security' } },
  ];
  //#endregion

  //#region Inputs
  /**
   * Input selectedValue
   * @readonly
   *
   * @description
   * Currently active filter value, kept in sync with the parent component
   * so the select-button reflects the correct selection on re-render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<NotificationFilter | null>}
   */
  public readonly selectedValue: InputSignal<NotificationFilter | null> =
    input<NotificationFilter | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Output filterChange
   * @readonly
   *
   * @description
   * Emitted when the user selects a different filter option.
   * The payload is the new filter value, or null when "All" is selected.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<NotificationFilter | null>}
   */
  public readonly filterChange: OutputEmitterRef<NotificationFilter | null> =
    output<NotificationFilter | null>();
  //#endregion
}
