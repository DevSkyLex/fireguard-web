import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type TemplateRef,
} from '@angular/core';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmTooltip } from '@shared/ui/tooltip';
import type { CollectionFilterOption } from '../../../models';

/**
 * Component CollectionFilterSelect
 * @class CollectionFilterSelect
 *
 * @description
 * The single-value twin of `app-collection-filter-multi-select`: the value
 * segment an `is` / `is not` filter chip projects into `app-filter-chip`,
 * rendering the current value as the same filled chip its multi-value
 * sibling uses, so a filter bar reads as one row whichever operator each of
 * its chips carries. Presentational (`ARCHITECTURE.md` §10.3) — it reports
 * the next value through {@link valueChanged} and owns no filter state.
 *
 * It is a separate component rather than a `multiple` flag on the
 * multi-select because spartan binds the two to different brain directives,
 * and a single-choice list announced as multi-selectable is an accessibility
 * defect, not a styling detail.
 *
 * Domain-agnostic by construction: `{ value, label }` options and plain
 * strings for every user-visible word, so `shared/` never imports a feature's
 * models and the `$localize` ids stay in the owning feature.
 * {@link optionTemplate} gives a field whose options deserve an icon or a
 * colour dot its richer row, and {@link valueTemplate} puts that same body
 * inside the selected value's chip; the chip's own box stays this component's.
 *
 * `hlm-combobox-trigger`'s class lands on both the host element and the inner
 * button, so the padding that draws the hover surface sits on the button and
 * is cancelled on the host alone through `[&:not(button)]:p-0`.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-filter-select',
  imports: [NgTemplateOutlet, HlmTooltip, ...HlmComboboxImports],
  templateUrl: './collection-filter-select.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionFilterSelect {
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
   * Property value
   * @readonly
   * @description The value currently narrowing the collection, `null` when the field carries none.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly value: InputSignal<string | null> = input.required<string | null>();

  /**
   * Property placeholder
   * @readonly
   * @description What the trigger reads while no value is set — the field's own label.
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
   * Property valueChanged
   * @readonly
   * @description The value after a pick, `null` once the field carries no narrowing any more.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string | null>}
   */
  public readonly valueChanged: OutputEmitterRef<string | null> = output<string | null>();

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
   * Method onValuePicked
   * @description Normalizes the combobox's `undefined`-when-cleared value before re-emitting it.
   * @access protected
   * @since 1.0.0
   * @param {string | null | undefined} value - The combobox's next value.
   * @returns {void}
   */
  protected onValuePicked(value: string | null | undefined): void {
    this.valueChanged.emit(value ?? null);
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
