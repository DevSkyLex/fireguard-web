import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';

/**
 * Component InterventionPublicationSummary
 * @class InterventionPublicationSummary
 *
 * @description
 * What publishing is about to write to the compliance record: how many proposed
 * changes, how many recorded inspections, and at which revision.
 *
 * Rendered in two places from this one definition — the rail's publication
 * group and the body of the publish confirmation. That is what makes "the
 * confirmation *is* the recap" true by construction rather than by discipline:
 * the two cannot drift because there is only one of them.
 *
 * Laid out as a stacked `<dl>` for the same reason: it has to read correctly at
 * the rail's ~256px and in a dialog twice that wide, and a horizontal stat strip
 * only works at one of them.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-publication-summary
 *   [pendingChanges]="pendingChangesCount()"
 *   [inspections]="intervention().inspectionsCount"
 *   [revision]="intervention().revision"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-publication-summary',
  templateUrl: './intervention-publication-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionPublicationSummary {
  //#region Inputs
  /**
   * Property pendingChanges
   * @readonly
   * @description How many proposed changes publication would apply.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly pendingChanges: InputSignal<number> = input.required<number>();

  /**
   * Property inspections
   * @readonly
   * @description How many inspections the intervention recorded.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly inspections: InputSignal<number> = input.required<number>();

  /**
   * Property revision
   * @readonly
   *
   * @description
   * The revision publication is pinned to, which is what makes the write
   * all-or-nothing against a concurrent edit.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly revision: InputSignal<number> = input.required<number>();
  //#endregion
}
