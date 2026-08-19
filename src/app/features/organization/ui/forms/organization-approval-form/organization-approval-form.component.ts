import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, max, min, type FieldTree } from '@angular/forms/signals';
import type { ApprovalActionTypeOutput } from '@features/organization/features/approvals/models';
import type { OrganizationApprovalSettings } from '@features/organization/models';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSwitch } from '@shared/ui/switch';
import { NO_MINIMUM_SEVERITY } from './constants/no-minimum-severity.constants';
import type { OrganizationApprovalFormDraft, OrganizationApprovalFormValues } from './models';
import {
  ORGANIZATION_APPROVAL_ROLE_OPTIONS,
  ORGANIZATION_APPROVAL_SEVERITY_OPTIONS,
} from './options';

/**
 * Constant DEFAULT_MIN_APPROVER_ROLE
 * @const DEFAULT_MIN_APPROVER_ROLE
 *
 * @description
 * Mirrors the backend's `OrganizationApprovalDefaults::MIN_APPROVER_ROLE` —
 * the row a catalog action type starts from before it is ever customized.
 *
 * @since 1.0.0
 * @type {string}
 */
const DEFAULT_MIN_APPROVER_ROLE: string = 'admin';

/**
 * Constant MIN_APPROVAL_TTL_DAYS
 * @description Lower bound the backend accepts for `approvalTtlDays`.
 * @since 1.0.0
 * @type {number}
 */
const MIN_APPROVAL_TTL_DAYS: number = 1;

/**
 * Constant MAX_APPROVAL_TTL_DAYS
 * @description Upper bound the backend accepts for `approvalTtlDays`.
 * @since 1.0.0
 * @type {number}
 */
const MAX_APPROVAL_TTL_DAYS: number = 90;

/**
 * Constant SEVERITY_GATED_ACTION_TYPE
 * @description The one action type whose rule carries a `minSeverity` — every other type's severity select stays hidden.
 * @since 1.0.0
 * @type {string}
 */
const SEVERITY_GATED_ACTION_TYPE: string = 'nc_waiver';

/**
 * Component OrganizationApprovalForm
 * @class OrganizationApprovalForm
 *
 * @description
 * The organization's four-eyes approval policy, now editable: one rule row
 * per regulated action type from {@link actionTypes} (enabled toggle,
 * minimum approver role, and — `nc_waiver` only — a minimum severity),
 * self-approval, and the request TTL. Replaces
 * `OrganizationApprovalSummaryCard` on the settings Compliance tab now that
 * the approvals inbox exists to act on a gated request — the invariant that
 * kept this read-only is lifted (`organization/FEATURE.md`).
 *
 * `approval.actionRules` from the API carries only the CUSTOMIZED action
 * types (`OrganizationApprovalSettingsOutput`'s own contract); this form
 * seeds every catalog row with either its customization or the "disabled"
 * default, and always submits the full row set on save — the same
 * full-map-on-submit shape `OrganizationComplianceForm` already uses for
 * its two effective-value maps. `minSeverity` edits as the
 * `NO_MINIMUM_SEVERITY` sentinel internally (Signal Forms binds a plain
 * string enum more simply than a nullable one) and converts to `null` only
 * in {@link submit}, at the emit boundary.
 *
 * It owns its model and rules and emits {@link submitted}; the page maps
 * the values onto the settings PATCH and calls the store
 * (`ARCHITECTURE.md` §10.4).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-organization-approval-form
 *   [approval]="settings().approval"
 *   [actionTypes]="approvalActionTypes()"
 *   [pending]="store.isSaving()"
 *   (submitted)="save($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-approval-form',
  imports: [FormField, HlmButton, HlmInput, HlmSwitch, ...HlmFieldImports, ...HlmSelectImports],
  templateUrl: './organization-approval-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationApprovalForm {
  //#region Inputs
  /**
   * Property approval
   * @readonly
   * @description The values the form starts from, and re-seeds to whenever they change.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<OrganizationApprovalSettings>}
   */
  public readonly approval: InputSignal<OrganizationApprovalSettings> =
    input.required<OrganizationApprovalSettings>();

  /**
   * Property actionTypes
   * @readonly
   * @description The regulated action-type catalog (`approvals/data-access`'s `listActionTypes`), deciding which rows render.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<ApprovalActionTypeOutput>>}
   */
  public readonly actionTypes: InputSignal<ReadonlyArray<ApprovalActionTypeOutput>> = input<
    ReadonlyArray<ApprovalActionTypeOutput>
  >([]);

  /**
   * Property pending
   * @readonly
   * @description Whether a save is in flight, which disables the submit control.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the edited values once the form is valid and has changed.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<OrganizationApprovalFormValues>}
   */
  public readonly submitted: OutputEmitterRef<OrganizationApprovalFormValues> =
    output<OrganizationApprovalFormValues>();
  //#endregion

  //#region Properties
  /** The minimum-approver-role picker's choices. */
  protected readonly roleOptions: typeof ORGANIZATION_APPROVAL_ROLE_OPTIONS =
    ORGANIZATION_APPROVAL_ROLE_OPTIONS;

  /** The `nc_waiver` minimum-severity picker's choices. */
  protected readonly severityOptions: typeof ORGANIZATION_APPROVAL_SEVERITY_OPTIONS =
    ORGANIZATION_APPROVAL_SEVERITY_OPTIONS;

  /** The one action type whose row renders a severity select. */
  protected readonly severityGatedActionType: string = SEVERITY_GATED_ACTION_TYPE;

  /** The "no minimum" sentinel the severity select's extra option carries. */
  protected readonly noMinimumSeverity: string = NO_MINIMUM_SEVERITY;

  /**
   * Property model
   * @readonly
   *
   * @description
   * The edited draft, re-seeded from {@link approval} and {@link actionTypes}
   * whenever either changes: one row per catalog action type, defaulted for
   * any type absent from `approval.actionRules`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<OrganizationApprovalFormDraft>}
   */
  protected readonly model: WritableSignal<OrganizationApprovalFormDraft> = linkedSignal(
    (): OrganizationApprovalFormDraft => {
      const approval: OrganizationApprovalSettings = this.approval();

      const actionRules: Record<
        string,
        { enabled: boolean; minApproverRole: string; minSeverity: string }
      > = {};

      for (const type of this.actionTypes()) {
        const existing = approval.actionRules[type.value];
        actionRules[type.value] = {
          enabled: existing?.enabled ?? false,
          minApproverRole: existing?.minApproverRole ?? DEFAULT_MIN_APPROVER_ROLE,
          minSeverity: existing?.minSeverity ?? NO_MINIMUM_SEVERITY,
        };
      }

      return {
        actionRules,
        allowSelfApproval: approval.allowSelfApproval,
        approvalTtlDays: approval.approvalTtlDays,
      };
    },
  );

  /**
   * Property approvalForm
   * @readonly
   * @description The field tree and its rules. `actionRules` carries one dynamic sub-field per catalog action type; `approvalTtlDays` is bounded to what the backend accepts.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<OrganizationApprovalFormDraft>}
   */
  protected readonly approvalForm: FieldTree<OrganizationApprovalFormDraft> = form(
    this.model,
    (path): void => {
      min(path.approvalTtlDays, MIN_APPROVAL_TTL_DAYS, {
        message: $localize`:@@org.settings.approval.ttlTooLow:Enter at least ${MIN_APPROVAL_TTL_DAYS}:min: day`,
      });
      max(path.approvalTtlDays, MAX_APPROVAL_TTL_DAYS, {
        message: $localize`:@@org.settings.approval.ttlTooHigh:Enter at most ${MAX_APPROVAL_TTL_DAYS}:max: days`,
      });
    },
  );

  /**
   * Property canSubmit
   * @readonly
   * @description Whether the submit control should be enabled: the tree is valid, has changed from the seeded values, and no save is already in flight.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canSubmit: Signal<boolean> = computed<boolean>(
    () => this.approvalForm().valid() && this.approvalForm().dirty() && !this.pending(),
  );
  //#endregion

  //#region Methods
  /**
   * Method actionTypeLabelOf
   * @description Resolves an action-type value to its catalog label.
   * @access protected
   * @since 1.0.0
   * @param {string} value - The action-type key.
   * @returns {string} The catalog label, or the raw key if not found.
   */
  protected actionTypeLabelOf(value: string): string {
    return this.actionTypes().find((type) => type.value === value)?.label ?? value;
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Marks the form touched so every failing rule becomes visible, then —
   * only if it is valid and changed — converts every row's
   * {@link noMinimumSeverity} sentinel back to `null` and emits.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The native submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.approvalForm().markAsTouched();

    if (!this.canSubmit()) return;

    const draft: OrganizationApprovalFormDraft = this.model();
    const actionRules: Record<string, OrganizationApprovalFormValues['actionRules'][string]> = {};

    for (const [type, rule] of Object.entries(draft.actionRules)) {
      actionRules[type] = {
        enabled: rule.enabled,
        minApproverRole: rule.minApproverRole,
        minSeverity: rule.minSeverity === NO_MINIMUM_SEVERITY ? null : rule.minSeverity,
      };
    }

    this.submitted.emit({
      actionRules,
      allowSelfApproval: draft.allowSelfApproval,
      approvalTtlDays: draft.approvalTtlDays,
    });
  }
  //#endregion
}
