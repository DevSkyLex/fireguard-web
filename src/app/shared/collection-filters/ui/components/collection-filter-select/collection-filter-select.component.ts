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
  type EffectRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideSearch } from '@ng-icons/lucide';
import { BrnCommandInput } from '@spartan-ng/brain/command';
import { BrnFieldA11yService } from '@spartan-ng/brain/field';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmCommandImports } from '@shared/ui/command';
import { HlmDrawerImports } from '@shared/ui/drawer';
import { HlmInputGroupImports } from '@shared/ui/input-group';
import { COLLECTION_FILTER_VALUE_CLASS } from '../../../constants';
import type { CollectionFilterOption, CollectionFilterPopoverState } from '../../../models';

import type { CollectionFilterOptionGroup } from './models/collection-filter-option-group.interface';

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
  imports: [
    NgIcon,
    NgTemplateOutlet,
    BrnCommandInput,
    HlmInputGroupImports,
    HlmButton,
    HlmCommandImports,
    ...HlmComboboxImports,
    ...HlmDrawerImports,
  ],
  providers: [BrnFieldA11yService, provideIcons({ lucideCheck, lucideSearch })],
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
   * @description The desktop combobox search placeholder. Mobile Command always keeps its keyboard-navigation input and falls back to {@link accessibleName} when this value is absent.
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
   * Property mobileSearch
   * @readonly
   *
   * @description
   * Ephemeral query owned by the mobile Command and cleared on dismissal.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly mobileSearch: WritableSignal<string> = signal<string>('');

  /**
   * Property optionGroups
   * @readonly
   *
   * @description
   * Catalog entries grouped in first-seen order. Spartan Command owns mobile
   * filtering so hidden options and its native empty state stay synchronized.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly CollectionFilterOptionGroup[]>}
   */
  protected readonly optionGroups: Signal<readonly CollectionFilterOptionGroup[]> = computed<
    readonly CollectionFilterOptionGroup[]
  >(() => {
    const groups = new Map<string, CollectionFilterOptionGroup>();

    for (const option of this.options()) {
      const key: string = option.group ?? '';
      const existing: CollectionFilterOptionGroup | undefined = groups.get(key);
      if (existing) {
        groups.set(key, { ...existing, options: [...existing.options, option] });
        continue;
      }

      groups.set(key, {
        key,
        label: option.groupLabel ?? null,
        options: [option],
      });
    }

    return Array.from(groups.values());
  });

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
  //#endregion

  //#region Methods
  /**
   * Method onValuePicked
   * @method onValuePicked
   * @description Accepts only strings or an empty selection from the combobox, ignoring malformed or disabled picks.
   * @access protected
   * @since 1.0.0
   * @param {unknown} value - The combobox's untyped next value.
   * @returns {void}
   */
  protected onValuePicked(value: unknown): void {
    if (this.disabled()) return;
    if (typeof value !== 'string' && value !== null && value !== undefined) return;
    this.valueChanged.emit(value ?? null);
  }

  /**
   * Method onMobileStateChanged
   * @method onMobileStateChanged
   *
   * @description
   * Mirrors drawer state to the existing overlay contract and clears its query on dismissal.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CollectionFilterPopoverState} state - The drawer's next state.
   * @returns {void}
   */
  protected onMobileStateChanged(state: CollectionFilterPopoverState): void {
    if (state === 'closed') this.mobileSearch.set('');
    this.stateChanged.emit(state);
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
  //#endregion
}
