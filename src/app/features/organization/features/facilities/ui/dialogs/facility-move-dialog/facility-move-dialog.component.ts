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
import { disabled, form, FormField, validate, type FieldTree } from '@angular/forms/signals';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { idleCallState, type CallState } from '@core/request-state';
import type {
  FacilityOption,
  FacilityMoveRequest,
  FacilityMoveSubmittedEvent,
} from '@features/organization/features/facilities/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmFieldImports } from '@shared/ui/field';
import { FacilityOptionPicker } from '../../components/facility-option-picker';

/**
 * Class FacilityMoveDialog
 *
 * @description
 * Admissible-parent move form. Pages own its server queries, write and confirmed dismissal.
 */
@Component({
  selector: 'app-facility-move-dialog',
  imports: [
    FormField,
    FacilityOptionPicker,
    HlmButton,
    ...HlmDialogImports,
    ...HlmFieldImports,
    ...HlmAlertImports,
  ],
  templateUrl: './facility-move-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityMoveDialog {
  /**
   * Property request
   * @readonly
   *
   * @description
   * Facility being moved, or null when closed.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityMoveRequest | null>}
   */
  public readonly request: InputSignal<FacilityMoveRequest | null> =
    input<FacilityMoveRequest | null>(null);
  /**
   * Property options
   * @readonly
   *
   * @description
   * Current server page of admissible parents.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly FacilityOption[]>}
   */
  public readonly options: InputSignal<readonly FacilityOption[]> = input<
    readonly FacilityOption[]
  >([]);
  /**
   * Property hydratedOption
   * @readonly
   *
   * @description
   * Parent label hydrated separately from the current page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<FacilityOption | null>}
   */
  public readonly hydratedOption: InputSignal<FacilityOption | null> = input<FacilityOption | null>(
    null,
  );
  /**
   * Property busy
   * @readonly
   *
   * @description
   * Whether the accepted move is pending.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly busy: InputSignal<boolean> = input(false);
  /**
   * Property errorMessage
   * @readonly
   *
   * @description
   * Error rendered inline, preserving the selected parent.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly errorMessage: InputSignal<string | null> = input<string | null>(null);
  /**
   * Property optionsCallState
   * @readonly
   *
   * @description
   * Lifecycle of admissible-parent queries.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CallState>}
   */
  public readonly optionsCallState: InputSignal<CallState> = input<CallState>(idleCallState());
  /**
   * Property page
   * @readonly
   *
   * @description
   * Current server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly page: InputSignal<number> = input(1);
  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * Total server pages.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<number>}
   */
  public readonly pageCount: InputSignal<number> = input(1);
  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Submitted choice; caller closes only after confirmed success.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<FacilityMoveSubmittedEvent>}
   */
  public readonly submitted: OutputEmitterRef<FacilityMoveSubmittedEvent> =
    output<FacilityMoveSubmittedEvent>();
  /**
   * Property dismissed
   * @readonly
   *
   * @description
   * Dialog cancellation, locked while saving.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed: OutputEmitterRef<void> = output<void>();
  /**
   * Property searchChanged
   * @readonly
   *
   * @description
   * Requests server search over admissible parents.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly searchChanged: OutputEmitterRef<string> = output<string>();
  /**
   * Property pageChanged
   * @readonly
   *
   * @description
   * Requests a different server page, or retries the current page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly pageChanged: OutputEmitterRef<number> = output<number>();
  /**
   * Property draft
   * @readonly
   *
   * @description
   * Local draft remains independent of refreshed facility revisions.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<{ parentFacilityId: string }>}
   */
  protected readonly draft: WritableSignal<{ parentFacilityId: string }> = signal({
    parentFacilityId: '',
  });
  /**
   * Property moveForm
   * @readonly
   *
   * @description
   * Parent selection uses Signal Forms and requires a parent for every non-site type.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<{ parentFacilityId: string }>}
   */
  protected readonly moveForm: FieldTree<{ parentFacilityId: string }> = form(
    this.draft,
    (path) => {
      disabled(path.parentFacilityId, { when: () => this.busy() });
      validate(path.parentFacilityId, ({ value }) =>
        this.request()?.facilityType === 'site' || value()
          ? null
          : {
              kind: 'parentRequired',
              message: $localize`:@@facility.form.parentRequired:Choose an admissible parent for this place.`,
            },
      );
    },
  );
  /**
   * Property dialogState
   * @readonly
   *
   * @description
   * Dialog visibility follows its request.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.request() ? 'open' : 'closed',
  );
  /**
   * Property description
   * @readonly
   *
   * @description
   * Description identifies the record being moved.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly description: Signal<string> = computed(
    () =>
      $localize`:@@facility.moveDialog.message:Choose the new parent for ${this.request()?.facilityName ?? ''}:facilityName:.`,
  );
  /**
   * Property allowEmpty
   * @readonly
   *
   * @description
   * Sites may have no parent; every other type requires an admissible candidate.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly allowEmpty: Signal<boolean> = computed(
    () => this.request()?.facilityType === 'site',
  );
  /**
   * Property rootOptionLabel
   * @readonly
   *
   * @description
   * Label for moving an incorrectly nested legacy site back to the root.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly rootOptionLabel: string = $localize`:@@facility.moveDialog.rootOption:No parent (root level)`;

  /**
   * Constructor
   * @constructor
   *
   * @description
   * Seeds a new opening, preserving a failed selection when the same record is refreshed.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    let openedId: string | null = null;
    effect(() => {
      const request = this.request();
      if (!request) {
        openedId = null;
        return;
      }
      if (request.facilityId === openedId) return;
      openedId = request.facilityId;
      untracked(() =>
        this.moveForm().reset({ parentFacilityId: request.currentParentFacilityId ?? '' }),
      );
    });
  }

  /**
   * Method onStateChanged
   *
   * @description
   * Relays only cancellable closing transitions.
   *
   * @access protected
   * @since unreleased
   *
   * @param {BrnDialogState} state - state.
   *
   * @returns {void} Return value.
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (state === 'closed' && !this.busy()) this.dismissed.emit();
  }
  /**
   * Method submit
   *
   * @description
   * Emits a valid choice while retaining the draft until the caller confirms it.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Return value.
   */
  protected submit(): void {
    const request = this.request();
    this.moveForm().markAsTouched();
    if (
      !request ||
      this.busy() ||
      this.moveForm().invalid() ||
      this.optionsCallState().status === 'pending'
    )
      return;
    this.submitted.emit({
      facilityId: request.facilityId,
      parentFacilityId: this.draft().parentFacilityId || null,
    });
  }
}
