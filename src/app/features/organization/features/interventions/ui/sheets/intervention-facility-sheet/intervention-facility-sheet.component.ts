import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
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
import type { CreateFacilityInput } from '@features/organization/features/facilities/models';
import { FacilityCreateForm } from '@features/organization/features/facilities/ui/forms/facility-create-form';
import { sheetSide } from '@shared/sheet-side';
import { HlmButton } from '@shared/ui/button';
import { HlmSheetImports } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';

/**
 * Component InterventionFacilitySheet
 * @class InterventionFacilitySheet
 *
 * @description
 * The spartan sheet hosting `FacilityCreateForm` from the intervention detail
 * page, so a `site_setup` intervention can attach the facility the backend's
 * "At least one facility is required" publication blocker asks for without
 * leaving the workspace.
 *
 * Purely presentational, mirroring `InterventionWorkItemSheet`: it owns the
 * panel, forwards `visible`/`visibleChange` and re-emits the form's
 * `submitted` untouched — the page enriches the payload with the
 * organization and intervention IRIs and calls the store
 * (`ARCHITECTURE.md` §10.5). Its open state is derived from `visible`
 * rather than held locally, so the page stays the single owner.
 *
 * Deliberately minimal: no parent-facility candidates, map center, or
 * address geocoding are wired in, since the intervention workspace has no
 * facility hierarchy or map context of its own to offer — the form still
 * renders its "Pick on map" and "Locate address" controls, but they compose
 * within a single session (coordinates typed by hand still work); wiring
 * `geocodeRequested` is left to whichever agent picks up richer editing here.
 *
 * Below `sm` the panel presents as a bottom drawer (`@shared/sheet-side`)
 * instead of a right-hand panel, so its footer lands in the thumb zone.
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
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-facility-sheet',
  imports: [FacilityCreateForm, NgIcon, HlmButton, UnsavedChangesDialog, ...HlmSheetImports],
  providers: [provideIcons({ lucideX })],
  templateUrl: './intervention-facility-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionFacilitySheet {
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
   * @description Whether the creation request is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property serverError
   * @readonly
   * @description Whatever the creation failed with, forwarded to the form.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description The panel wants to open or close.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   * @description The form's validated payload, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CreateFacilityInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateFacilityInput> = output<CreateFacilityInput>();
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Clears {@link dirty} whenever the panel closes, so a draft abandoned once cannot make the next opening raise a confirmation over nothing.
   * @access public
   * @since 1.0.0
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
   * @description The panel state, derived from {@link visible} so there is no second copy of the truth.
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
   * @since 1.0.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property dirty
   * @readonly
   * @description Whether closing right now would lose something — set from `FacilityCreateForm.dirtyChanged`. Gates {@link requestClose}.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property unsavedChangesDialogState
   * @readonly
   * @description Open state of the shared `UnsavedChangesDialog`, raised by {@link requestClose} when {@link dirty} is true.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly unsavedChangesDialogState: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');

  /**
   * Property injector
   * @readonly
   * @description Hands {@link requestClose} its `afterNextRender` context, since the method runs outside construction.
   * @access private
   * @since 1.0.0
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);
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

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method requestClose
   * @method requestClose
   *
   * @description
   * The panel's single closing gate — reached from the form's Cancel, the
   * plain close button, and the local Escape binding alike. A no-op while
   * {@link pending} (a request is in flight); a dirty draft opens
   * `UnsavedChangesDialog` and defers to {@link onUnsavedChangesConfirmed} /
   * {@link onUnsavedChangesDismissed}. A clean verdict is re-checked once
   * after the next render before closing: {@link dirty} arrives through the
   * form's `dirtyChanged` effect that flushes in the very change-detection
   * pass the closing keystroke schedules, so an Escape landing right after
   * typing would otherwise read a stale `false` and discard the draft.
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

    afterNextRender(
      (): void => {
        if (this.pending()) return;

        if (this.dirty()) {
          this.unsavedChangesDialogState.set('open');

          return;
        }

        this.visibleChange.emit(false);
      },
      { injector: this.injector },
    );
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
    this.visibleChange.emit(false);
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
