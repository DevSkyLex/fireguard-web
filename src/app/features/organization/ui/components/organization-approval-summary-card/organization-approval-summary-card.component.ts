import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type {
  OrganizationApprovalActionRule,
  OrganizationApprovalSettings,
} from '@features/organization/models';
import { HlmCardImports } from '@shared/ui/card';
import { HlmTableImports } from '@shared/ui/table';

/**
 * Component OrganizationApprovalSummaryCard
 * @class OrganizationApprovalSummaryCard
 *
 * @description
 * A read-only summary of the organization's four-eyes approval policy:
 * every customized action rule, self-approval, and the request TTL. Renders
 * no edit control by design — the approvals inbox that would let a reader
 * act on a gated request does not exist yet, so activating an undecidable
 * policy would strand requests (`FEATURE.md`).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-approval-summary-card [approval]="settings().approval" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-approval-summary-card',
  imports: [...HlmCardImports, ...HlmTableImports],
  templateUrl: './organization-approval-summary-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationApprovalSummaryCard {
  //#region Inputs
  /**
   * Property approval
   * @readonly
   * @description The policy to summarize.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<OrganizationApprovalSettings>}
   */
  public readonly approval: InputSignal<OrganizationApprovalSettings> =
    input.required<OrganizationApprovalSettings>();
  //#endregion

  //#region Properties
  /**
   * Property actionRuleEntries
   * @readonly
   * @description The customized action rules as renderable rows; every action type absent here is disabled.
   * @access protected
   * @since 1.0.0
   * @type {Signal<ReadonlyArray<[string, OrganizationApprovalActionRule]>>}
   */
  protected readonly actionRuleEntries: Signal<
    ReadonlyArray<[string, OrganizationApprovalActionRule]>
  > = computed(() => Object.entries(this.approval().actionRules));

  /**
   * Property ttlText
   * @readonly
   *
   * @description
   * The request-expiry line, built here rather than interpolated in the
   * template: a named `$localize` placeholder extracts as one translatable
   * sentence, where a template interpolation would extract as a positional
   * `INTERPOLATION` id a translator cannot reorder.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly ttlText: Signal<string> = computed(
    () =>
      $localize`:@@org.settings.approval.ttlValue:Requests expire after ${this.approval().approvalTtlDays}:days: days`,
  );
  //#endregion

  //#region Methods
  /**
   * Method actionTypeLabel
   * @method actionTypeLabel
   *
   * @description
   * Renders a raw action type key (`nc_waiver`) as a readable label
   * (`Nc waiver`). No catalog backs this yet — the Approval module has no
   * frontend surface beyond this read-only summary.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} actionType - The raw action type key.
   *
   * @returns {string} The readable label.
   */
  protected actionTypeLabel(actionType: string): string {
    const spaced: string = actionType.replaceAll('_', ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }
  //#endregion
}
