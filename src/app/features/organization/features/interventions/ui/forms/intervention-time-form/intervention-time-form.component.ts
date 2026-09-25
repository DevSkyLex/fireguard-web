import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import {
  form,
  FormField,
  required,
  validate,
  maxLength,
  type FieldTree,
} from '@angular/forms/signals';
import type {
  InterventionTimeDraft,
  InterventionTimeWrite,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmComboboxImports } from '@shared/ui/combobox';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmInputGroupAddon } from '@shared/ui/input-group';
import { HlmTextarea } from '@shared/ui/textarea';

/**
 * Component InterventionTimeForm
 * @class InterventionTimeForm
 *
 * @description
 * Explicit actual-time editor. It preserves a stable client ID and emits durable drafts without changing remaining work.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-intervention-time-form',
  templateUrl: './intervention-time-form.component.html',
  imports: [
    HlmInputGroupAddon,
    HlmAvatarImports,
    FormField,
    HlmButton,
    HlmFieldImports,
    HlmInput,
    HlmTextarea,
    HlmComboboxImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionTimeForm {
  /**
   * Property selectedMemberOption
   * @readonly
   *
   * @description
   * Organization identity of the selected member; the submitted identifier remains unchanged.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<MemberSelectOption | null>}
   */
  protected readonly selectedMemberOption: Signal<MemberSelectOption | null> = computed(
    () =>
      this.members().find((member) => member.value.split('/').at(-1) === this.model().memberId) ??
      null,
  );

  /**
   * Property initial
   * @readonly
   *
   * @description
   * Draft selected explicitly by the sheet.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionTimeDraft>}
   */
  public readonly initial: InputSignal<InterventionTimeDraft> =
    input.required<InterventionTimeDraft>();

  /**
   * Property today
   * @readonly
   *
   * @description
   * Today in the organization timezone.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly today: InputSignal<string> = input.required<string>();

  /**
   * Property members
   * @readonly
   *
   * @description
   * Authorized contributor choices.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly members: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /**
   * Property manageOthers
   * @readonly
   *
   * @description
   * Allows choosing a different contributor when creating an entry.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly manageOthers: InputSignal<boolean> = input(false);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Prevents duplicate submission.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property draftChanged
   * @readonly
   *
   * @description
   * Partial input to save on this device.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionTimeDraft>}
   */
  public readonly draftChanged: OutputEmitterRef<InterventionTimeDraft> = output();

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated creation or correction.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<InterventionTimeWrite>}
   */
  public readonly submitted: OutputEmitterRef<InterventionTimeWrite> = output();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Return to the journal, retaining the draft.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output();

  /**
   * Property model
   * @readonly
   *
   * @description
   * Independent form input.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<InterventionTimeDraft>}
   */
  protected readonly model: WritableSignal<InterventionTimeDraft> = signal({
    id: '',
    memberId: '',
    workedOn: '',
    minutes: '',
    note: '',
    baseRevision: null,
  });

  /**
   * Property fields
   * @readonly
   *
   * @description
   * Signal Forms validation for actual time.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FieldTree<InterventionTimeDraft>}
   */
  protected readonly fields: FieldTree<InterventionTimeDraft> = form(this.model, (path) => {
    required(path.memberId);
    required(path.workedOn, { message: $localize`:@@workload.dateRequired:Choose a date.` });
    validate(path.workedOn, ({ value }) =>
      !value() || value() <= this.today()
        ? null
        : {
            kind: 'future',
            message: $localize`:@@intervention.time.future:Work dates cannot be in the future.`,
          },
    );
    required(path.minutes);
    validate(path.minutes, ({ value }) =>
      /^\d+$/.test(value()) && Number(value()) > 0 && Number(value()) <= 1440
        ? null
        : {
            kind: 'duration',
            message: $localize`:@@intervention.time.durationRange:Enter whole minutes between 1 and 1440.`,
          },
    );
    maxLength(path.note, 2000);
  });

  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds only explicit draft selections and persists subsequent edits.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      const draft = this.initial();
      untracked(() => this.fields().reset({ ...draft }));
    });
    effect(() => {
      const draft = this.model();
      const dirty = this.fields().dirty();
      if (dirty) untracked(() => this.draftChanged.emit(draft));
    });
  }

  /**
   * Property memberLabel
   * @readonly
   *
   * @description
   * Resolves contributor names from organization options.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(id: string) => string}
   */
  protected readonly memberLabel: (id: string) => string = (id) =>
    this.members().find((member) => member.value.split('/').at(-1) === id)?.displayName ?? id;

  /**
   * Method selectMember
   * @method selectMember
   *
   * @description
   * Changes only the beneficiary of a new authorized entry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | null | undefined} id - Contributor identifier.
   * @returns {void}
   */
  protected selectMember(id: string | null | undefined): void {
    if (!this.manageOthers() || this.model().baseRevision !== null || !id) return;
    this.model.update((value) => ({ ...value, memberId: id }));
    this.draftChanged.emit(this.model());
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Submits actual time without inferring work completion.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - Native form event.
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.fields().markAsTouched();
    if (this.pending() || this.fields().invalid()) return;
    const value = this.model();
    const entry = {
      id: value.id,
      memberId: value.memberId,
      workedOn: value.workedOn,
      minutes: Number(value.minutes),
      note: value.note.trim() || null,
    };
    this.submitted.emit(
      value.baseRevision === null
        ? { kind: 'create', input: entry }
        : { kind: 'correct', input: entry, revision: value.baseRevision },
    );
  }
}
