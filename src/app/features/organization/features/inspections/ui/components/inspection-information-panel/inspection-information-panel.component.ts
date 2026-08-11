import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  InspectionEditState,
  InspectionEditTarget,
  InspectionOutput,
  InspectionResult,
  UpdateInspectionInput,
} from '@features/organization/features/inspections/models';
import { InplaceField } from '@shared/inplace-field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmTextareaImports } from '@shared/ui/textarea';
import { InspectionStatusTag } from '../inspection-status-tag';

/** Every result the `result` field's select offers. */
const RESULT_VALUES: ReadonlyArray<InspectionResult> = ['pass', 'partial', 'fail'];

/** Converts an ISO timestamp to the `YYYY-MM-DD` shape a native date input reads. */
function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Component InspectionInformationPanel
 * @class InspectionInformationPanel
 *
 * @description
 * The inspection's own record — result, performed date, notes and signature
 * — each edited where it is displayed (`ARCHITECTURE.md` §10.5,
 * `FEATURE.md` "The record is the edit surface"); the page owns the
 * draft-only edit gate (only a `draft` inspection may be edited) through the
 * {@link editable} input. Equipment, facility, checklist and the inspector
 * render as plain read-only rows: `UpdateInspectionInput` only accepts the
 * four editable properties, and `FEATURE.md` deliberately keeps the
 * remaining three out of this panel rather than open a picker with nothing
 * to pick from.
 *
 * `result` commits on selection (`pick`); the three free-value fields keep
 * an explicit Save (`confirm`) since none has a single "done" gesture. Only
 * one field is ever open at a time (`editState`), so `notes` and
 * `signature` share one text draft while `performedAt` keeps its own,
 * date-shaped one, mirroring `EquipmentInformationPanel`.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-information-panel',
  imports: [
    RouterLink,
    InplaceField,
    InspectionStatusTag,
    HlmInput,
    ...HlmSelectImports,
    ...HlmTextareaImports,
  ],
  templateUrl: './inspection-information-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionInformationPanel {
  //#region Inputs
  /**
   * Property inspection
   * @readonly
   * @description The loaded inspection whose properties this panel edits.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InspectionOutput>}
   */
  public readonly inspection: InputSignal<InspectionOutput> = input.required<InspectionOutput>();

  /**
   * Property editable
   * @readonly
   * @description Whether the member may write to this inspection right now — write permission and the draft-only gate, both owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly editable: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property editState
   * @readonly
   * @description Which field the page has open, writing, or showing a rejection.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InspectionEditState>}
   */
  public readonly editState: InputSignal<InspectionEditState> =
    input.required<InspectionEditState>();

  /**
   * Property organizationId
   * @readonly
   * @description The workspace owning the inspection, so the equipment/facility rows can link into their own records.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Outputs
  /**
   * Property detailsChanged
   * @readonly
   * @description A patch the page should send. Never emitted for an unchanged value.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<UpdateInspectionInput>}
   */
  public readonly detailsChanged: OutputEmitterRef<UpdateInspectionInput> =
    output<UpdateInspectionInput>();

  /**
   * Property editTargetChanged
   * @readonly
   * @description Asks the page to open or close an editor.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InspectionEditTarget | null>}
   */
  public readonly editTargetChanged: OutputEmitterRef<InspectionEditTarget | null> =
    output<InspectionEditTarget | null>();
  //#endregion

  //#region Properties
  /** Every result the `result` field's select offers. */
  protected readonly resultValues: ReadonlyArray<InspectionResult> = RESULT_VALUES;

  /**
   * Property dateDraft
   * @readonly
   * @description The in-flight `YYYY-MM-DD` value for the `performedAt` field, seeded when it opens.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  protected readonly dateDraft: WritableSignal<string> = signal<string>('');

  /**
   * Property textDraft
   * @readonly
   *
   * @description
   * The in-flight value for whichever confirm-mode text field is open
   * (`notes`, `signature`), seeded when that field opens. A single signal is
   * enough because `InplaceField`'s `editing` is controlled and only one
   * field opens at a time.
   *
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string>}
   */
  protected readonly textDraft: WritableSignal<string> = signal<string>('');

  /**
   * Property canSaveDate
   * @readonly
   * @description Whether the drafted date differs from the stored one and is not blank.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canSaveDate: Signal<boolean> = computed<boolean>(() => {
    const draft: string = this.dateDraft();

    return draft !== '' && draft !== toDateInputValue(this.inspection().performedAt);
  });

  /**
   * Property canSaveText
   * @readonly
   * @description Whether the open text field's draft differs from its stored value.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canSaveText: Signal<boolean> = computed<boolean>(() => {
    const stored: string = this.storedTextValueOf(this.editState().open) ?? '';

    return this.textDraft().trim() !== stored;
  });
  //#endregion

  //#region Methods
  /**
   * Method isEditing
   * @description Whether the page has this field open.
   * @access protected
   * @since 1.0.0
   * @param {InspectionEditTarget} target - The field in question.
   * @returns {boolean} True when it is the open one.
   */
  protected isEditing(target: InspectionEditTarget): boolean {
    return this.editState().open === target;
  }

  /**
   * Method isSaving
   * @description Whether this field's own write is in flight.
   * @access protected
   * @since 1.0.0
   * @param {InspectionEditTarget} target - The field in question.
   * @returns {boolean} True while its patch is pending.
   */
  protected isSaving(target: InspectionEditTarget): boolean {
    return this.editState().saving === target;
  }

  /**
   * Method errorFor
   * @description The rejection message attributed to this field, if any.
   * @access protected
   * @since 1.0.0
   * @param {InspectionEditTarget} target - The field in question.
   * @returns {string | null} Its failure message, or null.
   */
  protected errorFor(target: InspectionEditTarget): string | null {
    const state: InspectionEditState = this.editState();

    return state.failed === target ? state.failure : null;
  }

  /**
   * Method pickResult
   * @description Commits a picked result, unless it is the one already stored.
   * @access protected
   * @since 1.0.0
   * @param {InspectionResult} result - The chosen result.
   * @returns {void}
   */
  protected pickResult(result: InspectionResult): void {
    if (result === this.inspection().result) return;

    this.detailsChanged.emit({ result });
  }

  /**
   * Method onResultEditing
   * @description Forwards the `result` field's open/close request.
   * @access protected
   * @since 1.0.0
   * @param {boolean} open - Whether it is being opened.
   * @returns {void}
   */
  protected onResultEditing(open: boolean): void {
    this.editTargetChanged.emit(open ? 'result' : null);
  }

  /**
   * Method onDateEditing
   * @description Seeds the date draft on open and forwards the open/close request.
   * @access protected
   * @since 1.0.0
   * @param {boolean} open - Whether it is being opened.
   * @returns {void}
   */
  protected onDateEditing(open: boolean): void {
    if (open) this.dateDraft.set(toDateInputValue(this.inspection().performedAt));

    this.editTargetChanged.emit(open ? 'performedAt' : null);
  }

  /**
   * Method saveDate
   * @description Emits the drafted `performedAt` date.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected saveDate(): void {
    if (this.dateDraft() === '') return;

    this.detailsChanged.emit({ performedAt: this.dateDraft() });
  }

  /**
   * Method onTextEditing
   *
   * @description
   * Seeds the shared draft on open and forwards the open/close request to the
   * page, which owns which field is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InspectionEditTarget} target - The text field being opened or closed.
   * @param {boolean} open - Whether it is being opened.
   *
   * @returns {void}
   */
  protected onTextEditing(target: InspectionEditTarget, open: boolean): void {
    if (open) this.textDraft.set(this.storedTextValueOf(target) ?? '');

    this.editTargetChanged.emit(open ? target : null);
  }

  /**
   * Method saveText
   * @description Emits the drafted value for the currently open text field, trimmed and nulled if blank.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected saveText(): void {
    const target: InspectionEditTarget | null = this.editState().open;
    if (target !== 'notes' && target !== 'signature') return;

    const trimmed: string = this.textDraft().trim();

    this.detailsChanged.emit({ [target]: trimmed === '' ? null : trimmed });
  }

  /**
   * Method storedTextValueOf
   * @description The currently stored value for a free-text edit target, or null for `result`/`performedAt`/unset.
   * @access private
   * @since 1.0.0
   * @param {InspectionEditTarget | null} target - The field in question.
   * @returns {string | null} The stored value.
   */
  private storedTextValueOf(target: InspectionEditTarget | null): string | null {
    if (target !== 'notes' && target !== 'signature') return null;

    return this.inspection()[target];
  }
  //#endregion
}
