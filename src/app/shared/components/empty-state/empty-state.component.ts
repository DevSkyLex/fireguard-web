import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';

/**
 * Component EmptyState
 * @class EmptyState
 *
 * @description
 * Shared empty-state block used inside tables, dataviews, and panels
 * when a collection has no rows to display. Renders an icon, a title,
 * an optional description, and an optional projected action (button or
 * link) so every empty state teaches the next step instead of being a
 * dead end.
 *
 * @example ```html
 * <app-empty-state
 *   icon="pi-sitemap"
 *   title="No facilities yet"
 *   description="Create a new facility to get started."
 * >
 *   <p-button label="New facility" icon="pi pi-plus" (onClick)="add.emit()" />
 * </app-empty-state>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  //#region Properties
  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcons class (without the `pi` base class) rendered
   * above the title, e.g. `pi-sitemap`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly icon: InputSignal<string> = input.required<string>();

  /**
   * Property title
   * @readonly
   *
   * @description
   * Short headline describing the empty collection,
   * e.g. `No facilities yet`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> = input.required<string>();

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional supporting copy explaining how to populate the
   * collection or adjust the current filters.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly description: InputSignal<string | undefined> = input<string>();
  //#endregion
}
