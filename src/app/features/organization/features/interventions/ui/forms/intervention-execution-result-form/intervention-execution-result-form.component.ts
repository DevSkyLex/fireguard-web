import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  disabled,
  form,
  FormField,
  FormRoot,
  maxLength,
  required,
  validate,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import { DateTime } from 'luxon';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type {
  InterventionWorkItemExecutionResultInput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { serverMessagesOf } from '@shared/form-feedback';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogFooter } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmTextareaImports } from '@shared/ui/textarea';
import type { InterventionExecutionResultFormValues } from './models/intervention-execution-result-form-values.interface';

/**
 * Component InterventionExecutionResultForm
 * @class InterventionExecutionResultForm
 *
 * @description
 * Records actual maintenance work without deriving its date from task completion.
 * A rejected write preserves the operator's draft.
 */
@Component({
  selector: 'app-intervention-execution-result-form',
  imports: [
    NgIcon,
    FormField,
    FormRoot,
    RouterLink,
    HlmButton,
    HlmDialogFooter,
    HlmInput,
    HlmSpinner,
    ...HlmAlertImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
    ...HlmTextareaImports,
  ],
  templateUrl: './intervention-execution-result-form.component.html',
  providers: [provideIcons({ lucideCircleAlert })],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionExecutionResultForm {
  //#region Properties
  /**
   * Property item
   * @readonly
   *
   * @description
   * Captured equipment work item; its revision stays owned by the page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<InterventionWorkItemOutput>}
   */
  public readonly item = input.required<InterventionWorkItemOutput>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Locks commitment while this result is being persisted.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending = input(false);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Keeps a preserved draft readable when the workflow no longer allows execution.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled = input(false);

  /**
   * Property serverError
   * @readonly
   *
   * @description
   * Rejected write feedback, displayed without clearing the draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<unknown>}
   */
  public readonly serverError = input<unknown>(null);

  /**
   * Property replacementSuccessor
   * @readonly
   *
   * @description
   * Equipment-owned successor confirmed by the current scoped read.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<EquipmentOutput | null>}
   */
  public readonly replacementSuccessor = input<EquipmentOutput | null>(null);

  /**
   * Property replacementLoading
   * @readonly
   *
   * @description
   * A proof refresh is pending; stale proof cannot complete a replacement.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly replacementLoading = input(false);

  /**
   * Property replacementReadFailed
   * @readonly
   *
   * @description
   * The original or successor could not be read in the current scope.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly replacementReadFailed = input(false);

  /**
   * Property originalEquipmentLink
   * @readonly
   *
   * @description
   * Opens the existing equipment dossier while preserving this attempt's draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly string[] | null>}
   */
  public readonly originalEquipmentLink = input<readonly string[] | null>(null);

  /**
   * Property refreshReplacement
   * @readonly
   *
   * @description
   * Requests a fresh Equipment-owned replacement proof without resetting entered facts.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly refreshReplacement = output<void>();

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Validated execution result with an explicit offset-bearing instant.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<InterventionWorkItemExecutionResultInput>}
   */
  public readonly submitted = output<InterventionWorkItemExecutionResultInput>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Requests dismissal through the host's draft guard.
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
   * Keeps dismissal aware of input that has not been committed.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged = output<boolean>();

  /**
   * Property regional
   * @readonly
   *
   * @description
   * Organization-owned timezone for operator-entered local times.
   *
   * @access private
   * @since unreleased
   *
   * @type {RegionalFormattingPort}
   */
  private readonly regional = inject(REGIONAL_FORMATTING_PORT);

  /**
   * Property timezone
   * @readonly
   *
   * @description
   * Visible timezone of the performed-at input.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly timezone = computed(() => this.regional.regionalFormatting().timezone);

  /**
   * Property model
   * @readonly
   *
   * @description
   * No timestamp is invented for previously unrecorded work.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<InterventionExecutionResultFormValues>}
   */
  protected readonly model = signal<InterventionExecutionResultFormValues>({
    performedAt: '',
    outcome: '',
    workPerformed: '',
  });

  /**
   * Property outcomeLabelOf
   * @readonly
   *
   * @description
   * Resolves the selected result's visible label as well as its native select value.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly outcomeLabelOf = (value: string): string => {
    switch (value) {
      case 'successful':
        return $localize`:@@intervention.execution.successful:Successful`;
      case 'performed':
        return $localize`:@@intervention.execution.performed:Performed`;
      case 'failed':
        return $localize`:@@intervention.execution.failed:Unsuccessful — work still required`;
      default:
        return '';
    }
  };

  /**
   * Property resultForm
   * @readonly
   *
   * @description
   * Validates equipment-linked work, action-compatible outcome and an actual local datetime.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<InterventionExecutionResultFormValues>}
   */
  protected readonly resultForm = form(this.model, (path) => {
    disabled(path, { when: () => this.pending() || this.disabled() });
    required(path.performedAt, {
      message: $localize`:@@intervention.execution.dateRequired:Enter when the work was performed.`,
    });
    validate(path.performedAt, ({ value }) => {
      if (!value()) return null;
      const instant = DateTime.fromISO(value(), { zone: this.timezone() });
      return instant.isValid && instant.toFormat("yyyy-MM-dd'T'HH:mm") === value()
        ? null
        : {
            kind: 'datetime',
            message: $localize`:@@intervention.execution.dateInvalid:Enter a valid date and time in the displayed timezone.`,
          };
    });
    required(path.outcome, {
      message: $localize`:@@intervention.execution.outcomeRequired:Choose the result of this work.`,
    });
    validate(path.outcome, ({ value }) =>
      !value() ||
      ['successful', 'failed'].includes(value()) ||
      (this.item().action === 'maintenance' && value() === 'performed')
        ? null
        : {
            kind: 'outcome',
            message: $localize`:@@intervention.execution.outcomeInvalid:Choose a result appropriate for this action.`,
          },
    );
    validate(path.outcome, ({ value }) =>
      this.item().action !== 'replacement' ||
      value() !== 'successful' ||
      (this.replacementSuccessor() !== null && !this.replacementLoading())
        ? null
        : {
            kind: 'replacement',
            message: $localize`:@@intervention.execution.replacementRequired:Confirm the replacement in the equipment dossier, then refresh its successor.`,
          },
    );
    validate(path.workPerformed, ({ value }) =>
      value().trim().length > 0
        ? null
        : {
            kind: 'required',
            message: $localize`:@@intervention.execution.workRequired:Describe the work actually performed.`,
          },
    );
    maxLength(path.workPerformed, 10000, {
      message: $localize`:@@intervention.execution.workTooLong:Keep the work description within 10,000 characters.`,
    });
  });

  /**
   * Property serverMessages
   * @readonly
   *
   * @description
   * Persistent feedback supports correcting and retrying a rejected result.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages = computed(() =>
    serverMessagesOf(
      this.serverError(),
      [],
      $localize`:@@intervention.execution.saveFailed:The execution result could not be saved.`,
    ),
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Starts a new attempt without reusing the previous attempt's time or facts.
   * Publishes draft dirtiness to the host.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      this.item();
      untracked(() => {
        this.model.set({ performedAt: '', outcome: '', workPerformed: '' });
        this.resultForm().reset();
      });
    });
    effect(() => {
      const dirty = this.resultForm().dirty();
      untracked(() => this.dirtyChanged.emit(dirty));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Converts the explicitly entered organization-local datetime into its API instant.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native form submission.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.resultForm().markAsTouched();
    const equipmentId = /^\/api\/equipment\/([^/?#]+)$/.exec(this.item().target ?? '')?.[1];
    if (!equipmentId || this.resultForm().invalid() || this.pending() || this.disabled()) return;
    const value = this.model();
    const performedAt = DateTime.fromISO(value.performedAt, { zone: this.timezone() }).toISO();
    if (!performedAt) return;
    this.submitted.emit({
      equipmentId,
      performedAt,
      outcome: value.outcome as InterventionWorkItemExecutionResultInput['outcome'],
      workPerformed: value.workPerformed.trim(),
    });
  }
  //#endregion
}
