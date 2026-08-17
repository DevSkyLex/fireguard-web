import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
  input,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
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
 * separated by a hairline `border-border`.
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
 * @version 3.1.0
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
  imports: [NgIcon, HlmSeparator, ...HlmSelectImports],
  providers: [provideIcons({ lucideX })],
  templateUrl: './filter-chip.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterChip {
  /**
   * Property nextInstanceId
   * @static
   *
   * @description
   * Per-class counter backing {@link operatorTriggerId}, so several chips
   * rendered at once never collide on the same DOM id.
   *
   * @access private
   * @since 3.0.0
   *
   * @type {number}
   */
  private static nextInstanceId: number = 0;

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
   * Property operatorTriggerId
   * @readonly
   * @description This instance's own DOM id for the operator select trigger, so several chips rendered at once never share one.
   * @access protected
   * @since 3.0.0
   * @type {string}
   */
  protected readonly operatorTriggerId: string = `filter-chip-operator-${++FilterChip.nextInstanceId}`;

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
    if (operator) this.operatorChanged.emit(operator);
  }
  //#endregion
}
