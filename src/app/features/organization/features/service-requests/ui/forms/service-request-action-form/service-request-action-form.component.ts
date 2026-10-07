import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { disabled, form, FormField, maxLength, validate } from '@angular/forms/signals';
import type { StoreError } from '@core/request-state';
import type { EquipmentOpenWorkOutput } from '@features/organization/features/equipments/models';
import type {
  ServiceRequestOutput,
  QualifyServiceRequestInput,
  DecisionServiceRequestInput,
} from '@features/organization/features/service-requests/models';
import { ServiceRequestEquipmentPicker } from '@features/organization/features/service-requests/ui/components';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmTextarea } from '@shared/ui/textarea';
/**
 * Type ServiceRequestActionKind
 *
 * @description
 * Explicit qualification, decision and corrective-work conversion actions.
 *
 * @since unreleased
 *
 * @type {ServiceRequestActionKind}
 */
export type ServiceRequestActionKind = 'qualify' | 'reject' | 'cancel' | 'convert';
/**
 * Type ServiceRequestActionIntent
 *
 * @description
 * Validated form intent; the owning page supplies transport revision and conversion identity.
 *
 * @since unreleased
 *
 * @type {ServiceRequestActionIntent}
 */
export type ServiceRequestActionIntent =
  | { readonly kind: 'qualify'; readonly input: QualifyServiceRequestInput }
  | { readonly kind: 'reject' | 'cancel'; readonly input: DecisionServiceRequestInput }
  | { readonly kind: 'convert'; readonly existingWork: EquipmentOpenWorkOutput | null };
/**
 * Interface ServiceRequestActionDraft
 * @interface
 *
 * @description
 * Entered qualification, decision and existing-work selection retained after rejection.
 *
 * @since unreleased
 */
interface ServiceRequestActionDraft {
  /**
   * Property note
   *
   * @description
   * Entered qualification explanation, normalized only at submission.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  note: string;
  /**
   * Property reason
   *
   * @description
   * Entered decision reason required for cancellation or rejection.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  reason: string;
  /**
   * Property equipmentId
   *
   * @description
   * Published equipment target or its explicit search scope.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  equipmentId: string;
  /**
   * Property workItemId
   *
   * @description
   * Stable existing corrective task identity selected from authorized work.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  workItemId: string;
}
/**
 * Class ServiceRequestActionForm
 * @class ServiceRequestActionForm
 *
 * @description
 * Explicit qualification, motivated decisions and real corrective-work reuse choices.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-service-request-action-form',
  templateUrl: './service-request-action-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    HlmButton,
    HlmSpinner,
    HlmTextarea,
    ServiceRequestEquipmentPicker,
    ...HlmAlertImports,
    ...HlmFieldImports,
    ...HlmComboboxImports,
  ],
})
export class ServiceRequestActionForm {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority shared by the owning route and server transport.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId = input.required<string>();
  /**
   * Property request
   * @readonly
   *
   * @description
   * Immutable request revision supplied by the owning page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ServiceRequestOutput>}
   */
  public readonly request = input.required<ServiceRequestOutput>();
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Explicit workflow action currently being prepared.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ServiceRequestActionKind>}
   */
  public readonly kind = input.required<ServiceRequestActionKind>();
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Disables editing while the owning mutation is accepted.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending = input(false);
  /**
   * Property locked
   * @readonly
   *
   * @description
   * Preserves an uncertain conversion payload until the owning page retries it.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly locked = input(false);
  /**
   * Property error
   * @readonly
   *
   * @description
   * Normalized command error displayed without resetting the draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error = input<StoreError | null>(null);
  /**
   * Property openWork
   * @readonly
   *
   * @description
   * Authorized current repair tasks supplied by the owning page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly EquipmentOpenWorkOutput[]>}
   */
  public readonly openWork = input<readonly EquipmentOpenWorkOutput[]>([]);
  /**
   * Property workPending
   * @readonly
   *
   * @description
   * A pending open-work read prevents uncertain conversion choices.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly workPending = input(false);
  /**
   * Property workError
   * @readonly
   *
   * @description
   * An unresolved open-work failure remains visible and blocks conversion.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly workError = input<StoreError | null>(null);
  /**
   * Property workReadable
   * @readonly
   *
   * @description
   * Actual permission to view existing work, distinct from an empty work list.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly workReadable = input(true);
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated intent emitted to the owning page; the form never writes directly.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<ServiceRequestActionIntent>}
   */
  public readonly submitted = output<ServiceRequestActionIntent>();
  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Dismissal intent routed through the owning overlay policy.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled = output<void>();
  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Real Signal Forms dirtiness exposed to the owning overlay.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged = output<boolean>();
  /**
   * Property draft
   * @readonly
   *
   * @description
   * Editable Signal Forms model retained after server rejection.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ServiceRequestActionDraft>}
   */
  protected readonly draft = signal<ServiceRequestActionDraft>({
    note: '',
    reason: '',
    equipmentId: '',
    workItemId: '',
  });
  /**
   * Property actionForm
   * @readonly
   *
   * @description
   * Qualification, decision and conversion-choice validation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<ServiceRequestActionDraft>}
   */
  protected readonly actionForm = form(this.draft, (path) => {
    disabled(path, () => this.pending() || this.locked());
    maxLength(path.note, 10000, {
      message: $localize`:@@serviceRequest.form.max10000:Use at most 10000 characters.`,
    });
    maxLength(path.reason, 2000, {
      message: $localize`:@@serviceRequest.action.max2000:Use at most 2000 characters.`,
    });
    validate(path.reason, ({ value }) =>
      (this.kind() !== 'reject' && this.kind() !== 'cancel') || value().trim()
        ? null
        : {
            kind: 'required',
            message: $localize`:@@serviceRequest.action.reasonRequired:Explain this decision.`,
          },
    );
    validate(path.equipmentId, ({ value }) =>
      this.kind() !== 'qualify' || this.request().equipmentId || value()
        ? null
        : {
            kind: 'required',
            message: $localize`:@@serviceRequest.action.equipmentRequired:Identify the equipment requiring maintenance.`,
          },
    );
    validate(path.workItemId, ({ value }) =>
      !value() || this.openWork().some((entry) => entry.workItemId === value())
        ? null
        : {
            kind: 'invalid',
            message: $localize`:@@serviceRequest.action.workRequired:Choose current corrective work.`,
          },
    );
  });
  /**
   * Property workLabel
   * @readonly
   *
   * @description
   * Human-readable name for a real existing corrective task.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: unknown) => string}
   */
  protected readonly workLabel = (value: unknown): string => {
    if (typeof value !== 'string' || !value)
      return $localize`:@@serviceRequest.action.newWork:Create a corrective intervention`;
    const work = this.openWork().find((entry) => entry.workItemId === value);
    return (
      work?.name ||
      (work?.number
        ? '#' + work.number
        : $localize`:@@serviceRequest.action.openWork:Open corrective work`)
    );
  };
  /**
   * Property remoteFilter
   * @readonly
   *
   * @description
   * Server-owned candidate search keeps authorized page entries visible.
   *
   * @access protected
   * @since unreleased
   *
   * @type {() => boolean}
   */
  protected readonly remoteFilter = (): boolean => true;
  /**
   * Property submitLabel
   * @readonly
   *
   * @description
   * Truthful action label derived from the prepared request or work selection.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly submitLabel = computed(() => {
    switch (this.kind()) {
      case 'qualify':
        return $localize`:@@serviceRequest.action.qualify:Confirm qualification`;
      case 'reject':
        return $localize`:@@serviceRequest.action.reject:Reject request`;
      case 'cancel':
        return $localize`:@@serviceRequest.action.cancel:Cancel request`;
      case 'convert':
        return this.draft().workItemId
          ? $localize`:@@serviceRequest.action.linkWork:Link this corrective work`
          : $localize`:@@serviceRequest.action.createWork:Create corrective intervention`;
    }
  });
  /**
   * Property seededIdentity
   *
   * @description
   * Record/action identity already seeded; a revision refresh must retain the draft.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private seededIdentity = '';
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds one explicit action and reports real form dirtiness without rebasing a rejected draft.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const request = this.request(),
        kind = this.kind(),
        organizationId = this.organizationId();
      const identity = organizationId + '/' + request.id + '/' + kind;
      if (identity === this.seededIdentity) return;
      this.seededIdentity = identity;
      untracked(() =>
        this.actionForm().reset({
          note: '',
          reason: '',
          equipmentId: request.equipmentId ?? '',
          workItemId: '',
        }),
      );
    });
    effect(() => {
      const dirty = this.actionForm().dirty();
      untracked(() => this.dirtyChanged.emit(dirty));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method pickWork
   *
   * @description
   * Selects a real current repair task or an explicit new intervention choice.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Native choice value validated against the current options.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected pickWork(value: unknown): void {
    if (this.pending() || this.locked() || typeof value !== 'string') return;
    if (!value || this.openWork().some((entry) => entry.workItemId === value)) {
      this.actionForm.workItemId().value.set(value);
      this.actionForm.workItemId().markAsDirty();
    }
  }
  /**
   * Method submit
   *
   * @description
   * Emits normalized validated intent only after exposing errors and checking pending work.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native submit or input event.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.actionForm().markAsTouched();
    if (
      this.pending() ||
      this.locked() ||
      this.actionForm().invalid() ||
      (this.kind() === 'convert' && (this.workPending() || this.workError()))
    )
      return;
    const draft = this.draft();
    switch (this.kind()) {
      case 'qualify':
        this.submitted.emit({
          kind: 'qualify',
          input: {
            note: draft.note.trim() || null,
            ...(!this.request().equipmentId ? { equipmentId: draft.equipmentId } : {}),
          },
        });
        return;
      case 'reject':
        this.submitted.emit({ kind: 'reject', input: { reason: draft.reason.trim() } });
        return;
      case 'cancel':
        this.submitted.emit({ kind: 'cancel', input: { reason: draft.reason.trim() } });
        return;
      case 'convert':
        this.submitted.emit({
          kind: 'convert',
          existingWork:
            this.openWork().find((entry) => entry.workItemId === draft.workItemId) ?? null,
        });
    }
  }
  //#endregion
}
