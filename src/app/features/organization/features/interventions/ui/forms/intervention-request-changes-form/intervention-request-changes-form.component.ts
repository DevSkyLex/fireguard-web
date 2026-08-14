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
import { form, FormField, maxLength, required, type FieldTree } from '@angular/forms/signals';
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSheetFooter } from '@shared/ui/sheet';
import { HlmTextareaImports } from '@shared/ui/textarea';
import type { InterventionRequestChangesFormValues } from './models';

/** Longest a reviewer note may be. */
const NOTE_MAX_LENGTH: number = 2000;

/** A blank note. */
const EMPTY_VALUES: InterventionRequestChangesFormValues = { note: '' };

/**
 * Component InterventionRequestChangesForm
 * @class InterventionRequestChangesForm
 *
 * @description
 * The reviewer's note when an intervention is sent back for changes.
 *
 * This is the one transition that carries prose, which is why it earns a form
 * and a surface where every other status move is a menu entry: the backend
 * requires the note, and the field agent reads it as the instruction for what
 * to fix.
 *
 * Its own host fills the flex column its hosting sheet establishes: the field
 * group scrolls independently while the `hlm-sheet-footer` action row stays
 * pinned, without the sheet needing to know about the form's internal layout.
 *
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-request-changes-form',
  imports: [FormField, HlmButton, ...HlmFieldImports, HlmSheetFooter, ...HlmTextareaImports],
  templateUrl: './intervention-request-changes-form.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionRequestChangesForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether the transition request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property disabled
   * @readonly
   * @description Whether the reviewer may act at all — permission, or a status that moved on.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the transition failed with.
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
   * @description The validated note, trimmed.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionRequestChangesFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionRequestChangesFormValues> =
    output<InterventionRequestChangesFormValues>();

  /**
   * Property cancelled
   * @readonly
   * @description The reviewer backed out.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   * @description The drafted note.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<InterventionRequestChangesFormValues>}
   */
  protected readonly model: WritableSignal<InterventionRequestChangesFormValues> =
    signal<InterventionRequestChangesFormValues>(EMPTY_VALUES);

  /**
   * Property requestForm
   * @readonly
   * @description The note field and its rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<InterventionRequestChangesFormValues>}
   */
  protected readonly requestForm: FieldTree<InterventionRequestChangesFormValues> = form(
    this.model,
    (path) => {
      required(path.note, {
        message: $localize`:@@intervention.rc.noteRequired:A note is required so the agent knows what to fix.`,
      });
      maxLength(path.note, NOTE_MAX_LENGTH, {
        message: $localize`:@@intervention.rc.noteLength:The note is too long.`,
      });
    },
  );

  /**
   * Property serverMessages
   * @readonly
   *
   * @description
   * Everything the API said about the rejected transition, as flat lines above
   * the field. Routing a violation back to its field needs a Signal Forms
   * server-error convention this codebase has not established yet, and
   * swallowing the messages would be worse than grouping them.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const error: unknown = this.serverError();

    if (error === null || error === undefined) return [];

    const combined: readonly string[] = [
      ...new Set([
        ...Object.values(toServerFieldErrors(error)),
        ...toUnmatchedViolations(error, []).map(
          (violation: Violation): string => violation.message,
        ),
      ]),
    ];

    return combined.length > 0
      ? combined
      : [
          $localize`:@@intervention.requestChanges.transitionFailed:The intervention status could not be changed.`,
        ];
  });
  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Validates, then emits the trimmed note. The draft is deliberately not
   * reset: a rejected request must not wipe what the reviewer wrote.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The form submission.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.requestForm().markAsTouched();

    if (this.requestForm().invalid() || this.pending() || this.disabled()) return;

    this.submitted.emit({ note: this.model().note.trim() });
  }
  //#endregion
}
