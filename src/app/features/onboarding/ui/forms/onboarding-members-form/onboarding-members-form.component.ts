import {
  ChangeDetectionStrategy,
  Component,
  computed,
  afterNextRender,
  inject,
  Injector,
  viewChild,
  type ElementRef,
  input,
  linkedSignal,
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
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMail, lucidePlus, lucidePencil, lucideX } from '@ng-icons/lucide';
import { OnboardingStepFooter } from '@features/onboarding/ui/components';
import type { SetupInviteMemberInput, SetupOrganizationRole } from '@features/organization/setup';
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSelectImports } from '@shared/ui/select';
import type { OnboardingMemberDraft } from './models';

/** No role assigned yet — a valid, deliberate choice. */
const NO_ROLE = '';

/** A blank draft row. */
const EMPTY_VALUES: OnboardingMemberDraft = { email: '', roleId: NO_ROLE };

/**
 * Property MAX_INVITATIONS
 * @readonly
 * @description Maximum invitations in this step, including successful batch entries.
 * @access private
 * @since 1.1.0
 * @type {number}
 */
const MAX_INVITATIONS: number = 5;

/**
 * Component OnboardingMembersForm
 * @class OnboardingMembersForm
 *
 * @description
 * The `invite_members` wizard step. Like the facilities step, it stages
 * invitation rows locally and emits the whole batch with {@link submitted}
 * only when the operator sends it. A valid draft still in the fields is
 * staged automatically first, so the common path is "type one address, send"
 * with no explicit add. While the step is skippable and nothing has been
 * typed or staged, the primary action closes and names the two ways out —
 * add an address, or skip — rather than sending an empty batch; a required
 * step requires at least one prepared invitation.
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
  imports: [
    RequiredMarker,
    FormField,
    HlmButton,
    HlmInput,
    NgIcon,
    OnboardingStepFooter,
    ...HlmFieldImports,
    ...HlmItemImports,
    ...HlmSelectImports,
  ],
  providers: [provideIcons({ lucideMail, lucidePlus, lucidePencil, lucideX })],
  templateUrl: './onboarding-members-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingMembersForm {
  /**
   * Property restored
   * @readonly
   * @description Complete durable batch restored after reload or a partial creation response.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<readonly SetupInviteMemberInput[]>}
   */
  public readonly restored: InputSignal<readonly SetupInviteMemberInput[]> = input<
    readonly SetupInviteMemberInput[]
  >([]);

  /**
   * Property draftInput
   * @readonly
   * @description Draft input restored after an explicit row edit, including a full batch.
   * @access private
   * @since 1.1.0
   * @type {Signal<ElementRef<HTMLInputElement> | undefined>}
   */
  private readonly draftInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('draftInput');
  /**
   * Property injector
   * @readonly
   * @description Injection context for the post-render focus callback.
   * @access private
   * @since 1.1.0
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);

  /**
   * Method focusDraft
   * @method focusDraft
   * @description Focuses the editable draft after Angular restores it for a full-batch edit.
   * @access private
   * @since 1.1.0
   * @returns {void}
   */
  private focusDraft(): void {
    afterNextRender(() => this.draftInput()?.nativeElement.focus(), { injector: this.injector });
  }

  /**
   * Method editMemberLabel
   * @method editMemberLabel
   * @description Names the specific invitation edited by this action.
   * @access protected
   * @since 1.1.0
   * @param {string} email - Prepared address.
   * @returns {string} Localized accessible name.
   */
  protected editMemberLabel(email: string): string {
    return $localize`:@@onboarding.membersForm.editNamed:Edit ${email}:email:`;
  }

  /**
   * Property completed
   * @readonly
   * @description Successful entries count toward capacity and cannot be edited or removed locally.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<readonly SetupInviteMemberInput[]>}
   */
  public readonly completed: InputSignal<readonly SetupInviteMemberInput[]> = input<
    readonly SetupInviteMemberInput[]
  >([]);
  /**
   * Property failed
   * @readonly
   * @description Addresses whose latest attempt failed and may be retried.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<readonly string[]>}
   */
  public readonly failed: InputSignal<readonly string[]> = input<readonly string[]>([]);
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
   * Property skippable
   * @readonly
   * @description Whether the backend currently lets this step be skipped, which renders the footer's skip control and closes an empty send.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<boolean>}
   */
  public readonly skippable: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits a non-empty staged batch once the operator continues.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<readonly SetupInviteMemberInput[]>}
   */
  public readonly submitted: OutputEmitterRef<readonly SetupInviteMemberInput[]> =
    output<readonly SetupInviteMemberInput[]>();

  /**
   * Property skipped
   * @readonly
   * @description Relays the footer's skip request to the page.
   * @access public
   * @since 1.1.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly skipped: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   * @description Current invitation draft, retained when validation prevents staging.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<OnboardingMemberDraft>}
   */
  protected readonly model: WritableSignal<OnboardingMemberDraft> =
    signal<OnboardingMemberDraft>(EMPTY_VALUES);

  /**
   * Property staged
   * @readonly
   * @description Prepared invitation rows retained across partial batch failures.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<readonly SetupInviteMemberInput[]>}
   */
  protected readonly staged: WritableSignal<readonly SetupInviteMemberInput[]> = linkedSignal(() =>
    this.restored(),
  );

  /**
   * Property batchEmails
   * @readonly
   * @description Normalized addresses reserved by prepared or already persisted invitations.
   * @access private
   * @since 1.1.0
   * @type {Signal<ReadonlySet<string>>}
   */
  private readonly batchEmails: Signal<ReadonlySet<string>> = computed(
    () => new Set([...this.staged(), ...this.completed()].map((row) => this.emailKey(row.email))),
  );

  /**
   * Property atCapacity
   * @readonly
   * @description Whether another invitation would exceed the complete batch limit.
   * @access protected
   * @since 1.1.0
   * @type {Signal<boolean>}
   */
  protected readonly atCapacity: Signal<boolean> = computed(
    () => this.batchEmails().size >= MAX_INVITATIONS,
  );

  /**
   * Property capacityMessage
   * @readonly
   * @description Explains the batch limit and where additional invitations remain available.
   * @access protected
   * @since 1.1.0
   * @type {string}
   */
  protected readonly capacityMessage: string = $localize`:@@onboarding.membersForm.capacity:This step is limited to 5 invitations, including those already sent. You can invite more people from your organization later.`;

  /**
   * Property defaultRoleLabel
   * @readonly
   * @description Names the server-assigned role when no explicit role was selected.
   * @access protected
   * @since 1.1.0
   * @type {string}
   */
  protected readonly defaultRoleLabel: string = $localize`:@@onboarding.membersForm.defaultRole:Default role`;

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
    validate(path.email, ({ value }) =>
      this.batchEmails().has(this.emailKey(value()))
        ? {
            kind: 'duplicateEmail',
            message: $localize`:@@onboarding.membersForm.duplicateEmail:This email is already in this invitation batch.`,
          }
        : null,
    );
    emailRule(path.email, {
      message: $localize`:@@onboarding.membersForm.emailInvalid:Enter a valid email address.`,
    });
  });

  /**
   * Property roleLabelOf
   * @readonly
   * @description Resolves picked roles for both the select trigger and prepared invitations.
   * @access protected
   * @since 1.0.0
   * @type {(value: string) => string}
   */
  protected readonly roleLabelOf: (value: string) => string = (value) =>
    this.roles().find((role) => role.id === value)?.name ?? '';

  /**
   * Property stagedRows
   * @readonly
   * @description The staged batch with each role id resolved to its name for the list.
   * @access protected
   * @since 1.1.0
   * @type {Signal<readonly { email: string; roleName: string | null }[]>}
   */
  protected readonly stagedRows: Signal<
    readonly {
      readonly email: string;
      readonly roleName: string | null;
      readonly completed: boolean;
      readonly failed: boolean;
    }[]
  > = computed(() =>
    this.staged().map((row) => {
      const roleId: string | null | undefined = row.roleIds?.[0];

      return {
        email: row.email,
        completed: this.isCompleted(row),
        failed: this.failed().includes(row.email),
        roleName: typeof roleId === 'string' ? this.roleLabelOf(roleId) || null : null,
      };
    }),
  );

  /**
   * Property gateReason
   * @readonly
   * @description Explains an empty skippable batch or an additional draft beyond capacity.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string | null>}
   */
  protected readonly gateReason: Signal<string | null> = computed<string | null>(() => {
    if (this.pending()) return null;
    if (this.atCapacity() && this.model().email.trim() !== '') return this.capacityMessage;
    if (this.staged().length > 0 || this.model().email.trim() !== '') return null;

    return this.skippable()
      ? $localize`:@@onboarding.membersForm.emptyGate:Add at least one email, or skip this step.`
      : $localize`:@@onboarding.membersForm.requiredGate:Add at least one email.`;
  });

  /**
   * Property submitLabel
   * @readonly
   * @description The footer's resting invitation action.
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly submitLabel: string = $localize`:@@onboarding.membersForm.submit:Send invitations`;

  /**
   * Property pendingLabel
   * @readonly
   * @description The footer's action while the batch is being sent.
   * @access protected
   * @since 1.0.0
   * @type {string}
   */
  protected readonly pendingLabel: string = $localize`:@@onboarding.membersForm.submitting:Sending…`;
  //#endregion

  //#region Methods
  /**
   * Method addMember
   * @method addMember
   *
   * @description
   * Stages the current row and resets both the draft and its interaction
   * state, so the next empty invitation does not inherit validation errors.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {boolean} Whether the invitation was added without exceeding the batch constraints.
   */
  protected addMember(): boolean {
    if (this.pending() || this.atCapacity()) return false;
    this.normalizeDraftEmail();
    if (this.draftForm().invalid()) {
      this.draftForm().markAsTouched();
      return false;
    }

    const draft: OnboardingMemberDraft = this.model();

    this.staged.update((rows) => [
      ...rows,
      {
        email: draft.email.trim(),
        roleIds: draft.roleId === NO_ROLE ? undefined : [draft.roleId],
      },
    ]);
    this.model.set(EMPTY_VALUES);
    this.draftForm().reset();
    return true;
  }

  /**
   * Method removeMemberLabel
   *
   * @description Names one staged row's remove button after the row itself,
   * so several "Remove" buttons stay distinguishable to assistive technology.
   *
   * @access protected
   * @since 1.0.0
   * @param {string} email - The staged row's email.
   * @returns {string} The localized accessible name.
   */
  protected removeMemberLabel(email: string): string {
    return $localize`:@@onboarding.membersForm.removeNamed:Remove ${email}:email:`;
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
    if (this.pending() || this.isCompleted(this.staged()[index])) return;
    this.staged.update((rows) => rows.filter((_, i) => i !== index));
  }

  /**
   * Method submit
   *
   * @description
   * Stages the current row first when it is valid — a typed but un-added
   * invitation must not be lost silently — then emits the batch. An empty
   * batch remains disabled; optional invitations use the explicit skip action.
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

    if (this.pending() || this.gateReason() !== null) return;

    if (this.model().email.trim() !== '' && !this.addMember()) return;

    this.submitted.emit(this.staged());
  }
  /**
   * Method editMember
   * @method editMember
   * @description Moves an unsent row into the draft, staging the current draft only if it is unique and fits the batch.
   * @access protected
   * @since 1.1.0
   * @param {number} index - Prepared row to edit.
   * @returns {void}
   */
  protected editMember(index: number): void {
    const row = this.staged()[index];
    if (!row || this.pending() || this.isCompleted(row)) return;
    if (this.model().email.trim() !== '') {
      if (!this.addMember()) {
        this.focusDraft();
        return;
      }
    }
    this.removeMember(index);
    this.model.set({ email: row.email, roleId: row.roleIds?.[0] ?? NO_ROLE });
    this.focusDraft();
  }

  /**
   * Method normalizeDraftEmail
   * @method normalizeDraftEmail
   * @description Trims pasted whitespace before field validation and batch staging.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected normalizeDraftEmail(): void {
    this.model.update((draft) => ({ ...draft, email: draft.email.trim() }));
  }

  /**
   * Method emailKey
   * @method emailKey
   * @description Matches invitation addresses without surrounding whitespace or case differences.
   * @access private
   * @since 1.1.0
   * @param {string} email - Address to compare.
   * @returns {string} Canonical batch key.
   */
  private emailKey(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Method isCompleted
   * @method isCompleted
   * @description Preserves successful rows even when the parent recreates their transport objects.
   * @access private
   * @since 1.1.0
   * @param {SetupInviteMemberInput | undefined} row - Prepared invitation.
   * @returns {boolean} Whether the address was already sent successfully.
   */
  private isCompleted(row: SetupInviteMemberInput | undefined): boolean {
    return (
      row !== undefined &&
      this.completed().some((done) => this.emailKey(done.email) === this.emailKey(row.email))
    );
  }

  //#endregion
}
