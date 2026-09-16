import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  Injector,
  output,
  signal,
  viewChild,
  viewChildren,
  type ElementRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { HlmButton } from '@shared/ui/button';
import type {
  CollectionFilterField,
  CollectionFilterOperator,
  CollectionFilterOperatorChangedEvent,
} from '../../../models';
import { CollectionFilterFieldPicker } from '../collection-filter-field-picker';
import { FilterChip } from '../filter-chip';

/**
 * Component CollectionFilterBar
 * @class CollectionFilterBar
 * @description Presentational filter row that owns field ordering, chip composition and focus
 * recovery, while the page owns values, URL state and queries. Feature templates provide each
 * value control. A local field picker adapts the unset-field catalog to a desktop menu or mobile
 * drawer without interpreting filter meaning.
 * @version 10.6.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-filter-bar',
  imports: [NgIcon, NgTemplateOutlet, FilterChip, HlmButton, CollectionFilterFieldPicker],
  providers: [provideIcons({ lucideX })],
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
   * Property activeOperators
   * @readonly
   * @description The operator currently active per field key. A key absent — a field the page has not yet resolved an operator for — reads as that field's own first declared operator (its default).
   * @access public
   * @since 8.0.0
   * @type {InputSignal<Readonly<Record<string, CollectionFilterOperator>>>}
   */
  public readonly activeOperators: InputSignal<Readonly<Record<string, CollectionFilterOperator>>> =
    input<Readonly<Record<string, CollectionFilterOperator>>>({});

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
   * Property operatorChanged
   * @readonly
   * @description A chip's operator select picked a different entry. The page reacts by re-resolving that field's narrowing under the new operator.
   * @access public
   * @since 8.0.0
   * @type {OutputEmitterRef<CollectionFilterOperatorChangedEvent>}
   */
  public readonly operatorChanged: OutputEmitterRef<CollectionFilterOperatorChangedEvent> =
    output<CollectionFilterOperatorChangedEvent>();

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
   * Property isMobileInteractionMode
   * @readonly
   * @description Uses the mobile interaction mode for touch controls regardless of viewport width.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

  /**
   * Property injector
   * @readonly
   * @description This component's own injector, passed to the `afterNextRender` call in {@link focusAfterRemoval} — required since that call happens from an event handler, outside a reactive/DI context.
   * @access private
   * @since 10.3.0
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);

  /**
   * Property chips
   * @readonly
   * @description Every currently rendered `app-filter-chip` instance, in {@link renderedKeys} order — the `@for` in the template iterates both the same way, so the two stay positionally aligned.
   * @access private
   * @since 10.3.0
   * @type {Signal<readonly FilterChip[]>}
   */
  private readonly chips: Signal<readonly FilterChip[]> = viewChildren(FilterChip);

  /**
   * Property fieldPicker
   * @readonly
   * @description Unset-field picker and focus fallback after the final chip is removed.
   * @access private
   * @since 10.3.0
   * @type {Signal<CollectionFilterFieldPicker | undefined>}
   */
  private readonly fieldPicker: Signal<CollectionFilterFieldPicker | undefined> = viewChild(
    CollectionFilterFieldPicker,
  );

  /**
   * Property root
   * @readonly
   * @description This bar's own root element — {@link focusAfterRemoval}'s last-resort focus target, once no chip and no "+ Filter" trigger are left to receive it.
   * @access private
   * @since 10.3.0
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly root: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('barRoot');

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
   * Property pickedKeys
   * @readonly
   * @description The fields picked from the "+ Filter" menu this visit, kept rendered even once their value control closes with nothing chosen — closing a popover is not a decision to drop the filter. A key leaves this set only through its own chip's remove button or {@link clearAll}.
   * @access private
   * @since 2.0.0
   * @type {WritableSignal<ReadonlySet<string>>}
   */
  private readonly pickedKeys: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set<string>(),
  );

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
    const picked: ReadonlySet<string> = this.pickedKeys();

    const sorted: readonly string[] = active.toSorted(
      (left: string, right: string): number => order.indexOf(left) - order.indexOf(right),
    );

    const valueless: readonly string[] = [...picked, ...(pending === null ? [] : [pending])]
      .filter((key: string): boolean => !sorted.includes(key))
      .toSorted(
        (left: string, right: string): number => order.indexOf(left) - order.indexOf(right),
      );

    return [...sorted, ...new Set(valueless)];
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
    const rendered: ReadonlySet<string> = new Set(this.renderedKeys());

    return this.fields().filter(
      (field: CollectionFilterField): boolean => !rendered.has(field.key),
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

  /**
   * Property isEmpty
   * @readonly
   * @description Whether the bar has no chip or pending field and can show its empty-state decoration.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isEmpty: Signal<boolean> = computed<boolean>(
    () => this.renderedKeys().length === 0,
  );

  /**
   * Property addFilterLabel
   * @readonly
   * @description The "+ Filter" trigger's label.
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly addFilterLabel: string = $localize`:@@shared.collectionFilterBar.addFilterButton:Filter`;

  /**
   * Property addFilterMenuLabel
   * @readonly
   * @description The "+ Filter" menu's heading.
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly addFilterMenuLabel: string = $localize`:@@shared.collectionFilterBar.addFilterMenuLabel:Filter by`;

  /**
   * Property clearFiltersLabel
   * @readonly
   * @description The trailing "Clear filters" button's label — the same generic id every list's popover already carried.
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly clearFiltersLabel: string = $localize`:@@common.clearFilters:Clear filters`;

  /**
   * Property regionLabel
   * @readonly
   * @description The root's `aria-label` — this bar has no visible heading, so it is the only accessible name a screen reader gets for the chip region.
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly regionLabel: string = $localize`:@@shared.collectionFilterBar.regionLabel:Active filters`;
  //#endregion

  //#region Methods
  /**
   * Method testId
   * @method testId
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
   * Method reasonIdFor
   * @method reasonIdFor
   * @description The `id` a field's reason text renders under — the "+ Filter" menu's own entry while the field is unset, `app-filter-chip`'s own trailing row while it is active. Safe to share one id between the two: a field is never both active and unset at once, so only one of them ever actually renders that text. Derived from {@link testIdPrefix} and the field's own key — deterministic and stable across renders, not a per-render counter.
   * @access protected
   * @since 10.2.0
   * @param {string} key - The field whose reason is being identified.
   * @returns {string} The reason text's `id`.
   */
  protected reasonIdFor(key: string): string {
    return `${this.testIdPrefix()}-filter-reason-${key}`;
  }

  /**
   * Method operatorTriggerIdFor
   * @method operatorTriggerIdFor
   * @description The `id` a field's operator select trigger renders under, targeted by its own `sr-only` label's `for`. Derived from {@link testIdPrefix} and the field's own key — deterministic and stable across renders, unlike a per-instance counter, so it renders identically on the server and after client hydration.
   * @access protected
   * @since 10.3.0
   * @param {string} key - The field whose operator trigger is being identified.
   * @returns {string} The trigger's `id`.
   */
  protected operatorTriggerIdFor(key: string): string {
    return `${this.testIdPrefix()}-filter-chip-operator-${key}`;
  }

  /**
   * Method removeLabelFor
   * @method removeLabelFor
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
   * Method changeOperatorLabelFor
   * @method changeOperatorLabelFor
   * @description The generic "Change operator: {field}" accessible name for one field's operator select.
   * @access protected
   * @since 8.0.0
   * @param {string} fieldLabel - The field's own label.
   * @returns {string} The operator select's accessible name.
   */
  protected changeOperatorLabelFor(fieldLabel: string): string {
    return $localize`:@@shared.collectionFilterBar.changeOperator:Change operator: ${fieldLabel}:field:`;
  }

  /**
   * Method operatorOf
   * @method operatorOf
   *
   * @description
   * The operator currently active for one field: {@link activeOperators}'
   * own entry when present, otherwise that field's first declared operator
   * — its default, read the moment a field is picked and has not yet had an
   * operator chosen for it.
   *
   * @access protected
   * @since 8.0.0
   * @param {string} key - The field key to resolve.
   * @returns {CollectionFilterOperator} Its currently active operator.
   */
  protected operatorOf(key: string): CollectionFilterOperator {
    return this.activeOperators()[key] ?? this.fieldOf(key).operators[0];
  }

  /**
   * Method fieldOf
   * @method fieldOf
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
        operators: ['equals'],
      }
    );
  }

  /**
   * Method pickField
   * @method pickField
   *
   * @description
   * Picks a field from the "+ Filter" menu: moves it to the end of
   * {@link order} so its chip renders last, then emits {@link fieldPicked} so
   * the page opens that field's own value control. A no-op for a field
   * carrying {@link CollectionFilterField.unavailableReason}; the picker also
   * exposes that state declaratively, while this guard protects programmatic calls.
   *
   * @access protected
   * @since 1.0.0
   * @param {string} key - The field just picked.
   * @returns {void}
   */
  protected pickField(key: string): void {
    if (this.fieldOf(key).unavailableReason !== undefined) return;

    this.order.update((current: readonly string[]) => [
      ...current.filter((entry: string): boolean => entry !== key),
      key,
    ]);
    this.pickedKeys.update((current: ReadonlySet<string>) => new Set([...current, key]));
    this.fieldPicked.emit(key);
  }

  /**
   * Method clearAll
   * @method clearAll
   * @description Resets the pick-order memory and emits {@link filtersCleared}.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected clearAll(): void {
    this.order.set([]);
    this.pickedKeys.set(new Set<string>());
    this.filtersCleared.emit();
  }

  /**
   * Method removeField
   * @method removeField
   *
   * @description
   * Drops one chip: forgets it was picked this visit, emits
   * {@link fieldRemoved} for the page to clear its value, then hands
   * keyboard focus to whichever control should receive it next — see
   * {@link focusAfterRemoval}.
   *
   * @access protected
   * @since 2.0.0
   * @param {string} key - The field whose chip was dismissed.
   * @returns {void}
   */
  protected removeField(key: string): void {
    const keysBeforeRemoval: readonly string[] = this.renderedKeys();
    const removalIndex: number = keysBeforeRemoval.indexOf(key);
    const nextKey: string | undefined = keysBeforeRemoval[removalIndex + 1];
    const previousKey: string | undefined =
      removalIndex > 0 ? keysBeforeRemoval[removalIndex - 1] : undefined;

    this.pickedKeys.update((current: ReadonlySet<string>): ReadonlySet<string> => {
      const next: Set<string> = new Set(current);
      next.delete(key);

      return next;
    });
    this.fieldRemoved.emit(key);
    this.focusAfterRemoval(nextKey, previousKey);
  }

  /**
   * Method chipByKey
   * @method chipByKey
   * @description Looks up the rendered `app-filter-chip` instance for one key, matching {@link chips} positionally against {@link renderedKeys} — both iterate the same `@for` in the same order.
   * @access private
   * @since 10.3.0
   * @param {string} key - The field key to resolve.
   * @returns {FilterChip | undefined} Its chip instance, when still rendered.
   */
  private chipByKey(key: string): FilterChip | undefined {
    const index: number = this.renderedKeys().indexOf(key);

    return index === -1 ? undefined : this.chips()[index];
  }

  /**
   * Method focusAfterRemoval
   * @method focusAfterRemoval
   *
   * @description
   * Moves real DOM focus once a chip's removal has actually rendered: the
   * chip that was next, else the one that was previous, else the
   * "+ Filter" trigger, else this bar's own root — the cascade a keyboard
   * user expects instead of losing focus to `body`. Deferred through
   * `afterNextRender` rather than a `setTimeout`, since the app is
   * zoneless and the owning page may still be reacting to
   * {@link fieldRemoved} when this runs.
   *
   * @access private
   * @since 10.3.0
   *
   * @param {string | undefined} nextKey - The key rendered just after the removed one, read before removal.
   * @param {string | undefined} previousKey - The key rendered just before the removed one, read before removal.
   *
   * @returns {void}
   */
  private focusAfterRemoval(nextKey: string | undefined, previousKey: string | undefined): void {
    afterNextRender(
      {
        write: (): void => {
          const target: FilterChip | undefined =
            (nextKey === undefined ? undefined : this.chipByKey(nextKey)) ??
            (previousKey === undefined ? undefined : this.chipByKey(previousKey));

          if (target) {
            target.focusRemove();
            return;
          }

          const picker: CollectionFilterFieldPicker | undefined = this.fieldPicker();
          if (picker) {
            picker.focusTrigger();
            return;
          }

          this.root()?.nativeElement.focus();
        },
      },
      { injector: this.injector },
    );
  }
  //#endregion
}
