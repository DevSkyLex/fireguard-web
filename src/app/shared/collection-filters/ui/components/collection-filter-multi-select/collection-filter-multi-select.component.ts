import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmTooltip } from '@shared/ui/tooltip';
import type { CollectionFilterOption } from '../../../models';

/**
 * Component CollectionFilterMultiSelect
 * @class CollectionFilterMultiSelect
 *
 * @description
 * The value segment every `is any of` / `is none of` filter chip projects into
 * `app-filter-chip`: a searchable multi-select built on spartan's combobox,
 * rendering the current selection as up to {@link maxVisible} identical filled
 * chips followed by a `+N` overflow marker. Presentational
 * (`ARCHITECTURE.md` §10.3) — it owns no filter state, it reports the next
 * selection through {@link valuesChanged} and lets the page decide.
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
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-filter-multi-select',
  imports: [NgTemplateOutlet, HlmTooltip, ...HlmComboboxImports],
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
   * @description The popover search box's placeholder.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly searchPlaceholder: InputSignal<string> = input.required<string>();

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
   * @type {InputSignal<'open' | 'closed'>}
   */
  public readonly state: InputSignal<'open' | 'closed'> = input<'open' | 'closed'>('closed');

  /**
   * Property disabled
   * @readonly
   * @description Whether this surface can apply the field at all. Dims the trigger and blocks the popover.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property tooltip
   * @readonly
   * @description Why the field cannot be applied, when it cannot. Empty renders no tooltip.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly tooltip: InputSignal<string> = input<string>('');

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
   * @type {OutputEmitterRef<'open' | 'closed'>}
   */
  public readonly stateChanged: OutputEmitterRef<'open' | 'closed'> = output<'open' | 'closed'>();
  //#endregion

  //#region Properties
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
      ?.label ?? value;
  //#endregion

  //#region Methods
  /**
   * Method onValuesPicked
   * @description Normalizes the combobox's `null`-when-empty selection to an array before re-emitting it.
   * @access protected
   * @since 1.0.0
   * @param {readonly string[] | null | undefined} values - The combobox's next selection.
   * @returns {void}
   */
  protected onValuesPicked(values: readonly string[] | null | undefined): void {
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
  //#endregion
}
