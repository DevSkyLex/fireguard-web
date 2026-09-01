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
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type {
  InterventionRecurrenceFormTarget,
  InterventionRecurrenceFormValues,
  InterventionRecurrenceOutput,
  InterventionTemplateOutput,
  MemberSelectOption,
  SelectOption,
} from '@features/organization/features/interventions/models';
import { sheetSide } from '@shared/sheet-side';
import { HlmButton } from '@shared/ui/button';
import { HlmSheetImports } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import { InterventionRecurrenceForm } from '../../forms/intervention-recurrence-form';

/**
 * Component InterventionRecurrenceSheet
 * @class InterventionRecurrenceSheet
 *
 * @description
 * The spartan sheet hosting {@link InterventionRecurrenceForm} for a single
 * create or edit draft. Purely presentational: it owns the panel and
 * forwards the form's `submitted`; the page keeps the orchestration
 * (`ARCHITECTURE.md` §10.5).
 *
 * {@link target} is the single source of truth for both what the panel is
 * open on and what it opens for — `'create'` seeds a blank draft, a row
 * seeds an edit, `null` closes it. There is no separate `visible` input, so
 * the page cannot drift the two apart.
 *
 * Guards {@link InterventionRecurrenceForm.dirtyChanged} against silent
 * loss the same way {@link InterventionDiscussionSheet} guards its thread's
 * draft: an unsubmitted edit marks {@link dirty}, and any attempt to close —
 * Escape, the close button, or the form's own Cancel — opens the shared
 * {@link UnsavedChangesDialog} instead of closing outright.
 *
 * Closing goes exclusively through {@link requestClose}: `disableClose` is
 * hard-`true` (never reactive) so brn's own Escape/outside-click `dismiss()`
 * is permanently a no-op, the vendored close button is replaced with a plain
 * one wired to {@link requestClose} (it otherwise calls the dialog ref's
 * `close()` directly, bypassing any gate), and a local `(keydown.escape)`
 * binding restores Escape by routing it through the same method. No
 * `reopen()`-on-`stateChanged` workaround: the previous approach read
 * whether a still-mid-close dialog ref could be resurrected, a comparison
 * that raced with the overlay stack and flaked under WebKit — every close
 * attempt landing on one gate before the dialog ref is ever touched removes
 * that race entirely.
 *
 * Below `sm` the panel presents as a bottom drawer (`@shared/sheet-side`)
 * instead of a right-hand panel, so its footer lands in the thumb zone.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-recurrence-sheet',
  imports: [
    InterventionRecurrenceForm,
    NgIcon,
    HlmButton,
    UnsavedChangesDialog,
    ...HlmSheetImports,
  ],
  providers: [provideIcons({ lucideX })],
  templateUrl: './intervention-recurrence-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionRecurrenceSheet {
  //#region Inputs
  /**
   * Property target
   * @readonly
   *
   * @description
   * What the panel is open on: `'create'` for a blank draft, a recurrence
   * row for an edit, `null` for closed. Owned by the page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionRecurrenceFormTarget>}
   */
  public readonly target: InputSignal<InterventionRecurrenceFormTarget> =
    input<InterventionRecurrenceFormTarget>(null);

  /**
   * Property pending
   * @readonly
   * @description Whether a create/update request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description The last create/update failure message, if any.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly serverError: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property templates
   * @readonly
   * @description The organization's intervention templates, forwarded to the form.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionTemplateOutput[]>}
   */
  public readonly templates: InputSignal<readonly InterventionTemplateOutput[]> = input<
    readonly InterventionTemplateOutput[]
  >([]);

  /**
   * Property siteOptions
   * @readonly
   * @description The organization's sites, forwarded to the form.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly SelectOption[]>}
   */
  public readonly siteOptions: InputSignal<readonly SelectOption[]> = input<
    readonly SelectOption[]
  >([]);

  /**
   * Property memberOptions
   * @readonly
   * @description The organization's members, forwarded to the form.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly memberOptions: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description The form's validated values, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<InterventionRecurrenceFormValues>}
   */
  public readonly submitted: OutputEmitterRef<InterventionRecurrenceFormValues> =
    output<InterventionRecurrenceFormValues>();

  /**
   * Property closed
   * @readonly
   * @description The panel was dismissed, deliberately or through the unsaved-changes dialog.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly closed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Clears {@link dirty} whenever the panel closes, so a draft abandoned once cannot make the next opening raise a confirmation over nothing.
   * @access public
   * @since 1.1.0
   */
  public constructor() {
    effect((): void => {
      const isVisible: boolean = this.target() !== null;

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
   * @description The panel state, derived from {@link target} so there is no second copy of the truth.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.target() !== null ? 'open' : 'closed',
  );

  /**
   * Property side
   * @readonly
   * @description The panel's side — `'bottom'` below `sm`, `'right'` at and above it (`DESIGN.md` "Action Surfaces" rule 2).
   * @access protected
   * @since 1.0.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property isEdit
   * @readonly
   * @description Whether {@link target} names an existing row rather than a blank create draft.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isEdit: Signal<boolean> = computed<boolean>(() => {
    const value: InterventionRecurrenceFormTarget = this.target();

    return value !== null && value !== 'create';
  });

  /**
   * Property formRecurrence
   * @readonly
   * @description {@link target} narrowed to what the form's `recurrence` input expects — `null` for both "closed" and "create".
   * @access protected
   * @since 1.0.0
   * @type {Signal<InterventionRecurrenceOutput | null>}
   */
  protected readonly formRecurrence: Signal<InterventionRecurrenceOutput | null> =
    computed<InterventionRecurrenceOutput | null>(() => {
      const value: InterventionRecurrenceFormTarget = this.target();

      return value !== null && value !== 'create' ? value : null;
    });

  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Whether closing right now would lose something — set from
   * {@link InterventionRecurrenceForm.dirtyChanged}. Gates {@link requestClose}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property unsavedChangesDialogState
   * @readonly
   * @description Open state of the shared {@link UnsavedChangesDialog}, raised by {@link requestClose} when {@link dirty} is true.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly unsavedChangesDialogState: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Relays the panel's own state, ignoring the echo of a change the page
   * already made. With `disableClose` hard-`true` and the vendored close
   * button replaced, brn never drives an unrequested `'closed'` here on its
   * own — every real closing attempt reaches {@link requestClose} first.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The panel's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === (this.target() !== null)) return;

    this.closed.emit();
  }

  /**
   * Method requestClose
   * @method requestClose
   *
   * @description
   * The panel's single closing gate — reached from the form's Cancel, the
   * plain close button, and the local Escape binding alike. A no-op while
   * {@link pending} (a write is in flight); otherwise closes right away
   * when nothing would be lost, or opens {@link UnsavedChangesDialog} and
   * defers to {@link onUnsavedChangesConfirmed} /
   * {@link onUnsavedChangesDismissed}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected requestClose(): void {
    if (this.pending()) return;

    if (this.dirty()) {
      this.unsavedChangesDialogState.set('open');

      return;
    }

    this.closed.emit();
  }

  /**
   * Method onUnsavedChangesConfirmed
   * @method onUnsavedChangesConfirmed
   * @description The operator chose to discard the draft — closes both the confirmation and the panel itself.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onUnsavedChangesConfirmed(): void {
    this.unsavedChangesDialogState.set('closed');
    this.closed.emit();
  }

  /**
   * Method onUnsavedChangesDismissed
   * @method onUnsavedChangesDismissed
   * @description The operator chose to keep editing — closes the confirmation only, the panel stays open.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onUnsavedChangesDismissed(): void {
    this.unsavedChangesDialogState.set('closed');
  }
  //#endregion
}
