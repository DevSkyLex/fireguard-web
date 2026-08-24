import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  type EffectRef,
  type InputSignal,
  type OutputEmitterRef,
  type TemplateRef,
} from '@angular/core';
import { BrnFieldA11yService } from '@spartan-ng/brain/field';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { COLLECTION_FILTER_VALUE_CLASS } from '../../../constants';
import type { CollectionFilterOption, CollectionFilterPopoverState } from '../../../models';

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
 * is cancelled on the host alone through `[&:not(button)]:p-0`. That string
 * is not lifted to a shared constant even though
 * `app-collection-filter-multi-select` repeats it mot pour mot: binding it
 * through `[class]` instead of the current literal attribute drops the
 * class from `hlm-combobox-trigger`'s own host entirely — Angular routes a
 * *bound* `class` fully into a component's `@Input('class')` alias, unlike a
 * static literal, which the compiler also keeps on the host attribute — and
 * the host's own `flex h-full self-stretch` is exactly what stretches this
 * trigger to `app-filter-chip`'s row height in the first place.
 *
 * {@link disabled} no longer disables the underlying `hlm-combobox`: the
 * brain-level trigger couples its native `disabled` attribute to `aria-disabled`
 * with no seam to set one without the other, and native `disabled` would drop
 * the trigger out of the tab order and stop it from receiving pointer events —
 * exactly the defect this shape now avoids. The trigger stays focusable and
 * clickable; {@link onValuePicked} refuses to emit while {@link disabled} is
 * set, so it reads as inert without being unreachable. {@link disabled} is
 * bound through `HlmComboboxTrigger`'s own `[ariaDisabled]` input, alongside
 * the plain `[attr.aria-disabled]` this trigger already carried: the plain
 * form only ever lands on `hlm-combobox-trigger` itself, never the `<button>`
 * it wraps, since Angular applies an `[attr.x]` binding to the literal
 * element it is written on (`@shared/ui/combobox`'s own doc has the full
 * account); `[ariaDisabled]` is the channel that actually reaches the
 * focusable, clickable node a screen reader lands on.
 *
 * {@link tooltip} renders nothing here any more, visually or through
 * `aria-describedby`: a 192px-capped trigger that already has to fit a value
 * pastille has no room left to also spell out a full sentence — measured at
 * 117px actually left for the reason once the value pastille is drawn,
 * against a 337px-wide sentence, and no `max-w-*` reconciles the two at a
 * 375px viewport. The reason now
 * renders as `app-filter-chip`'s own trailing row, at the chip's own width.
 * {@link tooltip} stays on this
 * component's public API, inert, only because `interventions-page.component.html`
 * still binds it at every call site; a caller may keep passing it, it is
 * simply never read.
 *
 * {@link describedBy} is the live channel that actually connects the trigger
 * to that reason row. `hlm-combobox-trigger`'s inner `<button>`
 * (`@shared/ui/combobox`) already carries `brnFieldControlDescribedBy`,
 * which optionally injects `BrnFieldA11yService` and reads its registered
 * description ids — but that lookup fails silently here by default: this
 * component itself is instantiated from a `ng-template` the owning page
 * declares, projected into `app-filter-chip` through `NgTemplateOutlet`, and
 * Angular DI resolves against a node's declaration site, never wherever it
 * is later rendered — `app-filter-chip`'s own `brnField`
 * (`@spartan-ng/brain/field`) is consequently invisible to it, however deep
 * inside the DOM the two end up sitting next to each other. This component
 * provides its own `BrnFieldA11yService` instance instead ({@link fieldA11y}):
 * `hlm-combobox-trigger` and its inner button genuinely are descendants of
 * *this* component in the injector tree, since they are declared directly in
 * its own template rather than projected in, so the very same
 * `brnFieldControlDescribedBy` — unmodified, still vendored, still
 * `shared/ui`'s own — picks the registration up automatically.
 * {@link syncDescribedBy} registers {@link describedBy} on that service
 * whenever it is set and unregisters it on change or teardown; no fix inside
 * `shared/ui` was needed or possible, since the DI break sits one level
 * above it.
 *
 * @version 2.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-filter-select',
  imports: [NgTemplateOutlet, ...HlmComboboxImports],
  providers: [BrnFieldA11yService],
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
   * @type {OutputEmitterRef<CollectionFilterPopoverState>}
   */
  public readonly stateChanged: OutputEmitterRef<CollectionFilterPopoverState> =
    output<CollectionFilterPopoverState>();
  //#endregion

  //#region Properties
  /**
   * Property valueClass
   * @readonly
   * @description The selected value's filled pastille, shared mot pour mot by every value control in this bar.
   * @access protected
   * @since 10.6.0
   * @type {string}
   */
  protected readonly valueClass: string = COLLECTION_FILTER_VALUE_CLASS;

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
   * Method onValuePicked
   * @description Normalizes the combobox's `undefined`-when-cleared value before re-emitting it. A no-op while {@link disabled} is set — the trigger stays clickable, so this is what keeps a pick inert rather than merely invisible.
   * @access protected
   * @since 1.0.0
   * @param {string | null | undefined} value - The combobox's next value.
   * @returns {void}
   */
  protected onValuePicked(value: string | null | undefined): void {
    if (this.disabled()) return;
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
