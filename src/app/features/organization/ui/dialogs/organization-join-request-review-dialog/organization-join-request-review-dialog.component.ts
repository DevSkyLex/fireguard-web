import {
  ChangeDetectionStrategy,
  Component,
  input,
  linkedSignal,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, disabled, required, type FieldTree } from '@angular/forms/signals';
import type { OrganizationJoinRequestOutput } from '@features/organization/models';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSelectImports } from '@shared/ui/select';
/**
 * Component OrganizationJoinRequestReviewDialog
 * @class OrganizationJoinRequestReviewDialog
 * @description Reviews a membership request with explicit authorized roles. Approval is unavailable until a role is selected and server actions allow it.
 * @since 1.0.0
 */
@Component({
  selector: 'app-organization-join-request-review-dialog',
  imports: [FormField, HlmDialogImports, HlmSelectImports, HlmFieldImports, HlmButton],
  templateUrl: './organization-join-request-review-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationJoinRequestReviewDialog {
  /**
   * Property request
   * @readonly
   * @description Request under review, null closes the dialog.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<OrganizationJoinRequestOutput | null>}
   */
  public readonly request: InputSignal<OrganizationJoinRequestOutput | null> =
    input<OrganizationJoinRequestOutput | null>(null);
  /**
   * Property roles
   * @readonly
   * @description Server-authorized roles for this reviewer.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<{id:string;label:string}>>}
   */
  public readonly roles: InputSignal<ReadonlyArray<{ id: string; label: string }>> = input<
    ReadonlyArray<{ id: string; label: string }>
  >([]);
  /**
   * Property pending
   * @readonly
   * @description Locks the dialog during a decision.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);
  /**
   * Property error
   * @readonly
   * @description Failed decision feedback retained inside the dialog.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
  /**
   * Property closed
   * @readonly
   * @description Dialog dismissal.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly closed: OutputEmitterRef<void> = output();
  /**
   * Property approved
   * @readonly
   * @description Explicit role-bearing approval.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<{requestId:string;roleIds:string[]}>}
   */
  public readonly approved: OutputEmitterRef<{ requestId: string; roleIds: string[] }> = output();
  /**
   * Property rejected
   * @readonly
   * @description Explicit refusal of the displayed request.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly rejected: OutputEmitterRef<string> = output();
  /**
   * Property model
   * @readonly
   * @description Resets the role selection for each reviewed request.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<{roleIds:string[]}>}
   */
  protected readonly model: WritableSignal<{ roleIds: string[] }> = linkedSignal({
    source: () => this.request()?.id,
    computation: () => ({ roleIds: [] }),
  });
  /**
   * Property roleLabelOf
   * @readonly
   * @description Resolves both individual menu values and the complete selected array passed by the native multiple-select trigger.
   * @access protected
   * @since 1.0.0
   * @type {(value: string | readonly string[]) => string}
   */
  protected readonly roleLabelOf: (value: string | readonly string[]) => string = (value) =>
    (typeof value === 'string' ? [value] : value)
      .map(
        (id) =>
          this.roles().find((role) => role.id === id)?.label ??
          $localize`:@@org.access.roleUnavailable:Role unavailable`,
      )
      .join(', ');
  /**
   * Property reviewForm
   * @readonly
   * @description Required role selection with pending lock.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<{roleIds:string[]}>}
   */
  protected readonly reviewForm: FieldTree<{ roleIds: string[] }> = form(this.model, (path) => {
    disabled(path, { when: () => this.pending() });
    required(path.roleIds, {
      message: $localize`:@@org.access.requests.roleRequired:Choose at least one role.`,
    });
  });
  /**
   * Method approve
   * @method approve
   * @description Emits a validated approval and leaves the dialog open until the server accepts it.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - Native form submission.
   * @returns {void}
   */
  protected approve(event: Event): void {
    event.preventDefault();
    this.reviewForm.roleIds().markAsTouched();
    const request = this.request();
    const ids = this.model().roleIds;
    if (
      !request?.actions.includes('approve') ||
      this.pending() ||
      !ids.length ||
      !ids.every((id) => this.roles().some((role) => role.id === id))
    )
      return;
    this.approved.emit({ requestId: request.id, roleIds: [...ids] });
  }
  /**
   * Method reject
   * @method reject
   * @description Confirms refusal independently of role selection.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reject(): void {
    const request = this.request();
    if (request?.actions.includes('reject') && !this.pending()) this.rejected.emit(request.id);
  }
}
