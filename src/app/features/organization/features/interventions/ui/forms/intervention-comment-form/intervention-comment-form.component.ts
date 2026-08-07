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
import { HlmTextareaImports } from '@shared/ui/textarea';
import type { InterventionCommentFormValues } from './models';

/** Longest a comment may be — mirrors what `InterventionService.addComment` accepts. */
const COMMENT_MAX_LENGTH: number = 2000;

/** A blank comment. */
const EMPTY_VALUES: InterventionCommentFormValues = { body: '' };

/**
 * Component InterventionCommentForm
 * @class InterventionCommentForm
 *
 * @description
 * Where a comment is written onto the intervention's activity thread. Plain
 * text, no rich editor — the thread already carries system entries with
 * their own formatting, and a comment is read alongside them, not composed
 * as a separate document.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-comment-form
 *   [pending]="store.saving()"
 *   [serverError]="store.mutationError()"
 *   (submitted)="postComment($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-comment-form',
  imports: [FormField, HlmButton, ...HlmFieldImports, ...HlmTextareaImports],
  templateUrl: './intervention-comment-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCommentForm {
  //#region Inputs
  /**
   * Property pending
   * @readonly
   * @description Whether a comment is already being posted.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property disabled
   * @readonly
   * @description Whether commenting is unavailable at all.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the last post failed with.
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
   * @description The validated, trimmed comment body.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly submitted: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property model
   * @readonly
   * @description The comment being drafted.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<InterventionCommentFormValues>}
   */
  protected readonly model: WritableSignal<InterventionCommentFormValues> =
    signal<InterventionCommentFormValues>(EMPTY_VALUES);

  /**
   * Property commentForm
   * @readonly
   * @description The body field and its rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<InterventionCommentFormValues>}
   */
  protected readonly commentForm: FieldTree<InterventionCommentFormValues> = form(
    this.model,
    (path) => {
      required(path.body, {
        message: $localize`:@@intervention.comment.required:Write a comment first.`,
      });
      maxLength(path.body, COMMENT_MAX_LENGTH, {
        message: $localize`:@@intervention.comment.tooLong:This comment is too long.`,
      });
    },
  );

  /**
   * Property serverMessages
   * @readonly
   * @description Everything the API said about the rejected post, as flat lines above the field.
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
        ...toUnmatchedViolations(error, []).map(
          (violation: Violation): string => violation.message,
        ),
      ]),
    ];

    return combined.length > 0
      ? combined
      : [$localize`:@@intervention.workspace.commentAddFailed:The comment could not be posted.`];
  });
  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Validates, emits the trimmed body, then clears the field — a posted
   * comment is optimistic (the store appends it before the response lands),
   * so the composer is ready for the next one rather than waiting on a round
   * trip.
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
    this.commentForm().markAsTouched();

    if (this.commentForm().invalid() || this.pending() || this.disabled()) return;

    this.submitted.emit(this.model().body.trim());
    this.model.set(EMPTY_VALUES);
    this.commentForm().reset();
  }
  //#endregion
}
