import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  email as emailRule,
  form,
  FormField,
  required,
  type FieldTree,
} from '@angular/forms/signals';
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import { storeErrorMessage } from '@features/onboarding/utils';
import type { SetupInviteMemberInput, SetupOrganizationRole } from '@features/organization/setup';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import type { OnboardingMemberDraft } from './models';

/** No role assigned yet — a valid, deliberate choice. */
const NO_ROLE = '';

/** A blank draft row. */
const EMPTY_VALUES: OnboardingMemberDraft = { email: '', roleId: NO_ROLE };

/**
 * Component OnboardingMembersForm
 * @class OnboardingMembersForm
 *
 * @description
 * The `invite_members` wizard step. Like the facilities step, it stages
 * invitation rows locally and emits the whole batch with {@link submitted}
 * only when the operator continues — an empty batch is a valid continue,
 * since the step is skippable.
 *
 * No draft row is ever sent to the API on its own — staging is local state,
 * so it never touches a service (`ARCHITECTURE.md` §10.4). The wizard page
 * sends the batch through `@features/organization/setup` and confirms the
 * step via the store.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-onboarding-members-form [roles]="roles()" [pending]="isInviting()" (submitted)="inviteMembers($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-members-form',
  imports: [FormField, HlmButton, HlmInput, ...HlmFieldImports, ...HlmSelectImports],
  templateUrl: './onboarding-members-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingMembersForm {
  //#region Inputs
  /**
   * Property roles
   * @readonly
   * @description The organization's assignable roles, offered on each row. Empty until the page loads them.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly SetupOrganizationRole[]>}
   */
  public readonly roles: InputSignal<readonly SetupOrganizationRole[]> = input<
    readonly SetupOrganizationRole[]
  >([]);

  /**
   * Property pending
   * @readonly
   * @description Whether the batch is being sent, which locks the controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the invitation request failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the staged batch — possibly empty — once the operator continues.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<readonly SetupInviteMemberInput[]>}
   */
  public readonly submitted: OutputEmitterRef<readonly SetupInviteMemberInput[]> =
    output<readonly SetupInviteMemberInput[]>();
  //#endregion

  //#region Properties
  /** The currently-edited row. */
  protected readonly model: WritableSignal<OnboardingMemberDraft> =
    signal<OnboardingMemberDraft>(EMPTY_VALUES);

  /** Rows already staged for submission. */
  protected readonly staged: WritableSignal<readonly SetupInviteMemberInput[]> = signal<
    readonly SetupInviteMemberInput[]
  >([]);

  /**
   * Property draftForm
   * @readonly
   * @description The field tree and its rules for the row being drafted.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<OnboardingMemberDraft>}
   */
  protected readonly draftForm: FieldTree<OnboardingMemberDraft> = form(this.model, (path) => {
    required(path.email, {
      message: $localize`:@@onboarding.membersForm.emailRequired:Enter an email address.`,
    });
    emailRule(path.email, {
      message: $localize`:@@onboarding.membersForm.emailInvalid:Enter a valid email address.`,
    });
  });

  /**
   * Property serverMessages
   * @readonly
   * @description Everything the API said about the rejected batch, as flat lines above the form.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const error: unknown = this.serverError();

    if (error === null || error === undefined) return [];

    const combined: readonly string[] = [
      ...new Set([
        ...Object.values(toServerFieldErrors(error)),
        ...toUnmatchedViolations(error, []).map((v: Violation): string => v.message),
      ]),
    ];

    if (combined.length > 0) return combined;

    const storeMessage: string | null = storeErrorMessage(error);

    return storeMessage !== null
      ? [storeMessage]
      : [$localize`:@@onboarding.membersForm.inviteFailed:The invitations could not be sent.`];
  });

  /** Names a picked role on the closed select trigger. */
  protected readonly roleLabelOf: (value: string) => string = (value) =>
    this.roles().find((role) => role.id === value)?.name ?? '';
  //#endregion

  //#region Methods
  /**
   * Method addMember
   *
   * @description
   * Stages the current row and resets the draft. Disabled from the template
   * whenever the row is invalid, so no error state ever needs to be cleared
   * afterward.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected addMember(): void {
    if (this.draftForm().invalid()) return;

    const draft: OnboardingMemberDraft = this.model();

    this.staged.update((rows) => [
      ...rows,
      {
        email: draft.email.trim(),
        roleIds: draft.roleId === NO_ROLE ? undefined : [draft.roleId],
      },
    ]);
    this.model.set(EMPTY_VALUES);
  }

  /**
   * Method removeMember
   *
   * @description
   * Drops a staged row before submission.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} index - Position of the row to remove.
   *
   * @returns {void}
   */
  protected removeMember(index: number): void {
    this.staged.update((rows) => rows.filter((_, i) => i !== index));
  }

  /**
   * Method submit
   *
   * @description
   * Stages the current row first when it is valid — a typed but un-added
   * invitation must not be lost silently — then emits the batch. An empty
   * batch remains a valid continue, since this step is skippable.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    if (this.pending()) return;

    if (!this.draftForm().invalid()) {
      this.addMember();
    } else if (this.model().email.trim() !== '') {
      this.draftForm().markAsTouched();
      return;
    }

    this.submitted.emit(this.staged());
  }
  //#endregion
}
