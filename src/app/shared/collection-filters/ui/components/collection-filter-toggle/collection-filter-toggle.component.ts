import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideListFilter } from '@ng-icons/lucide';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';

/**
 * Component CollectionFilterToggle
 * @class CollectionFilterToggle
 *
 * @description
 * The toolbar button that shows or hides a collection page's
 * `app-collection-filter-bar`, carrying the active-filter count as a badge —
 * the same accessible-name shape the popover trigger it replaces once used.
 * Presentational (`ARCHITECTURE.md` §10.3): it never decides whether the bar
 * is mounted, it only reports {@link visible}'s next value through
 * {@link visibleChange}; the owning page mounts or unmounts the bar itself,
 * typically seeded by `initialCollectionFilterBarVisibility`
 * (`@shared/collection-filters`) so a filtered URL never lands collapsed.
 * This is a pure show/hide toggle, distinct from the bar's own "+ Filter"
 * menu, which adds a field to the narrowing — the two are never confused.
 *
 * `aria-controls` targets the same `<prefix>-filter-bar` id the bar sets on
 * its own root from {@link testIdPrefix}, even while collapsed and therefore
 * absent from the DOM — the disclosure-button pattern every screen reader
 * this app supports already tolerates.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-filter-toggle',
  imports: [NgIcon, HlmBadge, HlmButton],
  providers: [provideIcons({ lucideListFilter })],
  templateUrl: './collection-filter-toggle.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionFilterToggle {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the bar is currently mounted below the toolbar.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input.required<boolean>();

  /**
   * Property activeCount
   * @readonly
   * @description How many narrowings are currently in force, rendered as a badge when positive.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly activeCount: InputSignal<number> = input<number>(0);

  /**
   * Property label
   * @readonly
   * @description The page-owned, localized button text.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property testIdPrefix
   * @readonly
   * @description The owning list page's `data-testid` prefix. The button's own `data-testid` is `<prefix>-filters-toggle`; `aria-controls` targets `<prefix>-filter-bar`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly testIdPrefix: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description Fires with the intended next {@link visible} value when the button is activated — the page owns whether the bar actually mounts.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();
  //#endregion

  //#region Properties
  /**
   * Property testId
   * @readonly
   * @description The `<prefix>-filters-toggle` `data-testid` value built from {@link testIdPrefix}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly testId: Signal<string> = computed<string>(
    () => `${this.testIdPrefix()}-filters-toggle`,
  );

  /**
   * Property controlsId
   * @readonly
   * @description The filter bar's own root id, built the same way `CollectionFilterBar` builds it from the same {@link testIdPrefix}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly controlsId: Signal<string> = computed<string>(
    () => `${this.testIdPrefix()}-filter-bar`,
  );
  //#endregion

  //#region Methods
  /**
   * Method toggle
   * @description Emits {@link visibleChange} with the opposite of the current {@link visible} value.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected toggle(): void {
    this.visibleChange.emit(!this.visible());
  }
  //#endregion
}
