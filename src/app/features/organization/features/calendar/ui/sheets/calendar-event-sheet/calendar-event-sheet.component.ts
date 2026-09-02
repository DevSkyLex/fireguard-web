import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { StoreError } from '@core/request-state';
import type { CalendarFeedItemOutput } from '@features/organization/features/calendar/models';
import { sheetSide } from '@shared/sheet-side';
import { HlmSheet, HlmSheetImports } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import { CalendarEventForm, type CalendarEventFormValues } from '../../forms/calendar-event-form';

/**
 * Component CalendarEventSheet
 * @class CalendarEventSheet
 *
 * @description
 * The spartan sheet hosting {@link CalendarEventForm}, which creates or
 * edits a standalone calendar event. Mode follows {@link editing}: `null`
 * creates a new event, a value seeds the form with that record's fields and
 * switches the panel's own title/description to editing.
 *
 * Purely presentational: it owns the overlay chrome, forwards every input
 * to the form, and re-emits {@link submitted} — the page keeps the store
 * call, the permission gate and the source-gating that decides whether
 * editing is even offered; this sheet never inspects `sourceKey`
 * (`ARCHITECTURE.md` §10.5). Dismissal is blocked while a request is in
 * flight. An Escape or outside-click on a dirty draft — in either create or
 * edit mode — is undone and turned into the shared unsaved-changes
 * confirmation, exactly as `facility-create-sheet` does.
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-calendar-event-sheet
 *   [visible]="eventDialogVisible()"
 *   [pending]="isEventWritePending()"
 *   [serverError]="eventWriteError()"
 *   [editing]="editingEvent()"
 *   [facilityOptions]="facilityOptions()"
 *   (visibleChange)="onEventDialogVisibleChanged($event)"
 *   (submitted)="onEventFormSubmitted($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-event-sheet',
  imports: [CalendarEventForm, UnsavedChangesDialog, ...HlmSheetImports],
  templateUrl: './calendar-event-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarEventSheet {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the panel is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether the create/update write is in flight, forwarded to the form and blocking dismissal.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the last write attempt failed with, forwarded to the form.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<StoreError | null>}
   */
  public readonly serverError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property editing
   * @readonly
   * @description The `event`-source entry being edited, or `null` when creating a new one.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<CalendarFeedItemOutput | null>}
   */
  public readonly editing: InputSignal<CalendarFeedItemOutput | null> =
    input<CalendarFeedItemOutput | null>(null);

  /**
   * Property facilityOptions
   * @readonly
   * @description The organization's facilities, forwarded to the form as the optional association.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<{ readonly label: string; readonly value: string }>>}
   */
  public readonly facilityOptions: InputSignal<
    ReadonlyArray<{ readonly label: string; readonly value: string }>
  > = input<ReadonlyArray<{ readonly label: string; readonly value: string }>>([]);

  /**
   * Property initialStartsAt
   * @readonly
   * @description A `yyyy-MM-ddTHH:mm` start pre-filling the create draft — set when the page opened the dialog from a day cell's quick-create. Ignored while {@link editing} holds a record.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<string | null>}
   */
  public readonly initialStartsAt: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description Reports the panel opening or closing, including a dismissal.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   * @description The form's validated draft, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CalendarEventFormValues>}
   */
  public readonly submitted: OutputEmitterRef<CalendarEventFormValues> =
    output<CalendarEventFormValues>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Clears {@link dirty} whenever the panel closes, so an abandoned draft cannot make the next opening confirm over nothing.
   * @access public
   * @since 1.1.0
   */
  public constructor() {
    effect((): void => {
      const isVisible: boolean = this.visible();

      untracked((): void => {
        if (!isVisible) this.dirty.set(false);
      });
    });
  }
  //#endregion

  //#region Properties
  /**
   * Property sheetState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link visible}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property side
   * @readonly
   * @description The panel's side — `'bottom'` below `sm`, `'right'` at and above it (`DESIGN.md` "Action Surfaces" rule 2).
   * @access protected
   * @since 2.0.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property dirty
   * @readonly
   * @description Whether closing right now would lose something — set from the form's `dirtyChanged`, in either create or edit mode. Gates {@link requestClose}.
   * @access protected
   * @since 1.1.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property unsavedChangesDialogState
   * @readonly
   * @description Open state of the shared {@link UnsavedChangesDialog}, raised by {@link requestClose} when {@link dirty} is true.
   * @access protected
   * @since 1.1.0
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly unsavedChangesDialogState: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');

  /**
   * Property sheetRef
   * @readonly
   * @description The panel directive, queried so {@link onStateChanged} can reopen it to undo an Escape/outside-click made while {@link dirty}.
   * @access protected
   * @since 1.1.0
   * @type {Signal<HlmSheet | undefined>}
   */
  protected readonly sheetRef: Signal<HlmSheet | undefined> = viewChild(HlmSheet);
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal — escape, the backdrop, the close button — ignoring
   * the echo of a change the page already made; a dismissal reaching here
   * while {@link dirty} is undone and redirected to the confirmation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    if (!isOpen && this.dirty()) {
      this.sheetRef()?.open();
      this.unsavedChangesDialogState.set('open');

      return;
    }

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method requestClose
   * @description The panel's own close action, reached from the form's Cancel. Closes right away when nothing would be lost; otherwise asks first.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected requestClose(): void {
    if (this.dirty()) {
      this.unsavedChangesDialogState.set('open');

      return;
    }

    this.visibleChange.emit(false);
  }

  /**
   * Method onUnsavedChangesConfirmed
   * @description The operator chose to discard the draft — closes both the confirmation and the panel.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected onUnsavedChangesConfirmed(): void {
    this.unsavedChangesDialogState.set('closed');
    this.visibleChange.emit(false);
  }

  /**
   * Method onUnsavedChangesDismissed
   * @description The operator chose to keep editing — closes the confirmation only.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected onUnsavedChangesDismissed(): void {
    this.unsavedChangesDialogState.set('closed');
  }
  //#endregion
}
