import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
  type ElementRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { BrnField, BrnFieldControlDescribedBy } from '@spartan-ng/brain/field';
import { HlmFieldDescription } from '@shared/ui/field';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSeparator } from '@shared/ui/separator';
import type { CollectionFilterOperator } from '../../../models';
import { collectionFilterOperatorLabel } from '../../../utils';

/**
 * Component FilterChip
 * @class FilterChip
 *
 * @description
 * The Linear-style segmented shell one active list filter renders as: a
 * field segment (icon + label), an operator segment, the caller's own value
 * control projected in the middle, and a remove button — each segment
 * separated by a hairline `border-border`. The root clips to its own rounded
 * corners (`overflow-hidden`, so an end segment's hover surface never spills
 * past them), which is why the operator trigger and remove button draw their
 * focus ring inward (`outline` + a negative `outline-offset`) rather than
 * with the usual `ring-*` utilities — an outward box-shadow ring at either
 * end edge would clip against that same `overflow-hidden`.
 *
 * The operator segment reads {@link operator} and {@link operatorOptions}: a
 * field declaring exactly one operator (`operatorOptions().length === 1`,
 * the common case today) renders it as the earlier fixed, read-only label,
 * unchanged in appearance; a field declaring more renders an `hlm-select` in
 * its place, restyled flush the same way the value segment already is, and
 * emits {@link operatorChanged} on a pick. Either way the label text comes
 * from `collectionFilterOperatorLabel` (`@shared/collection-filters`), never
 * a hardcoded string, so a field's operator vocabulary is entirely
 * feature-declared.
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
 * A chip whose field turned unavailable while still active ({@link disabled})
 * dims but never disappears: it still narrows the collection, it just cannot
 * be changed here any more. Only the operator segment goes inert: it carries
 * `aria-disabled` rather than the native attribute, so it stays reachable by
 * keyboard, and {@link onOperatorPicked} is what actually makes the
 * activation a no-op. The **remove button stays live** — a narrowing this
 * surface cannot apply is the one a user most wants gone, and blocking it
 * would leave "Clear filters", which drops every other filter too, as the
 * only way out. The
 * operator segment's `hlm-select-trigger` carries {@link disabled} twice: a
 * plain `[attr.aria-disabled]`, which only ever lands on `hlm-select-trigger`
 * itself, and `HlmSelectTrigger`'s own `[ariaDisabled]` input, which is what
 * actually reaches the `<button>` a screen reader focuses
 * (`@shared/ui/select`'s own doc has the full account).
 *
 * {@link unavailableReason}, when set, renders as this chip's own trailing
 * row — a full-width block under the segmented row rather than squeezed
 * inside a value trigger. That trigger (`app-collection-filter-select` and
 * its three siblings) is a 192px-capped box that already has to fit a value
 * pastille; no `max-w-*` reconciles that with a full sentence at a 375px
 * viewport. This shell owns the chip's own width and, at `flex-wrap`, the
 * whole row it sits in, so the reason gets to actually be read rather than
 * truncated to a fifth of itself.
 *
 * The root carries `brnField`, providing a `BrnFieldA11yService` scoped to
 * this one chip instance; the reason row carries `hlmFieldDescription`
 * (`@shared/ui/field`), registering {@link reasonId} with it while
 * {@link unavailableReason} is set — unmounted, and so unregistered, the rest
 * of the time. Two descendants pick that registration up automatically
 * through `brnFieldControlDescribedBy`: the remove button, which carries it
 * directly, and the operator segment's `hlm-select-trigger`
 * (`@shared/ui/select`), which already carries it on its own inner `<button>`
 * for a wholly unrelated reason (`HlmSelectTrigger`'s own class doc) —
 * neither this component nor that one has to know about the other for the
 * wiring to reach the actual focusable node a screen reader lands on.
 * `BrnFieldA11yService`'s optional injection is what makes it work at all
 * despite `hlm-select` and `hlm-select-trigger` being separate components:
 * regular Angular DI, unlike `HlmFieldDescription`'s own `host: true`
 * injection, crosses component boundaries as long as no closer provider
 * shadows it. The projected value control no longer renders or describes
 * this reason itself — see `app-collection-filter-select`'s own class doc.
 *
 * @version 3.5.0
 *
 * @example
 * ```html
 * <app-filter-chip
 *   fieldLabel="Status"
 *   icon="lucideCircleDot"
 *   testIdPrefix="interventions"
 *   [removeLabel]="removeFilterLabel('Status')"
 *   [operator]="'equals'"
 *   [operatorOptions]="['equals']"
 *   [changeOperatorLabel]="changeOperatorLabel('Status')"
 *   [operatorTriggerId]="'interventions-filter-chip-operator-status'"
 *   (removed)="applyFilter({ status: null })"
 *   (operatorChanged)="onOperatorChanged('status', $event)"
 * >
 *   <hlm-select ...>…</hlm-select>
 * </app-filter-chip>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-filter-chip',
  imports: [
    NgIcon,
    HlmSeparator,
    BrnField,
    BrnFieldControlDescribedBy,
    HlmFieldDescription,
    ...HlmSelectImports,
  ],
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
   * Property operator
   * @readonly
   *
   * @description
   * This narrowing's currently active operator, rendered on the operator
   * segment.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<CollectionFilterOperator>}
   */
  public readonly operator: InputSignal<CollectionFilterOperator> =
    input.required<CollectionFilterOperator>();

  /**
   * Property operatorOptions
   * @readonly
   *
   * @description
   * The field's declared operator vocabulary, in picker order. A single
   * entry renders the operator segment as a fixed label; more than one
   * renders it as a select offering every entry.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<readonly CollectionFilterOperator[]>}
   */
  public readonly operatorOptions: InputSignal<readonly CollectionFilterOperator[]> =
    input.required<readonly CollectionFilterOperator[]>();

  /**
   * Property changeOperatorLabel
   * @readonly
   *
   * @description
   * The operator select's accessible name, distinct per chip instance — only
   * read when {@link operatorOptions} offers more than one entry.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly changeOperatorLabel: InputSignal<string> = input.required<string>();

  /**
   * Property operatorTriggerId
   * @readonly
   *
   * @description
   * This instance's own DOM id for the operator select trigger, and the
   * `for` target of the `sr-only` label naming it. Fed by
   * `CollectionFilterBar` (`@shared/collection-filters`), deterministic from
   * its `testIdPrefix` and the field's own key — never a per-instance
   * counter, which cannot stay identical between the server-rendered markup
   * and the client's hydrated one, since a server process outlives one
   * request while the client always restarts its own count from zero.
   *
   * @access public
   * @since 3.4.0
   *
   * @type {InputSignal<string>}
   */
  public readonly operatorTriggerId: InputSignal<string> = input.required<string>();

  /**
   * Property operatorLabels
   * @readonly
   *
   * @description
   * Field-specific operator labels, overriding `collectionFilterOperatorLabel`'s
   * generic wording for the operators this map lists — e.g. a date field
   * reading "after" rather than the generic "greater than". Omitted entries
   * still fall back to the generic registry.
   *
   * @access public
   * @since 8.1.0
   *
   * @type {InputSignal<Readonly<Partial<Record<CollectionFilterOperator, string>>>>}
   */
  public readonly operatorLabels: InputSignal<
    Readonly<Partial<Record<CollectionFilterOperator, string>>>
  > = input<Readonly<Partial<Record<CollectionFilterOperator, string>>>>({});

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

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether the narrowed field can no longer be applied by this surface —
   * `CollectionFilterField.unavailableReason` set. Dims the whole chip and
   * neutralizes the operator segment — without pulling it out of the keyboard
   * order: it carries `aria-disabled`, never the native `disabled` attribute,
   * and guards its own handler so an activation stays inert. The remove
   * button is deliberately left alone, so the narrowing stays dismissible.
   * An active narrowing on a field this surface cannot apply still needs to
   * say why, visibly — see {@link CollectionFilterBar}.
   *
   * @access public
   * @since 8.2.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property unavailableReason
   * @readonly
   *
   * @description
   * Why {@link disabled} is set, when it is — `CollectionFilterField.unavailableReason`,
   * read and forwarded by `CollectionFilterBar`. Empty renders no reason row
   * at all. See the class doc for why this shell, not the projected value
   * control, is what renders it.
   *
   * @access public
   * @since 8.3.0
   *
   * @type {InputSignal<string>}
   */
  public readonly unavailableReason: InputSignal<string> = input<string>('');

  /**
   * Property reasonId
   * @readonly
   *
   * @description
   * The `id` {@link unavailableReason}'s own row renders under, supplied by
   * `CollectionFilterBar` (`reasonIdFor`) — see the class doc for why the
   * same id is safe to reuse from the "+ Filter" menu's reason text for this
   * same field. Read even while {@link unavailableReason} is empty, in which
   * case it targets nothing rendered.
   *
   * @access public
   * @since 8.3.0
   *
   * @type {InputSignal<string>}
   */
  public readonly reasonId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Outputs
  /**
   * Property operatorChanged
   * @readonly
   *
   * @description
   * Emitted when the operator select picks a different entry from
   * {@link operatorOptions}. Never emitted while the segment renders as a
   * fixed label — a single-entry field has nothing to pick.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {OutputEmitterRef<CollectionFilterOperator>}
   */
  public readonly operatorChanged: OutputEmitterRef<CollectionFilterOperator> =
    output<CollectionFilterOperator>();

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
   * Property operatorTestId
   * @readonly
   * @description The operator segment's `<prefix>-filter-chip-operator` `data-testid`.
   * @access protected
   * @since 3.0.0
   * @type {Signal<string>}
   */
  protected readonly operatorTestId: Signal<string> = computed<string>(
    () => `${this.testIdPrefix()}-filter-chip-operator`,
  );

  /**
   * Property reasonTestId
   * @readonly
   * @description The reason row's own `<prefix>-filter-chip-reason` `data-testid`, rendered only while {@link unavailableReason} is set.
   * @access protected
   * @since 8.3.0
   * @type {Signal<string>}
   */
  protected readonly reasonTestId: Signal<string> = computed<string>(
    () => `${this.testIdPrefix()}-filter-chip-reason`,
  );

  /**
   * Property removeButtonRef
   * @readonly
   * @description This chip's own remove button element, so {@link focusRemove} can move real DOM focus to it without querying the DOM.
   * @access private
   * @since 3.4.0
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  private readonly removeButtonRef: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('removeButton');

  /**
   * Property hasOperatorChoice
   * @readonly
   * @description Whether the operator segment renders as a select rather than a fixed label.
   * @access protected
   * @since 3.0.0
   * @type {Signal<boolean>}
   */
  protected readonly hasOperatorChoice: Signal<boolean> = computed<boolean>(
    () => this.operatorOptions().length > 1,
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

  /**
   * Property operatorLabelOf
   * @readonly
   * @description Resolves an operator's label: {@link operatorLabels}' own entry when set, the generic registry otherwise. An arrow field, not a method, so it stays bound when passed as `[itemToString]`.
   * @access protected
   * @since 3.0.0
   * @type {(operator: CollectionFilterOperator) => string}
   */
  protected readonly operatorLabelOf: (operator: CollectionFilterOperator) => string = (
    operator: CollectionFilterOperator,
  ): string => this.operatorLabels()[operator] ?? collectionFilterOperatorLabel(operator);
  //#endregion

  //#region Methods
  /**
   * Method focusRemove
   *
   * @description
   * Moves real DOM focus to this chip's own remove button. Called by
   * `CollectionFilterBar` (`@shared/collection-filters`), which alone knows
   * what should receive focus once a sibling chip disappears from the row —
   * this shell only exposes the means, never decides the target itself.
   *
   * @access public
   * @since 3.4.0
   *
   * @returns {void}
   */
  public focusRemove(): void {
    this.removeButtonRef()?.nativeElement.focus();
  }

  /**
   * Method onOperatorPicked
   *
   * @description
   * Reacts to the operator select's `valueChange`, which `hlm-select`
   * types as nullable for a clearable select — this one never clears, every
   * item maps to a real operator, so a `null`/`undefined` emission is
   * unreachable and only ever guarded to satisfy that shared type.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {CollectionFilterOperator | null | undefined} operator - The picked operator.
   *
   * @returns {void}
   */
  protected onOperatorPicked(operator: CollectionFilterOperator | null | undefined): void {
    if (this.disabled()) return;
    if (operator) this.operatorChanged.emit(operator);
  }

  /**
   * Method onRemoveClicked
   * @description Reacts to the remove segment's activation. Stays live even while {@link disabled} is set: a narrowing this surface cannot apply is exactly the one a user most wants gone, and blocking removal would leave "Clear filters" — which drops every other filter too — as the only way out.
   * @access protected
   * @since 8.3.0
   * @returns {void}
   */
  protected onRemoveClicked(): void {
    this.removed.emit();
  }
  //#endregion
}
