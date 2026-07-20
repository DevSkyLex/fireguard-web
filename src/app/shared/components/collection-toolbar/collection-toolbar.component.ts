import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { InputSignal, OutputEmitterRef } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';

/**
 * Component CollectionToolbar
 * @class CollectionToolbar
 *
 * @description
 * The bar the design system puts above every collection: a result count on the
 * left, then a search field and a Filters button on the right, with room for
 * the surface's own controls (a view switch, a create action).
 *
 * Presentational and domain-agnostic — it holds no query state. The count
 * arrives already formatted so pluralisation stays with the feature that owns
 * the noun, and the search value is a plain input/output pair so a page can
 * keep driving it from whatever it already uses (a `FormControl`, a signal).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-collection-toolbar
 *   [count]="countLabel()"
 *   [searchValue]="search()"
 *   [activeFilterCount]="activeFilters()"
 *   (searchChanged)="onSearch($event)"
 *   (filtersOpened)="openFilters()"
 * >
 *   <app-view-switch lead />
 *   <p-button label="New" icon="pi pi-plus" />
 * </app-collection-toolbar>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-toolbar',
  imports: [ButtonModule, IconFieldModule, InputIconModule, InputTextModule],
  templateUrl: './collection-toolbar.component.html',
  host: { class: 'flex flex-wrap items-center gap-3' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionToolbar {
  //#region Inputs
  /**
   * Property count
   * @readonly
   *
   * @description
   * Already-formatted result count ("11 interventions"). Empty hides the
   * label — pluralisation belongs to the calling feature, not here.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly count: InputSignal<string> = input<string>('');

  /**
   * Property searchValue
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly searchValue: InputSignal<string> = input<string>('');

  /**
   * Property searchPlaceholder
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly searchPlaceholder: InputSignal<string> = input<string>('');

  /**
   * Property searchAriaLabel
   * @readonly
   *
   * @description
   * Accessible name of the field. Falls back to the placeholder, which is not
   * a label on its own — it disappears as soon as the user types.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly searchAriaLabel: InputSignal<string> = input<string>('');

  /**
   * Property showSearch
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showSearch: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property showFilters
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showFilters: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property activeFilterCount
   * @readonly
   *
   * @description
   * How many filters are currently applied; a positive count badges the
   * button so an active filter is never invisible.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly activeFilterCount: InputSignal<number> = input<number>(0);
  //#endregion

  //#region Outputs
  /**
   * Property searchChanged
   * @readonly
   *
   * @description
   * Raw field value on every keystroke — debouncing stays with the page,
   * which owns the query pipeline.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly searchChanged: OutputEmitterRef<string> = output<string>();

  /**
   * Property filtersOpened
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly filtersOpened: OutputEmitterRef<void> = output<void>();
  //#endregion
}
