import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  type EffectRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { BrnFieldA11yService } from '@spartan-ng/brain/field';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { COLLECTION_FILTER_VALUE_CLASS } from '../../../constants';
import type { CollectionFilterOption, CollectionFilterPopoverState } from '../../../models';

/**
 * Component CollectionFilterMultiSelect
 * @class CollectionFilterMultiSelect
 *
 * @description
 * The value segment every `is any of` / `is none of` filter chip projects into
 * `app-filter-chip`: a searchable multi-select built on spartan's combobox,
 * rendering the current selection as up to {@link maxVisible} identical filled
 * chips followed by a `+N` overflow marker — {@link hiddenValuesLabel} names
 * what it folds away for a screen reader, since "+N" alone reads as nothing.
 * Presentational (`ARCHITECTURE.md` §10.3) — it owns no filter state, it
 * reports the next selection through {@link valuesChanged} and lets the page
 * decide.
 *
 * It exists so the six chips of a list page stop each carrying their own copy
 * of the same forty lines of combobox markup: the trigger's width caps, the
 * chip row's truncation, the popover's search box and empty state are decided
 * once, here, which is also what keeps every field's selection looking
 * identical whatever its domain.
 *
 * Domain-agnostic by construction: it takes `{ value, label }` options and
 * plain strings for every user-visible word, so `shared/` never imports a
 * feature's models and the `$localize` ids stay in the owning feature. A field
 * whose options deserve a richer row than their label — an icon, a colour dot
 * — passes {@link optionTemplate} for the popover and {@link valueTemplate}
 * for the chips. Both are bodies only: the chip's box, its truncation and the
 * `+N` marker stay here, which is what keeps every field's selection reading
 * as one row rather than as a mix of presentations.
 *
 * `hlm-combobox-trigger`'s class lands on both the host element and the inner
 * button, so the padding that draws the hover surface sits on the button and
 * is cancelled on the host alone through `[&:not(button)]:p-0` — without it
 * the segment pads twice and its hover stops short of the chip's dividers.
 * That string is not lifted to a shared constant even though
 * `app-collection-filter-select` repeats it mot pour mot: binding it through
 * `[class]` instead of the current literal attribute drops the class from
 * `hlm-combobox-trigger`'s own host entirely — Angular routes a *bound*
 * `class` fully into a component's `@Input('class')` alias, unlike a static
 * literal, which the compiler also keeps on the host attribute — and the
 * host's own `flex h-full self-stretch` is exactly what stretches this
 * trigger to `app-filter-chip`'s row height in the first place.
 *
 * {@link disabled} no longer disables the underlying `hlm-combobox-multiple`:
 * the brain-level trigger couples its native `disabled` attribute to
 * `aria-disabled` with no seam to set one without the other, and native
 * `disabled` would drop the trigger out of the tab order and stop it from
 * receiving pointer events — exactly the defect this shape now avoids. The
 * trigger stays focusable and clickable; {@link onValuesPicked} refuses to
 * emit while {@link disabled} is set, so it reads as inert without being
 * unreachable. {@link disabled} is bound through `HlmComboboxTrigger`'s own
 * `[ariaDisabled]` input, alongside the plain `[attr.aria-disabled]` this
 * trigger already carried: the plain form only ever lands on
 * `hlm-combobox-trigger` itself, never the `<button>` it wraps, since Angular
 * applies an `[attr.x]` binding to the literal element it is written on
 * (`@shared/ui/combobox`'s own doc has the full account); `[ariaDisabled]` is
 * the channel that actually reaches the focusable, clickable node a screen
 * reader lands on.
 *
 * {@link tooltip} renders nothing here any more, visually or through
 * `aria-describedby`: a 192px-capped trigger that already has to fit one or
 * more value pastilles has no room left to also spell out a full sentence —
 * measured at 117px actually left for the reason once a single pastille is
 * drawn, against a 337px-wide sentence, and no `max-w-*` reconciles the two
 * at a 375px viewport. The reason now renders as `app-filter-chip`'s own
 * trailing row, at the chip's own width. {@link tooltip} stays on this
 * component's public API, inert, only because
 * `interventions-page.component.html` still binds it at every call site; a
 * caller may keep passing it, it is simply never read.
 *
 * {@link describedBy} is the live channel that actually connects the trigger
 * to that reason row — see `app-collection-filter-select`'s own class doc
 * for the full account of why Angular DI cannot discover
 * `app-filter-chip`'s `brnField` from here (this component is itself
 * projected in through `NgTemplateOutlet`, from a `ng-template` the owning
 * page declares) and why this component provides its own
 * {@link fieldA11y} instead, letting `hlm-combobox-trigger`'s own
 * `brnFieldControlDescribedBy` (`@shared/ui/combobox`, unmodified) pick the
 * registration up automatically since it genuinely is this component's own
 * descendant.
 *
 * @version 2.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-filter-multi-select',
  imports: [NgTemplateOutlet, ...HlmComboboxImports],
  providers: [BrnFieldA11yService],
  templateUrl: './collection-filter-multi-select.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionFilterMultiSelect {
  //#region Inputs
  /**
   * Property options
   * @readonly
   * @description The full catalog the popover lists, in display order.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly CollectionFilterOption[]>}
   */
  public readonly options: InputSignal<readonly CollectionFilterOption[]> =
    input.required<readonly CollectionFilterOption[]>();

  /**
   * Property values
   * @readonly
   * @description The values currently selected, as the page's filter state holds them.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly string[]>}
   */
  public readonly values: InputSignal<readonly string[]> = input.required<readonly string[]>();

  /**
   * Property placeholder
   * @readonly
   * @description What the trigger reads while nothing is selected — the field's own label.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly placeholder: InputSignal<string> = input.required<string>();

  /**
   * Property searchPlaceholder
   * @readonly
   * @description The popover search box's placeholder. Absent renders no search box at all — a field with only a handful of options needs no search.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly searchPlaceholder: InputSignal<string | undefined> = input<string>();

  /**
   * Property emptyLabel
   * @readonly
   * @description What the popover reads when the search matches no option.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly emptyLabel: InputSignal<string> = input.required<string>();

  /**
   * Property accessibleName
   * @readonly
   * @description The trigger's accessible name, carried by a visually hidden label.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly accessibleName: InputSignal<string> = input.required<string>();

  /**
   * Property triggerId
   * @readonly
   * @description The trigger button's `id`, targeted by the visually hidden label.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly triggerId: InputSignal<string> = input.required<string>();

  /**
   * Property testId
   * @readonly
   * @description The trigger's `data-testid`, the hook specs open this field by.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly testId: InputSignal<string> = input.required<string>();

  /**
   * Property state
   * @readonly
   * @description Whether the popover is open, driven by the page so a freshly picked field opens itself.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<CollectionFilterPopoverState>}
   */
  public readonly state: InputSignal<CollectionFilterPopoverState> =
    input<CollectionFilterPopoverState>('closed');

  /**
   * Property disabled
   * @readonly
   * @description Whether this surface can apply the field at all. Dims the trigger and reads {@link tooltip}'s reason, but the trigger stays focusable — see the class doc.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property tooltip
   *
   * @description
   * Inert. `app-filter-chip` (`@shared/collection-filters`) now renders and
   * describes `CollectionFilterField.unavailableReason` itself, at the
   * chip's own width — see the class doc for why the trigger this component
   * owns could never fit that sentence at a 375px viewport. This input stays
   * on the public API, unread by this component, only because
   * `interventions-page.component.html` still binds it at every call site;
   * do not read it back from here, and do not remove it while that binding
   * stands.
   *
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly tooltip: InputSignal<string> = input<string>('');

  /**
   * Property describedBy
   * @readonly
   * @description The `id` of `app-filter-chip`'s own reason row, when the caller's field is unavailable — registered on this component's own {@link fieldA11y} so `hlm-combobox-trigger`'s inner button (`@shared/ui/combobox`) picks it up through its existing `brnFieldControlDescribedBy`. See the class doc for why the owning page must supply this explicitly rather than it being discovered automatically. `undefined` registers nothing.
   * @access public
   * @since 12.1.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly describedBy: InputSignal<string | undefined> = input<string>();

  /**
   * Property maxVisible
   * @readonly
   * @description How many value chips render before the `+N` marker takes over.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly maxVisible: InputSignal<number> = input<number>(2);

  /**
   * Property optionTemplate
   * @readonly
   * @description An optional richer row for one popover option, receiving the `CollectionFilterOption` as `$implicit`. Absent renders the label alone.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<TemplateRef<unknown> | null>}
   */
  public readonly optionTemplate: InputSignal<TemplateRef<unknown> | null> =
    input<TemplateRef<unknown> | null>(null);

  /**
   * Property valueTemplate
   * @readonly
   * @description An optional richer body for a selected value's chip, receiving its `CollectionFilterOption` as `$implicit` — how a field whose options carry an icon gets that icon inside the chip. The chip's own box, truncation and `+N` stay this component's. Absent renders the label alone.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<TemplateRef<unknown> | null>}
   */
  public readonly valueTemplate: InputSignal<TemplateRef<unknown> | null> =
    input<TemplateRef<unknown> | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property valuesChanged
   * @readonly
   * @description The selection after a pick. Empty means the field carries no narrowing any more.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<readonly string[]>}
   */
  public readonly valuesChanged: OutputEmitterRef<readonly string[]> = output<readonly string[]>();

  /**
   * Property stateChanged
   * @readonly
   * @description The popover opened or closed on its own — the page mirrors it to keep its pending-field memory honest.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CollectionFilterPopoverState>}
   */
  public readonly stateChanged: OutputEmitterRef<CollectionFilterPopoverState> =
    output<CollectionFilterPopoverState>();
  //#endregion

  //#region Properties
  /**
   * Property valueClass
   * @readonly
   * @description Each selected value's filled pastille, shared mot pour mot by every value control in this bar.
   * @access protected
   * @since 10.6.0
   * @type {string}
   */
  protected readonly valueClass: string = COLLECTION_FILTER_VALUE_CLASS;

  /**
   * Property selection
   * @readonly
   * @description {@link values} as the mutable array spartan's combobox expects.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string[]>}
   */
  protected readonly selection: Signal<string[]> = computed<string[]>(() => [...this.values()]);

  /**
   * Property visibleCount
   * @readonly
   * @description {@link maxVisible}, floored at one so a selection never renders as `+N` alone.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly visibleCount: Signal<number> = computed<number>(() =>
    Math.max(1, this.maxVisible()),
  );

  /**
   * Property labelOf
   * @readonly
   * @description Resolves one value to its catalog label — the chip's text, and what the popover's search box matches against. An unknown value reads as itself rather than blank.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly labelOf: (value: string) => string = (value: string): string =>
    this.options().find((option: CollectionFilterOption): boolean => option.value === value)
      ?.label ?? $localize`:@@collectionFilters.unknownValue:Unknown value`;

  /**
   * Property fieldA11y
   * @readonly
   * @description This component's own `BrnFieldA11yService` instance — see the class doc for why it must be provided here rather than discovered from `app-filter-chip`'s own `brnField`. Read by {@link syncDescribedBy}.
   * @access private
   * @since 12.1.0
   * @type {BrnFieldA11yService}
   */
  private readonly fieldA11y: BrnFieldA11yService = inject(BrnFieldA11yService);

  /**
   * Property syncDescribedBy
   * @readonly
   * @description Registers {@link describedBy} on {@link fieldA11y} whenever it is set, unregistering it on change or teardown — see the class doc for how `hlm-combobox-trigger`'s own `brnFieldControlDescribedBy` (`@shared/ui/combobox`) picks the registration up.
   * @access private
   * @since 12.1.0
   * @type {EffectRef}
   */
  private readonly syncDescribedBy: EffectRef = effect((onCleanup): void => {
    const id: string | undefined = this.describedBy();
    if (id === undefined) return;

    this.fieldA11y.registerDescription(id);
    onCleanup((): void => this.fieldA11y.unregisterDescription(id));
  });
  //#endregion

  //#region Methods
  /**
   * Method onValuesPicked
   * @description Normalizes the combobox's `null`-when-empty selection to an array before re-emitting it. A no-op while {@link disabled} is set — the trigger stays clickable, so this is what keeps a pick inert rather than merely invisible.
   * @access protected
   * @since 1.0.0
   * @param {readonly string[] | null | undefined} values - The combobox's next selection.
   * @returns {void}
   */
  protected onValuesPicked(values: readonly string[] | null | undefined): void {
    if (this.disabled()) return;
    this.valuesChanged.emit(values ?? []);
  }

  /**
   * Method optionOf
   * @description The catalog entry behind one value, for {@link valueTemplate}. An unknown value yields a synthetic entry labelled by itself, so a stale narrowing still renders.
   * @access protected
   * @since 1.1.0
   * @param {string} value - The value to resolve.
   * @returns {CollectionFilterOption} Its catalog entry.
   */
  protected optionOf(value: string): CollectionFilterOption {
    return (
      this.options().find((option: CollectionFilterOption): boolean => option.value === value) ?? {
        value,
        label: value,
      }
    );
  }

  /**
   * Method hiddenValuesLabel
   * @description The `sr-only` announcement for the `+N` overflow marker: the labels {@link visibleCount} folds out of view, comma-joined, resolved through {@link labelOf}.
   * @access protected
   * @since 1.2.0
   * @param {readonly string[]} values - The full selection the chip row renders, visible entries included.
   * @returns {string} The overflow marker's accessible name.
   */
  protected hiddenValuesLabel(values: readonly string[]): string {
    const hidden: string = values
      .slice(this.visibleCount())
      .map((value: string): string => this.labelOf(value))
      .join(', ');

    return $localize`:@@shared.collectionFilterMultiSelect.hiddenValues:Also selected: ${hidden}:hidden:`;
  }
  //#endregion
}
