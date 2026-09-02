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
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, maxLength, required, type FieldTree } from '@angular/forms/signals';
import type { StoreError } from '@core/request-state';
import type {
  AddNonConformityInput,
  NonConformitySeverity,
} from '@features/organization/features/inspections/models';
import { RequiredMarker } from '@shared/required-marker';
import { HlmButton } from '@shared/ui/button';
import { HlmDatePickerImports } from '@shared/ui/date-picker';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmTextareaImports } from '@shared/ui/textarea';
import { InspectionStatusTag } from '../../components/inspection-status-tag';
import type { NonConformityAddDraft } from './models';

/** A blank draft. */
const EMPTY_DRAFT: NonConformityAddDraft = {
  description: '',
  severity: '',
  dueAt: null,
  notes: '',
};

/** The backend's `Assert\Length(max: 2000)` bound on `description`, enforced client-side too. */
const DESCRIPTION_MAX_LENGTH: number = 2000;

/** The backend's `Assert\Length(max: 5000)` bound on `notes`, enforced client-side too. */
const NOTES_MAX_LENGTH: number = 5000;

/** Every severity the select offers. */
const SEVERITY_VALUES: ReadonlyArray<NonConformitySeverity> = ['low', 'medium', 'high', 'critical'];

/**
 * Component NonConformityAddForm
 * @class NonConformityAddForm
 *
 * @description
 * Records a non-conformity on the current inspection: a required
 * description, a required severity, and an optional due date and notes —
 * the full shape of `AddNonConformityInput`.
 *
 * Presentational: it validates and emits {@link submitted}; the hosting
 * `NonConformityAddDialog` forwards it untouched and the page keeps the
 * store call and the organization/inspection ids this form never needs to
 * know (`ARCHITECTURE.md` §10.5).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-non-conformity-add-form
 *   [visible]="addDialogOpen()"
 *   [pending]="store.isAddingNonConformity()"
 *   [serverError]="store.addNonConformityCallState().error"
 *   (submitted)="onNonConformityAdded($event)"
 *   (cancelled)="addDialogOpen.set(false)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-non-conformity-add-form',
  imports: [
    RequiredMarker,
    FormField,
    InspectionStatusTag,
    HlmButton,
    ...HlmDatePickerImports,
    ...HlmFieldImports,
    ...HlmSelectImports,
    ...HlmTextareaImports,
  ],
  templateUrl: './non-conformity-add-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformityAddForm {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the hosting overlay is open. Watched only to blank the draft on reopen.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether the add request is in flight, which locks the footer controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the last add attempt failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description The validated, API-shaped payload once the form is valid.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<AddNonConformityInput>}
   */
  public readonly submitted: OutputEmitterRef<AddNonConformityInput> =
    output<AddNonConformityInput>();

  /**
   * Property cancelled
   * @readonly
   * @description The operator backed out without recording anything.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** Every severity the select offers. */
  protected readonly severityValues: ReadonlyArray<NonConformitySeverity> = SEVERITY_VALUES;

  /** The edited draft. */
  protected readonly model: WritableSignal<NonConformityAddDraft> =
    signal<NonConformityAddDraft>(EMPTY_DRAFT);

  /**
   * Property addForm
   * @readonly
   * @description The field tree and its rules.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<NonConformityAddDraft>}
   */
  protected readonly addForm: FieldTree<NonConformityAddDraft> = form(this.model, (path) => {
    required(path.description, {
      message: $localize`:@@inspection.nc.addDialog.descriptionRequired:Describe what was found.`,
    });
    maxLength(path.description, DESCRIPTION_MAX_LENGTH, {
      message: $localize`:@@inspection.nc.addDialog.descriptionTooLong:This description is too long.`,
    });
    required(path.severity, {
      message: $localize`:@@inspection.nc.addDialog.severityRequired:Choose a severity.`,
    });
    maxLength(path.notes, NOTES_MAX_LENGTH, {
      message: $localize`:@@inspection.nc.addDialog.notesTooLong:These notes are too long.`,
    });
  });

  /**
   * Property serverMessage
   * @readonly
   * @description The last failed attempt's message, or `null` when there is nothing to show.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string | null>}
   */
  protected readonly serverMessage: Signal<string | null> = computed<string | null>(() => {
    const error: StoreError | null = this.serverError();

    return (
      error?.message ??
      (error
        ? $localize`:@@inspection.nc.addDialog.genericError:This non-conformity could not be recorded.`
        : null)
    );
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Blanks the draft whenever the hosting overlay re-opens, so a previous entry never leaks into the next one.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const isOpen: boolean = this.visible();

      untracked((): void => {
        if (isOpen) this.model.set(EMPTY_DRAFT);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Marks the tree touched so every unmet rule shows at once, then emits
   * the API-shaped payload once the form is valid, trimming the free-text
   * fields and folding a blank optional value to `undefined`.
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

    this.addForm().markAsTouched();

    if (this.addForm().invalid()) return;

    const draft: NonConformityAddDraft = this.model();
    if (draft.severity === '') return;

    const notes: string = draft.notes.trim();

    this.submitted.emit({
      description: draft.description.trim(),
      severity: draft.severity,
      dueAt: draft.dueAt ? draft.dueAt.toISOString() : undefined,
      notes: notes === '' ? undefined : notes,
    });
  }
  //#endregion
}
