import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideX } from '@ng-icons/lucide';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import type { CollectionFilterField } from '../../../models';
import { FilterChip } from '../filter-chip';

/**
 * Component CollectionFilterBar
 * @class CollectionFilterBar
 *
 * @description
 * The Linear-style filter row shared by every collection surface: one
 * `app-filter-chip` per active narrowing, a "+ Filter" menu offering the
 * fields still unset, and a "Clear filters" button. Presentational
 * (`ARCHITECTURE.md` §10.3) — the page owns the actual narrowing (its
 * URL-backed `filters` signal) and passes only which keys are currently set
 * ({@link activeKeys}); this bar owns the chip row's display order and the
 * add/clear chrome around it, never the values.
 *
 * A chip's value control is never this bar's concern: a page registers one
 * `TemplateRef` per field key in {@link templates} (typically local
 * `viewChild(TemplateRef)` refs, the same idiom `PageActionsService`
 * consumers already use for `#pageActions`), and this bar projects the
 * matching template inside each rendered chip through `NgTemplateOutlet` —
 * that is what keeps a feature's tag components and models out of `shared/`.
 *
 * Order is remembered internally, oldest-picked-last: a field the page's URL
 * already carried (never explicitly picked through {@link pickField}) sorts
 * ahead of every field picked this visit, and a field picked again after
 * being removed moves to the end rather than back to its earlier position —
 * dead keys are never pruned from the memory, only from what actually
 * renders, since a stale entry is harmless once nothing reads it.
 *
 * A field mid-pick and not yet valued — {@link pendingKey}, driven by the
 * page's own popover-open state — still renders its (empty) chip, appended
 * after the active ones if it is not among them yet.
 *
 * The root carries id `<testIdPrefix>-filter-bar`, the `aria-controls`
 * target `app-collection-filter-toggle` (`@shared/collection-filters`) uses
 * for the toolbar button that mounts or unmounts this bar entirely — visibility
 * itself is the owning page's concern, this component only ever renders or
 * does not exist.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-filter-bar',
  imports: [NgIcon, NgTemplateOutlet, FilterChip, HlmButton, ...HlmDropdownMenuImports],
  providers: [provideIcons({ lucidePlus, lucideX })],
  templateUrl: './collection-filter-bar.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionFilterBar {
  //#region Inputs
  /**
   * Property fields
   * @readonly
   * @description The full field catalog, in the bar's default/menu order.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly CollectionFilterField[]>}
   */
  public readonly fields: InputSignal<readonly CollectionFilterField[]> =
    input.required<readonly CollectionFilterField[]>();

  /**
   * Property activeKeys
   * @readonly
   * @description Which fields currently carry a value. Order does not matter — this bar derives display order itself.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly string[]>}
   */
  public readonly activeKeys: InputSignal<readonly string[]> = input.required<readonly string[]>();

  /**
   * Property pendingKey
   * @readonly
   * @description The field the page just opened for a first pick, before it carries a value — `null` when none is mid-pick.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly pendingKey: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property templates
   * @readonly
   * @description One value-control `TemplateRef` per field key, keyed the same as {@link fields}. A key absent because its `TemplateRef` has not resolved yet renders no value control for that render pass.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<Readonly<Record<string, TemplateRef<unknown> | undefined>>>}
   */
  public readonly templates: InputSignal<
    Readonly<Record<string, TemplateRef<unknown> | undefined>>
  > = input.required<Readonly<Record<string, TemplateRef<unknown> | undefined>>>();

  /**
   * Property testIdPrefix
   * @readonly
   * @description The owning list page's `data-testid` prefix. Forwarded to each `app-filter-chip` and this bar's own controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly testIdPrefix: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Outputs
  /**
   * Property fieldPicked
   * @readonly
   * @description A not-yet-active field was picked from the "+ Filter" menu. The page reacts by opening that field's own value control.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly fieldPicked: OutputEmitterRef<string> = output<string>();

  /**
   * Property fieldRemoved
   * @readonly
   * @description A chip's remove button was activated. The page reacts by clearing that field's value.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly fieldRemoved: OutputEmitterRef<string> = output<string>();

  /**
   * Property filtersCleared
   * @readonly
   * @description "Clear filters" was activated. The page reacts by dropping every narrowing.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly filtersCleared: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property order
   * @readonly
   * @description The pick-order memory {@link renderedKeys} sorts active keys by. Reset on {@link clearAll}.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<readonly string[]>}
   */
  private readonly order: WritableSignal<readonly string[]> = signal<readonly string[]>([]);

  /**
   * Property renderedKeys
   * @readonly
   * @description Which chips render, in display order: every active key sorted by {@link order}, then {@link pendingKey} appended if not already among them.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly renderedKeys: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const active: readonly string[] = this.activeKeys();
    const order: readonly string[] = this.order();
    const pending: string | null = this.pendingKey();

    const sorted: readonly string[] = active.toSorted(
      (left: string, right: string): number => order.indexOf(left) - order.indexOf(right),
    );

    return pending === null || sorted.includes(pending) ? sorted : [...sorted, pending];
  });

  /**
   * Property unsetFields
   * @readonly
   * @description The fields the "+ Filter" menu offers: the catalog minus every active key and minus {@link pendingKey}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly CollectionFilterField[]>}
   */
  protected readonly unsetFields: Signal<readonly CollectionFilterField[]> = computed<
    readonly CollectionFilterField[]
  >(() => {
    const active: ReadonlySet<string> = new Set(this.activeKeys());
    const pending: string | null = this.pendingKey();

    return this.fields().filter(
      (field: CollectionFilterField): boolean => !active.has(field.key) && field.key !== pending,
    );
  });

  /**
   * Property hasActiveFilters
   * @readonly
   * @description Whether "Clear filters" should render at all.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly hasActiveFilters: Signal<boolean> = computed<boolean>(
    () => this.activeKeys().length > 0,
  );

  /** The "+ Filter" trigger's label. */
  protected readonly addFilterLabel: string = $localize`:@@shared.collectionFilterBar.addFilterButton:Filter`;

  /** The "+ Filter" menu's heading. */
  protected readonly addFilterMenuLabel: string = $localize`:@@shared.collectionFilterBar.addFilterMenuLabel:Filter by`;

  /** The trailing "Clear filters" button's label — the same generic id every list's popover already carried. */
  protected readonly clearFiltersLabel: string = $localize`:@@common.clearFilters:Clear filters`;
  //#endregion

  //#region Methods
  /**
   * Method testId
   * @description Builds a `<prefix>-<suffix>` `data-testid` value from {@link testIdPrefix}.
   * @access protected
   * @since 1.0.0
   * @param {string} suffix - The control-specific suffix.
   * @returns {string} The full `data-testid` value.
   */
  protected testId(suffix: string): string {
    return `${this.testIdPrefix()}-${suffix}`;
  }

  /**
   * Method removeLabelFor
   * @description The generic "Remove filter: {field}" accessible name for one field's chip.
   * @access protected
   * @since 1.0.0
   * @param {string} fieldLabel - The field's own label.
   * @returns {string} The remove button's accessible name.
   */
  protected removeLabelFor(fieldLabel: string): string {
    return $localize`:@@shared.collectionFilterBar.removeFilter:Remove filter: ${fieldLabel}:field:`;
  }

  /**
   * Method fieldOf
   * @description Looks up a rendered key's catalog entry, falling back to an empty label rather than throwing — every rendered key traces back to {@link fields} or {@link pendingKey}, both page-controlled.
   * @access protected
   * @since 1.0.0
   * @param {string} key - The field key to resolve.
   * @returns {CollectionFilterField} Its catalog entry.
   */
  protected fieldOf(key: string): CollectionFilterField {
    return (
      this.fields().find((field: CollectionFilterField): boolean => field.key === key) ?? {
        key,
        fieldLabel: '',
        icon: 'lucideCircleDot',
      }
    );
  }

  /**
   * Method pickField
   *
   * @description
   * Picks a field from the "+ Filter" menu: moves it to the end of
   * {@link order} so its chip renders last, then emits {@link fieldPicked} so
   * the page opens that field's own value control.
   *
   * @access protected
   * @since 1.0.0
   * @param {string} key - The field just picked.
   * @returns {void}
   */
  protected pickField(key: string): void {
    this.order.update((current: readonly string[]) => [
      ...current.filter((entry: string): boolean => entry !== key),
      key,
    ]);
    this.fieldPicked.emit(key);
  }

  /**
   * Method clearAll
   * @description Resets the pick-order memory and emits {@link filtersCleared}.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected clearAll(): void {
    this.order.set([]);
    this.filtersCleared.emit();
  }
  //#endregion
}
