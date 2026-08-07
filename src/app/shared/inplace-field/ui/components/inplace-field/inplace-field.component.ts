import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  untracked,
  viewChild,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil } from '@ng-icons/lucide';
import { HlmButtonImports } from '@shared/ui/button';
import { HlmSpinnerImports } from '@shared/ui/spinner';

/**
 * Constant FOCUSABLE_SELECTOR
 * @const FOCUSABLE_SELECTOR
 *
 * @description
 * Matches the first element the editor can hand focus to when it opens.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
const FOCUSABLE_SELECTOR: string =
  'input,select,textarea,button,[href],[tabindex]:not([tabindex="-1"])';

/**
 * Constant instanceCount
 * @description Seeds the per-instance editor id that `aria-controls` points at.
 * @since 1.0.0
 * @type {number}
 */
let instanceCount: number = 0;

/**
 * Component InplaceField
 * @class InplaceField
 *
 * @description
 * The edit-where-it-is-displayed shell `ARCHITECTURE.md` §10.5 prescribes: a
 * value that reads as text until it is activated, then becomes its own editor
 * in the space it already occupied. Generic by design — it projects the display
 * and the control, so it knows nothing about the value's type.
 *
 * It owns the lifecycle only: the disclosure toggle, Escape-reverts-and-returns-
 * focus, the pending lock, and the error line. The draft lives in the projected
 * control, which the host seeds on open and reads on `saved`.
 *
 * Two deliberate contracts. **`editing` is controlled**, so "one field open at a
 * time" is structural rather than conventional and a surface can open a field
 * from elsewhere. And the field **never closes itself** after `saved` — only the
 * host knows whether the call succeeded, and a field that closed itself would
 * hide a failure.
 *
 * A non-editable field renders as a disabled trigger: no hover, no pencil, out
 * of the tab order. A property that cannot be written must not look writable.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-inplace-field
 *   label="Priority"
 *   commit="pick"
 *   [editable]="canEditPlanning()"
 *   [editing]="editState().open === 'priority'"
 *   [pending]="editState().saving === 'priority'"
 *   [error]="editState().failed === 'priority' ? editState().failure : null"
 *   (editingChange)="onEditingChange('priority', $event)"
 * >
 *   <app-intervention-tag fieldValue kind="priority" [value]="intervention().priority" asOption />
 *   <hlm-select fieldEditor [(ngModel)]="draft">…</hlm-select>
 * </app-inplace-field>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inplace-field',
  imports: [NgIcon, ...HlmButtonImports, ...HlmSpinnerImports],
  templateUrl: './inplace-field.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons({ lucidePencil })],
})
export class InplaceField {
  //#region Inputs
  /**
   * Property label
   * @readonly
   *
   * @description
   * The property's name, already localized. Shown at rest and while editing.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property editable
   * @readonly
   *
   * @description
   * Whether the property accepts a write at all. `false` renders a disabled
   * trigger — plain text, no affordance, no tab stop.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly editable: InputSignalWithTransform<boolean, unknown> = input(false, {
    transform: booleanAttribute,
  });

  /**
   * Property editing
   * @readonly
   *
   * @description
   * The controlled open state. The host owns which field is open; this
   * component owns every transition out of it.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly editing: InputSignalWithTransform<boolean, unknown> = input(false, {
    transform: booleanAttribute,
  });

  /**
   * Property commit
   * @readonly
   *
   * @description
   * `'pick'` for a control whose selection is itself the confirmation, so no
   * Save button is rendered; `'confirm'` for free text, which has no such
   * gesture and keeps an explicit Save/Cancel pair.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<'pick' | 'confirm'>}
   */
  public readonly commit: InputSignal<'pick' | 'confirm'> = input<'pick' | 'confirm'>('confirm');

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether this field's own write is in flight. Locks the actions and marks
   * the editor `aria-busy`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly pending: InputSignalWithTransform<boolean, unknown> = input(false, {
    transform: booleanAttribute,
  });

  /**
   * Property error
   * @readonly
   *
   * @description
   * The rejection message for this field's last write, announced in place. The
   * host keeps the field open so the draft survives the failure.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property canSave
   * @readonly
   *
   * @description
   * Whether the projected draft is valid and worth sending. Confirm mode only.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly canSave: InputSignalWithTransform<boolean, unknown> = input(true, {
    transform: booleanAttribute,
  });

  /**
   * Property orientation
   * @readonly
   *
   * @description
   * How the label sits against the value. `'horizontal'` reserves a fixed label
   * column so a vertical stack of fields lines up — the right call in a list or
   * a rail. `'vertical'` puts the label above and gives the value the whole
   * width, which is what a field already framed by its own card needs: there,
   * the fixed column is chrome the card already provides, and it is what
   * truncates a long value.
   *
   * Mirrors `hlm-field`'s own `orientation`, so the vocabulary is the one the
   * design system already uses.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<'horizontal' | 'vertical'>}
   */
  public readonly orientation: InputSignal<'horizontal' | 'vertical'> = input<
    'horizontal' | 'vertical'
  >('horizontal');
  //#endregion

  //#region Outputs
  /**
   * Property editingChange
   * @readonly
   *
   * @description
   * Requests an open or a close. Every exit path emits it — the trigger,
   * Cancel, and Escape.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly editingChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property saved
   * @readonly
   *
   * @description
   * The user asked to commit the projected draft. Confirm mode only; in pick
   * mode the control's own selection is the commit and the host dispatches it.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly saved: OutputEmitterRef<void> = output<void>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * The edit was abandoned, so the host can drop its draft. Always paired with
   * an `editingChange(false)`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property triggerLayout
   * @readonly
   * @description The resting row's own axis, literal so Tailwind scans it.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly triggerLayout: Signal<string> = computed<string>(() =>
    this.orientation() === 'vertical' ? 'flex-col items-stretch gap-0.5' : 'items-center gap-2',
  );

  /**
   * Property labelLayout
   * @readonly
   * @description The label's own width, fixed only when the fields must line up.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly labelLayout: Signal<string> = computed<string>(() =>
    this.orientation() === 'vertical' ? 'truncate' : 'w-24 shrink-0',
  );

  /**
   * Property editorId
   * @readonly
   * @description The editor's DOM id, which the trigger's `aria-controls` names.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  public readonly editorId: string = `inplace-field-editor-${(instanceCount += 1)}`;

  /**
   * Property labelId
   * @readonly
   *
   * @description
   * The editing label's DOM id, so a host can point its projected control at it
   * with `aria-labelledby` instead of inventing a second name for the field.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  public readonly labelId: string = `inplace-field-label-${instanceCount}`;

  /**
   * Property trigger
   * @readonly
   * @description The resting button, which regains focus when the field closes.
   * @access protected
   * @since 1.0.0
   * @type {Signal<ElementRef<HTMLButtonElement> | undefined>}
   */
  protected readonly trigger: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('trigger');

  /**
   * Property editor
   * @readonly
   * @description The editor wrapper, whose first focusable receives focus on open.
   * @access protected
   * @since 1.0.0
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  protected readonly editor: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('editor');
  //#endregion

  //#region Constructor
  constructor() {
    effect((): void => {
      const isEditing: boolean = this.editing();
      const host: HTMLElement | undefined = this.editor()?.nativeElement;

      untracked((): void => {
        if (isEditing) {
          this.focusEditor(host);
          return;
        }

        this.restoreTriggerFocus();
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method requestOpen
   *
   * @description
   * Asks the host to open this field. A disabled trigger never reaches it.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected requestOpen(): void {
    if (!this.editable() || this.editing()) return;

    this.editingChange.emit(true);
  }

  /**
   * Method requestCancel
   *
   * @description
   * Abandons the edit. Refused while a write is in flight — that request has
   * already left.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected requestCancel(): void {
    if (this.pending()) return;

    this.cancelled.emit();
    this.editingChange.emit(false);
  }

  /**
   * Method onEscape
   *
   * @description
   * Cancels the field, unless the projected control already consumed the key to
   * close its own popup — one Escape closes the listbox, the next closes the
   * field.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The Escape keydown.
   *
   * @returns {void}
   */
  protected onEscape(event: Event): void {
    if (event.defaultPrevented) return;

    event.stopPropagation();
    this.requestCancel();
  }

  /**
   * Method focusEditor
   *
   * @description
   * Moves focus into the freshly opened editor so the keyboard lands where the
   * pointer would have. Driven by the view child rather than by `editing`
   * alone, because the editor does not exist yet on the tick that opens it.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {HTMLElement | undefined} host - The editor wrapper, once rendered.
   *
   * @returns {void}
   */
  private focusEditor(host: HTMLElement | undefined): void {
    if (!host || host.contains(host.ownerDocument.activeElement)) return;

    const focusable: HTMLElement | null = host.querySelector(FOCUSABLE_SELECTOR);

    focusable?.focus();
  }

  /**
   * Method restoreTriggerFocus
   *
   * @description
   * Returns focus to the trigger when the field closes, but only if focus was
   * still inside it — otherwise closing one field would steal focus from
   * wherever the user actually moved.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private restoreTriggerFocus(): void {
    const button: HTMLButtonElement | undefined = this.trigger()?.nativeElement;
    if (!button) return;

    const active: Element | null = button.ownerDocument.activeElement;
    const isFocusLoose: boolean = active === null || active === button.ownerDocument.body;
    if (!isFocusLoose) return;

    button.focus();
  }
  //#endregion
}
