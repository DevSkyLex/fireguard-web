import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { StoreError } from '@core/request-state';
import type { EquipmentOpenWorkOutput } from '@features/organization/features/equipments/models';
import type {
  ServiceRequestOutput,
  CreateServiceRequestInput,
} from '@features/organization/features/service-requests/models';
import { serviceRequestStatusLabel } from '@features/organization/features/service-requests/utils';
import { sheetSide } from '@shared/sheet-side';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmSheet, HlmSheetImports } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
import {
  ServiceRequestActionForm,
  type ServiceRequestActionKind,
  type ServiceRequestActionIntent,
} from '../../forms/service-request-action-form/service-request-action-form.component';
import { ServiceRequestForm } from '../../forms/service-request-form/service-request-form.component';
/**
 * Type ServiceRequestEditorKind
 *
 * @description
 * Creation, editable description and explicit workflow surfaces use one overlay policy.
 *
 * @since unreleased
 *
 * @type {ServiceRequestEditorKind}
 */
export type ServiceRequestEditorKind = 'create' | 'update' | ServiceRequestActionKind;
/**
 * Class ServiceRequestEditorSheet
 * @class ServiceRequestEditorSheet
 *
 * @description
 * Native workflow sheet preserves dirty drafts, pending writes and uncertain conversion commands.
 *
 * @since unreleased
 */
@Component({
  selector: 'app-service-request-editor-sheet',
  templateUrl: './service-request-editor-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HlmButton,
    ServiceRequestForm,
    ServiceRequestActionForm,
    UnsavedChangesDialog,
    ...HlmSheetImports,
    ...HlmAlertImports,
  ],
})
export class ServiceRequestEditorSheet {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority shared by the owning route and server transport.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId = input.required<string>();
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Controlled overlay visibility provided by the owning page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible = input(false);
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Explicit workflow action currently being prepared.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ServiceRequestEditorKind>}
   */
  public readonly kind = input<ServiceRequestEditorKind>('create');
  /**
   * Property request
   * @readonly
   *
   * @description
   * Immutable request revision supplied by the owning page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ServiceRequestOutput | null>}
   */
  public readonly request = input<ServiceRequestOutput | null>(null);
  /**
   * Property initialEquipmentId
   * @readonly
   *
   * @description
   * Optional equipment prefill supplied by a dossier entry link.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly initialEquipmentId = input('');
  /**
   * Property initialSiteId
   * @readonly
   *
   * @description
   * Optional root-site prefill supplied by a dossier entry link.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly initialSiteId = input('');
  /**
   * Property originInspectionId
   * @readonly
   *
   * @description
   * Optional source inspection preserved in the creation input.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly originInspectionId = input('');
  /**
   * Property originNonConformityId
   * @readonly
   *
   * @description
   * Optional source anomaly preserved in the creation input.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly originNonConformityId = input('');
  /**
   * Property pending
   * @readonly
   *
   * @description
   * Disables editing while the owning mutation is accepted.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending = input(false);
  /**
   * Property uncertain
   * @readonly
   *
   * @description
   * An unconfirmed conversion retains its exact command before another choice.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly uncertain = input(false);
  /**
   * Property canRetryConversion
   * @readonly
   *
   * @description
   * Management and connectivity allow replay; the server confirms receipts before new-work
   * planning.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canRetryConversion = input(false);
  /**
   * Property conflict
   * @readonly
   *
   * @description
   * A stale revision requires an explicit user review.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly conflict = input(false);
  /**
   * Property latestRequest
   * @readonly
   *
   * @description
   * Reviewed server projection shown separately from the captured revision.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ServiceRequestOutput | null>}
   */
  public readonly latestRequest = input<ServiceRequestOutput | null>(null);
  /**
   * Property canAcceptRevision
   * @readonly
   *
   * @description
   * The current state must still allow adopting the reviewed revision.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canAcceptRevision = input(false);
  /**
   * Property error
   * @readonly
   *
   * @description
   * Normalized command error displayed without resetting the draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error = input<StoreError | null>(null);
  /**
   * Property openWork
   * @readonly
   *
   * @description
   * Authorized current repair tasks supplied by the owning page.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly EquipmentOpenWorkOutput[]>}
   */
  public readonly openWork = input<readonly EquipmentOpenWorkOutput[]>([]);
  /**
   * Property workPending
   * @readonly
   *
   * @description
   * A pending open-work read prevents uncertain conversion choices.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly workPending = input(false);
  /**
   * Property workError
   * @readonly
   *
   * @description
   * An unresolved open-work failure remains visible and blocks conversion.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly workError = input<StoreError | null>(null);
  /**
   * Property workReadable
   * @readonly
   *
   * @description
   * Actual permission to view existing work, distinct from an empty work list.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly workReadable = input(true);
  /**
   * Property descriptionSubmitted
   * @readonly
   *
   * @description
   * Validated description intent relayed to the owning page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<CreateServiceRequestInput>}
   */
  public readonly descriptionSubmitted = output<CreateServiceRequestInput>();
  /**
   * Property actionSubmitted
   * @readonly
   *
   * @description
   * Validated workflow intent relayed to the owning page.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<ServiceRequestActionIntent>}
   */
  public readonly actionSubmitted = output<ServiceRequestActionIntent>();
  /**
   * Property dismissed
   * @readonly
   *
   * @description
   * Confirmed overlay dismissal without an accepted mutation in flight.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly dismissed = output<void>();
  /**
   * Property refreshRequested
   * @readonly
   *
   * @description
   * Explicit request to read the current server revision.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly refreshRequested = output<void>();
  /**
   * Property revisionAccepted
   * @readonly
   *
   * @description
   * Explicit acceptance of the reviewed revision while retaining the entered draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly revisionAccepted = output<void>();
  /**
   * Property retryConversionRequested
   * @readonly
   *
   * @description
   * Replays the retained conversion instead of creating another command.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryConversionRequested = output<void>();
  /**
   * Property retryWorkRequested
   * @readonly
   *
   * @description
   * Retries an unresolved authorized open-work read.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryWorkRequested = output<void>();
  /**
   * Property sheetRef
   * @readonly
   *
   * @description
   * Native sheet reference used to preserve a dirty draft after native dismissal.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<HlmSheet | undefined>}
   */
  protected readonly sheetRef = viewChild(HlmSheet);
  /**
   * Property dirty
   * @readonly
   *
   * @description
   * Signal Forms dirtiness reported by the active form.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty = signal(false);
  /**
   * Property confirmation
   * @readonly
   *
   * @description
   * Native unsaved-change decision state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly confirmation = signal<BrnDialogState>('closed');
  /**
   * Property state
   * @readonly
   *
   * @description
   * Native overlay state derived from its controlled visibility.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly state = computed<BrnDialogState>(() => (this.visible() ? 'open' : 'closed'));
  /**
   * Property side
   * @readonly
   *
   * @description
   * Project sheet placement follows the central interaction mode.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side = sheetSide();
  /**
   * Property actionKind
   * @readonly
   *
   * @description
   * Workflow-only action selected separately from creation and description editing.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ServiceRequestActionKind | null>}
   */
  protected readonly actionKind = computed(() => {
    const kind = this.kind();
    return kind === 'create' || kind === 'update' ? null : kind;
  });
  /**
   * Property statusLabel
   * @readonly
   *
   * @description
   * Localized workflow label from the owning request vocabulary.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(status: ServiceRequestStatus) => string}
   */
  protected readonly statusLabel = serviceRequestStatusLabel;
  /**
   * Property title
   * @readonly
   *
   * @description
   * Declared request title or localized overlay title.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly title = computed(() => {
    switch (this.kind()) {
      case 'create':
        return $localize`:@@serviceRequest.editor.create:New maintenance request`;
      case 'update':
        return $localize`:@@serviceRequest.editor.edit:Edit maintenance request`;
      case 'qualify':
        return $localize`:@@serviceRequest.editor.qualify:Qualify maintenance request`;
      case 'reject':
        return $localize`:@@serviceRequest.action.reject:Reject request`;
      case 'cancel':
        return $localize`:@@serviceRequest.action.cancel:Cancel request`;
      case 'convert':
        return $localize`:@@serviceRequest.editor.convert:Organize corrective work`;
    }
  });
  //#endregion

  //#region Methods
  /**
   * Method requestClose
   *
   * @description
   * Retains pending and uncertain commands and asks before discarding a dirty draft.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected requestClose(): void {
    if (this.pending() || this.uncertain()) return;
    if (this.dirty()) this.confirmation.set('open');
    else this.dismissed.emit();
  }
  /**
   * Method stateChanged
   *
   * @description
   * Routes native dismissal through the same pending, uncertainty and dirtiness policy.
   *
   * @access protected
   * @since unreleased
   *
   * @param {BrnDialogState} state - Native overlay visibility.
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected stateChanged(state: BrnDialogState): void {
    if (state !== 'closed' || !this.visible()) return;
    if (this.dirty() || this.pending() || this.uncertain()) this.sheetRef()?.open();
    this.requestClose();
  }
  /**
   * Method discard
   *
   * @description
   * Discards the draft only after the explicit unsaved-change confirmation.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result owned by the request workflow.
   */
  protected discard(): void {
    this.confirmation.set('closed');
    this.dirty.set(false);
    this.dismissed.emit();
  }
  //#endregion
}
