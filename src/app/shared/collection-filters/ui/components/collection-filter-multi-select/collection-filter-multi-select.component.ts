import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  type EffectRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { BrnFieldA11yService } from '@spartan-ng/brain/field';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmDrawer, HlmDrawerImports } from '@shared/ui/drawer';
import { HlmInput } from '@shared/ui/input';
import { HlmItem, HlmItemContent, HlmItemTitle } from '@shared/ui/item';
import { COLLECTION_FILTER_VALUE_CLASS } from '../../../constants';
import type { CollectionFilterOption, CollectionFilterPopoverState } from '../../../models';

/**
 * Component CollectionFilterMultiSelect
 * @class CollectionFilterMultiSelect
 *
 * @description Domain-agnostic multi-select value control for collection filter chips. Desktop
 * uses the native Spartan combobox; mobile edits a local draft in a drawer and emits only after
 * Apply, before closing. Cancel, Escape and source refreshes during editing preserve the last
 * confirmed value. Disabled states remain declarative and `describedBy` carries the reason text.
 * @version 2.1.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-filter-multi-select',
  imports: [
    NgTemplateOutlet,
    HlmButton,
    HlmCheckbox,
    HlmInput,
    HlmItem,
    HlmItemContent,
    HlmItemTitle,
    ...HlmComboboxImports,
    ...HlmDrawerImports,
  ],
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
   * @description Whether this surface can apply the field. The trigger stays focusable and its handler remains inert.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

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
   * Property mobileValueId
   * @readonly
   * @description Stable id of the mobile trigger's displayed value, including any hidden selections.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly mobileValueId: Signal<string> = computed<string>(
    () => `${this.triggerId()}-mobile-value`,
  );

  /**
   * Property mobileDescribedBy
   * @readonly
   * @description Describes mobile triggers by their displayed value while preserving caller description ids.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly mobileDescribedBy: Signal<string> = computed<string>(() =>
    `${this.mobileValueId()} ${this.describedBy() ?? ''}`.trim(),
  );

  /**
   * Property stagedSelection
   * @readonly
   * @description Selection staged inside the mobile drawer until Apply is activated.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<readonly string[]>}
   */
  protected readonly stagedSelection: WritableSignal<readonly string[]> = signal<readonly string[]>(
    [],
  );

  /**
   * Property mobileSearch
   * @readonly
   * @description Ephemeral search text owned by the mobile drawer.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  protected readonly mobileSearch: WritableSignal<string> = signal<string>('');

  /**
   * Property mobileOptions
   * @readonly
   * @description Options matching the mobile drawer's local search text.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly CollectionFilterOption[]>}
   */
  protected readonly mobileOptions: Signal<readonly CollectionFilterOption[]> = computed<
    readonly CollectionFilterOption[]
  >(() => {
    const term: string = this.mobileSearch().trim().toLocaleLowerCase();
    if (term.length === 0) return this.options();
    return this.options().filter((option: CollectionFilterOption): boolean =>
      option.label.toLocaleLowerCase().includes(term),
    );
  });

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
   * @description Resolves one value to its catalog label for display and search. Values absent from the catalog use the localized Unknown value label rather than exposing a raw identifier.
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

  /**
   * Property drawer
   * @readonly
   * @description Owns explicit closure after the committed value has been emitted.
   * @access private
   * @since 1.0.0
   * @type {Signal<HlmDrawer | undefined>}
   */
  private readonly drawer: Signal<HlmDrawer | undefined> = viewChild<HlmDrawer>(HlmDrawer);

  /**
   * Property mobileDrawerVisible
   * @description Tracks actual drawer transitions so one opening owns one draft and one commitment.
   * @access private
   * @since 1.0.0
   * @type {boolean}
   */
  private mobileDrawerVisible: boolean = false;
  //#endregion

  //#region Methods
  /**
   * Method onValuesPicked
   * @method onValuesPicked
   * @description Accepts only string arrays from the combobox and normalizes an empty selection. Invalid payloads never partially change the filter.
   * @access protected
   * @since 1.0.0
   * @param {unknown} values - The combobox's untyped next selection.
   * @returns {void}
   */
  protected onValuesPicked(values: unknown): void {
    if (this.disabled()) return;
    if (values === null || values === undefined) {
      this.valuesChanged.emit([]);
      return;
    }
    if (!Array.isArray(values)) return;
    const selection: readonly unknown[] = values;
    if (!selection.every((value: unknown): value is string => typeof value === 'string')) return;
    this.valuesChanged.emit(selection);
  }

  /**
   * Method onMobileStateChanged
   * @method onMobileStateChanged
   * @description Seeds the draft once on each actual opening, including controlled openings, and clears search on dismissal.
   * @access protected
   * @since 1.0.0
   * @param {CollectionFilterPopoverState} state - The drawer's next state.
   * @returns {void}
   */
  protected onMobileStateChanged(state: CollectionFilterPopoverState): void {
    if (state === 'open' && !this.mobileDrawerVisible) {
      this.stagedSelection.set([...this.values()]);
    }
    if (state === 'closed') {
      this.mobileSearch.set('');
    }
    this.mobileDrawerVisible = state === 'open';
    this.stateChanged.emit(state);
  }

  /**
   * Method onMobileSearchChanged
   * @method onMobileSearchChanged
   * @description Updates the drawer's local search query without introducing form state.
   * @access protected
   * @since 1.0.0
   * @param {string} value - The native search input's current value.
   * @returns {void}
   */
  protected onMobileSearchChanged(value: string): void {
    this.mobileSearch.set(value);
  }

  /**
   * Method isStaged
   * @method isStaged
   * @description Returns whether one option belongs to the staged mobile selection.
   * @access protected
   * @since 1.0.0
   * @param {string} value - The option value to inspect.
   * @returns {boolean} Whether the option is staged.
   */
  protected isStaged(value: string): boolean {
    return this.stagedSelection().includes(value);
  }

  /**
   * Method onStagedChanged
   * @method onStagedChanged
   * @description Adds or removes one option in the staged mobile selection.
   * @access protected
   * @since 1.0.0
   * @param {string} value - The option value to update.
   * @param {boolean} checked - Whether the option should be selected.
   * @returns {void}
   */
  protected onStagedChanged(value: string, checked: boolean): void {
    if (this.disabled() || !this.mobileDrawerVisible) return;
    this.stagedSelection.update((selection: readonly string[]): readonly string[] =>
      checked
        ? selection.includes(value)
          ? selection
          : [...selection, value]
        : selection.filter((entry: string): boolean => entry !== value),
    );
  }

  /**
   * Method applyMobileSelection
   * @method applyMobileSelection
   * @description Commits once before explicitly closing the drawer; synchronous repeat activations are ignored.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected applyMobileSelection(): void {
    if (this.disabled() || !this.mobileDrawerVisible) return;
    this.mobileDrawerVisible = false;
    this.valuesChanged.emit(this.stagedSelection());
    this.drawer()?.close();
  }

  /**
   * Method mobileOptionId
   * @method mobileOptionId
   * @description Builds a stable, hydration-safe checkbox id from the trigger and option index.
   * @access protected
   * @since 1.0.0
   * @param {number} index - The option's current rendered index.
   * @returns {string} The checkbox id.
   */
  protected mobileOptionId(index: number): string {
    return `${this.triggerId()}-mobile-option-${index}`;
  }

  /**
   * Method optionOf
   * @method optionOf
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
   * @method hiddenValuesLabel
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
