import {
  ChangeDetectionStrategy,
  Component,
  output,
  input,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { HlmSeparator } from '@shared/ui/separator';

/**
 * Component FilterChip
 * @class FilterChip
 *
 * @description
 * The Linear-style segmented shell one active list filter renders as: a
 * field segment (icon + label), a static "is" operator, the caller's own
 * value control projected in the middle, and a remove button — each segment
 * separated by a hairline `border-border`.
 *
 * The value segment is deliberately not this component's concern: it is
 * projected content, so the page composes whatever control the field needs
 * (an `hlm-select` with a plain label, or one rendering `app-intervention-tag`)
 * without this shell knowing about intervention models. That is what keeps
 * it domain-agnostic and portable to another list's filter bar despite
 * living under this page today — `interventions-page` is its only consumer,
 * so it stays local rather than in `shared/` until a second one appears
 * (`ARCHITECTURE.md` §2.8–§2.9).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-filter-chip
 *   fieldLabel="Status"
 *   icon="lucideCircleDot"
 *   [removeLabel]="removeFilterLabel('Status')"
 *   (removed)="applyFilter({ status: null })"
 * >
 *   <hlm-select ...>…</hlm-select>
 * </app-filter-chip>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-filter-chip',
  imports: [NgIcon, HlmSeparator],
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
  //#endregion

  //#region Outputs
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
}
