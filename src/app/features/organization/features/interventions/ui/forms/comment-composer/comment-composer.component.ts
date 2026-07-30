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
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { EditorModule, type EditorTextChangeEvent } from 'primeng/editor';

/**
 * Component CommentComposer
 * @class CommentComposer
 *
 * @description
 * Generic, domain-agnostic rich-text comment input built on the PrimeNG
 * (Quill) editor. Owns only the draft HTML; on submit it emits the HTML and
 * clears the editor. A non-empty check on the plain-text length guards against
 * submitting Quill's blank `<p><br></p>`. Submits on the Send button or on
 * Ctrl/Cmd+Enter.
 *
 * @example ```html
 * <app-comment-composer [pending]="posting()" (submitted)="addComment($event)" />
 * ```
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-comment-composer',
  imports: [ButtonModule, EditorModule, FormsModule],
  templateUrl: './comment-composer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentComposer {
  //#region Inputs
  /**
   * Property placeholder
   * @readonly
   *
   * @description
   * Editor placeholder and accessible label. Defaults to a localized
   * "Write a comment…".
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly placeholder: InputSignal<string | undefined> = input<string>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a submission is in flight: shows a loading submit button and
   * blocks further submits.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether the whole composer is disabled (renders the editor read-only).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits the draft HTML on submit. The editor is cleared immediately after.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly submitted: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region State
  /**
   * Property draftHtml
   *
   * @description
   * Current draft HTML, two-way bound to the editor.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {string}
   */
  protected draftHtml = '';

  /**
   * Property plainLength
   * @readonly
   *
   * @description
   * Trimmed plain-text length of the draft, used to enable submission and skip
   * Quill's blank output.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly plainLength: WritableSignal<number> = signal<number>(0);
  //#endregion

  //#region Properties
  /**
   * Property effectivePlaceholder
   * @readonly
   *
   * @description
   * {@link placeholder}, falling back to a localized default.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly effectivePlaceholder: Signal<string> = computed(
    () => this.placeholder() ?? $localize`:@@shared.commentComposer.placeholder:Write a comment…`,
  );

  /**
   * Property submitLabel
   * @readonly
   *
   * @description
   * Localized label for the submit button.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly submitLabel: string = $localize`:@@shared.commentComposer.submitLabel:Send`;

  /**
   * Property canSubmit
   * @readonly
   *
   * @description
   * Whether the draft can currently be submitted: non-blank, and neither
   * pending nor disabled.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canSubmit: Signal<boolean> = computed(
    () => this.plainLength() > 0 && !this.pending() && !this.disabled(),
  );
  //#endregion

  //#region Methods
  /**
   * Method onTextChange
   *
   * @description
   * Tracks the editor's plain-text length so blank drafts cannot be submitted.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {EditorTextChangeEvent} event - The editor text-change event.
   * @returns {void}
   */
  protected onTextChange(event: EditorTextChangeEvent): void {
    this.plainLength.set((event.textValue ?? '').trim().length);
  }

  /**
   * Method submit
   *
   * @description
   * Emits the draft HTML through {@link submitted} and clears the editor, a
   * no-op when the draft is blank, pending, or disabled.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected submit(): void {
    if (this.plainLength() <= 0 || this.pending() || this.disabled()) return;

    this.submitted.emit(this.draftHtml);
    this.draftHtml = '';
    this.plainLength.set(0);
  }

  /**
   * Method onKeydown
   *
   * @description
   * Submits on Ctrl/Cmd+Enter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - The composer keydown event.
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      this.submit();
    }
  }
  //#endregion
}
