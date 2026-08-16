import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
  input,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { HlmSeparator } from '@shared/ui/separator';

/**
 * Component FilterChip
 * @class FilterChip
 *
 * @description
 * The Linear-style segmented shell one active list filter renders as: a
 * field segment (icon + label), a static "is" operator, the caller's own
 * value control projected in the middle, and a remove button — each segment
 * separated by a hairline `border-border`.
 *
 * The value segment is deliberately not this component's concern: it is
 * projected content, so a page composes whatever control the field needs
 * (an `hlm-select` with a plain label, or one rendering a feature's own tag
 * component) without this shell knowing about any feature's models. Usually
 * rendered by `CollectionFilterBar` (`@shared/collection-filters`), which
 * owns the chip row's order and the surrounding "+ Filter"/"Clear filters"
 * controls; a page composing its own bar-less chip row may still use it
 * directly.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-filter-chip
 *   fieldLabel="Status"
 *   icon="lucideCircleDot"
 *   testIdPrefix="interventions"
 *   [removeLabel]="removeFilterLabel('Status')"
 *   (removed)="applyFilter({ status: null })"
 * >
 *   <hlm-select ...>…</hlm-select>
 * </app-filter-chip>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-filter-chip',
  imports: [NgIcon, HlmSeparator],
  providers: [provideIcons({ lucideX })],
  templateUrl: './filter-chip.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterChip {
  //#region Inputs
  /**
   * Property fieldLabel
   * @readonly
   *
   * @description
   * The narrowed field's own name, shown on the chip's leading segment.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly fieldLabel: InputSignal<string> = input.required<string>();

  /**
   * Property icon
   * @readonly
   *
   * @description
   * The `ng-icon` name drawn beside {@link fieldLabel}. Must be registered by
   * an ancestor injector — this shell does not know in advance which names a
   * caller will pass, so it never provides them itself.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly icon: InputSignal<string> = input.required<string>();

  /**
   * Property removeLabel
   * @readonly
   *
   * @description
   * The remove button's accessible name — distinct per chip instance, so a
   * screen reader announces which filter a given button clears.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly removeLabel: InputSignal<string> = input.required<string>();

  /**
   * Property testIdPrefix
   * @readonly
   *
   * @description
   * The owning list page's `data-testid` prefix (e.g. `interventions`). The
   * chip carries `<prefix>-filter-chip`, its remove button
   * `<prefix>-filter-chip-remove`.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly testIdPrefix: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Outputs
  /**
   * Property removed
   * @readonly
   *
   * @description
   * Emitted when the remove segment is activated. The page decides what
   * clearing this field means; this shell carries no filter state of its
   * own.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly removed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property chipTestId
   * @readonly
   * @description The chip's own `<prefix>-filter-chip` `data-testid`.
   * @access protected
   * @since 2.0.0
   * @type {Signal<string>}
   */
  protected readonly chipTestId: Signal<string> = computed<string>(
    () => `${this.testIdPrefix()}-filter-chip`,
  );

  /**
   * Property removeTestId
   * @readonly
   * @description The remove button's `<prefix>-filter-chip-remove` `data-testid`.
   * @access protected
   * @since 2.0.0
   * @type {Signal<string>}
   */
  protected readonly removeTestId: Signal<string> = computed<string>(
    () => `${this.testIdPrefix()}-filter-chip-remove`,
  );
  //#endregion
}
