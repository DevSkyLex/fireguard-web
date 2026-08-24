import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
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
  type AfterRenderRef,
  type ElementRef,
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
import type {
  CollectionFilterField,
  CollectionFilterOperator,
  CollectionFilterOperatorChangedEvent,
} from '../../../models';
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
 * A field picked from the "+ Filter" menu keeps its (empty) chip for the rest
 * of the visit, whether or not a value follows: closing a value control
 * without choosing anything is not a decision to drop the filter, and a chip
 * that vanished under the cursor forced the user back through the menu. Only
 * the chip's own remove button or "Clear filters" drops it. {@link pendingKey}
 * — the page's popover-open state — still renders a chip too, which is what
 * keeps a field on screen while an operator change momentarily voids its
 * value.
 *
 * The root carries id `<testIdPrefix>-filter-bar`, the `aria-controls`
 * target `app-collection-filter-toggle` (`@shared/collection-filters`) uses
 * for the toolbar button that mounts or unmounts this bar entirely — visibility
 * itself is the owning page's concern, this component only ever renders or
 * does not exist. It also carries `role="group"` and {@link regionLabel} as
 * its `aria-label`, since the chip row has no visible heading of its own to
 * lend it one.
 *
 * It draws its own box — a hairline border and a small pad — so the chips read
 * as one region rather than as controls loose under the toolbar. That is also
 * why the root no longer pulls itself up with a negative margin: a bordered
 * region sits in the page's normal rhythm instead of overlapping the row above
 * it.
 *
 * Each chip's operator segment reads its field's own
 * `CollectionFilterField.operators` catalog: {@link activeOperators} carries
 * which one is currently picked per key (defaulting to a field's first
 * declared operator through {@link operatorOf}), and a pick re-emits
 * {@link operatorChanged} for the page to resolve — this bar never
 * interprets an operator itself, only routes the pick.
 *
 * An unavailable field's "+ Filter" entry (`CollectionFilterField.unavailableReason`
 * set) carries `aria-disabled`, never the native `disabled` attribute:
 * `hlmDropdownMenuItem` maps `disabled` onto `cdkMenuItemDisabled`, which the
 * CDK's `FocusKeyManager` skips entirely — a keyboard user would never reach
 * the reason already rendered beneath the label. `aria-disabled` keeps the
 * entry in the roving-tabindex order and its pointer events live; its `id`
 * (from {@link reasonIdFor}) is targeted by the entry's own
 * `aria-describedby`. `CdkMenuItem` still emits `triggered` on an
 * `aria-disabled` activation regardless, so {@link pickField} itself refuses
 * an unavailable key — without that guard this would be an active control
 * standing in for a disabled one, not a fix.
 *
 * That `aria-disabled` only reaches the DOM through {@link syncUnsetFieldAriaDisabled}.
 * `hlmDropdownMenuItem` attaches `CdkMenuItem` as a host directive on the very
 * same `<button>`, and `CdkMenuItem` binds its own `'[attr.aria-disabled]':
 * 'disabled || null'` there; since this bar deliberately never sets
 * `disabled` (the paragraph above is why), that binding always resolves to
 * `null` and — being a directive host binding on the same node — wins the
 * same change-detection pass over this template's own `[attr.aria-disabled]`,
 * wiping the true value it just wrote. Angular only re-runs a host binding's
 * DOM write when its own bound expression changes, and `disabled` never does
 * here, so {@link syncUnsetFieldAriaDisabled} — a `write`-phase
 * `afterRenderEffect`, running strictly after that change-detection pass —
 * only has to re-assert the value once per field-list change for it to
 * stick. The template's own `[attr.aria-disabled]` stays too, as the
 * declared intent this effect enforces, not dead weight.
 *
 * Each rendered chip also carries its own field's
 * `unavailableReason !== undefined` down to `app-filter-chip`'s `disabled`
 * input, which dims it and neutralizes its operator segment — but not its
 * remove button, which stays live so the narrowing remains dismissible from
 * the chip itself rather than only through "Clear filters". An active
 * narrowing on a field this surface can no longer apply still needs to say
 * so and stay reachable. The reason text
 * itself is forwarded too, verbatim, through `app-filter-chip`'s own
 * `unavailableReason` input, alongside `reasonIdFor(key)` as its `reasonId` —
 * the chip is what actually renders it, at the chip's own width rather than
 * squeezed inside a value trigger; see its class doc.
 *
 * Removing a chip also moves keyboard focus, since nothing else can: the
 * following chip's own remove button, else the preceding one, else the
 * "+ Filter" trigger, else this bar's own root — see
 * {@link focusAfterRemoval} — rather than letting it fall back to `body`
 * once the removed chip leaves the DOM.
 *
 * @version 10.6.0
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
   * Property addFilterTrigger
   * @readonly
   * @description The "+ Filter" button, when it renders — one of {@link focusAfterRemoval}'s fallback targets.
   * @access private
   * @since 10.3.0
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  private readonly addFilterTrigger: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('addFilterButton');

  /**
   * Property unsetFieldItems
   * @readonly
   * @description Every currently rendered "+ Filter" menu entry `<button>`, in {@link unsetFields} order — the `@for` in the template iterates both the same way, so the two stay positionally aligned. Read by {@link syncUnsetFieldAriaDisabled}.
   * @access private
   * @since 10.5.0
   * @type {Signal<readonly ElementRef<HTMLButtonElement>[]>}
   */
  private readonly unsetFieldItems: Signal<readonly ElementRef<HTMLButtonElement>[]> =
    viewChildren<ElementRef<HTMLButtonElement>>('unsetFieldItem');

  /**
   * Property syncUnsetFieldAriaDisabled
   * @readonly
   * @description Re-asserts `aria-disabled` on every "+ Filter" menu entry after each render where {@link unsetFields} changed — see the class doc for why the template's own binding cannot make it stick on its own.
   * @access private
   * @since 10.5.0
   * @type {AfterRenderRef}
   */
  private readonly syncUnsetFieldAriaDisabled: AfterRenderRef = afterRenderEffect({
    write: (): void => {
      const buttons: readonly ElementRef<HTMLButtonElement>[] = this.unsetFieldItems();
      const fields: readonly CollectionFilterField[] = this.unsetFields();

      buttons.forEach((button: ElementRef<HTMLButtonElement>, index: number): void => {
        const isUnavailable: boolean = fields[index]?.unavailableReason !== undefined;
        button.nativeElement.setAttribute('aria-disabled', isUnavailable ? 'true' : 'false');
      });
    },
  });

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

  /** The "+ Filter" trigger's label. */
  protected readonly addFilterLabel: string = $localize`:@@shared.collectionFilterBar.addFilterButton:Filter`;

  /** The "+ Filter" menu's heading. */
  protected readonly addFilterMenuLabel: string = $localize`:@@shared.collectionFilterBar.addFilterMenuLabel:Filter by`;

  /** The trailing "Clear filters" button's label — the same generic id every list's popover already carried. */
  protected readonly clearFiltersLabel: string = $localize`:@@common.clearFilters:Clear filters`;

  /** The root's `aria-label` — this bar has no visible heading, so it is the only accessible name a screen reader gets for the chip region. */
  protected readonly regionLabel: string = $localize`:@@shared.collectionFilterBar.regionLabel:Active filters`;
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
   * Method reasonIdFor
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
   *
   * @description
   * Picks a field from the "+ Filter" menu: moves it to the end of
   * {@link order} so its chip renders last, then emits {@link fieldPicked} so
   * the page opens that field's own value control. A no-op for a field
   * carrying {@link CollectionFilterField.unavailableReason} — its menu entry
   * stays keyboard-reachable (`aria-disabled`, not `disabled`, per the class
   * doc), and `CdkMenuItem` still emits `triggered` on activation regardless,
   * so this guard is what actually keeps it inert.
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

          const addFilterButton: ElementRef<HTMLButtonElement> | undefined =
            this.addFilterTrigger();
          if (addFilterButton) {
            addFilterButton.nativeElement.focus();
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
