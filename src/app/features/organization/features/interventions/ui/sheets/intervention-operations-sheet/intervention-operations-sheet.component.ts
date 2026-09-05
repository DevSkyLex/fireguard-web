import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { CallState } from '@core/request-state';
import { INTERVENTION_OUTBOX_LABEL } from '@features/organization/features/interventions/constants';
import {
  resolveInterventionTag,
  type InterventionOutboxOperation,
  type InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { sheetSide } from '@shared/sheet-side';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmButton } from '@shared/ui/button';
import { HlmSheetImports } from '@shared/ui/sheet';

/** Component InterventionOperationsSheet
 * @class InterventionOperationsSheet
 * @description Contextual local queue with explicit conflict retry and discard confirmations. Receives data and emits intentions only.
 * @since 1.0.0
 */
@Component({
  selector: 'app-intervention-operations-sheet',
  imports: [DatePipe, HlmButton, ...HlmSheetImports, ...HlmAlertDialogImports],
  templateUrl: './intervention-operations-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionOperationsSheet {
  /**
   * Property visible
   * @readonly
   * @description Whether the contextual operations sheet is open.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible = input(false);
  /**
   * Property interventionName
   * @readonly
   * @description Readable intervention context shown in the sheet and confirmations.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly interventionName = input('');
  /**
   * Property operations
   * @readonly
   * @description Local queued operations belonging to the active intervention.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionOutboxOperation[]>}
   */
  public readonly operations = input<readonly InterventionOutboxOperation[]>([]);
  /**
   * Property workItems
   * @readonly
   * @description Workspace resource summaries used to identify queued work.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly workItems = input<readonly InterventionWorkItemOutput[]>([]);
  /**
   * Property callState
   * @readonly
   * @description Explicit lifecycle of the local queue read.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<CallState>}
   */
  public readonly callState = input.required<CallState>();
  /**
   * Property mutations
   * @readonly
   * @description Per-operation retry or discard request states.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<Record<string, CallState>>}
   */
  public readonly mutations = input<Record<string, CallState>>({});
  /**
   * Property online
   * @readonly
   * @description Whether a retry can reach the server.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly online = input(true);
  /**
   * Property syncing
   * @readonly
   * @description Whether a synchronization cycle is already running.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly syncing = input(false);
  /**
   * Property visibleChange
   * @readonly
   * @description Reports passive or explicit sheet closure without mutating local operations.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange = output<boolean>();
  /**
   * Property reloadRequested
   * @readonly
   * @description Requests another read of the current section.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly reloadRequested = output<void>();
  /**
   * Property resolved
   * @readonly
   * @description Explicitly confirmed retry or discard intention.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<{ id: string; action: 'retry' | 'discard' }>}
   */
  public readonly resolved = output<{ id: string; action: 'retry' | 'discard' }>();
  /**
   * Property side
   * @readonly
   * @description Responsive sheet placement selected from the viewport.
   * @access protected
   * @since 1.0.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side = sheetSide();
  /**
   * Property labels
   * @readonly
   * @description Localized names of the supported outbox operation types.
   * @access protected
   * @since 1.0.0
   * @type {Readonly<Record<InterventionOutboxType, string>>}
   */
  protected readonly labels = INTERVENTION_OUTBOX_LABEL;
  /**
   * Property confirmation
   * @readonly
   * @description Operation and consequence awaiting explicit confirmation.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<{ operation: InterventionOutboxOperation; action: 'retry' | 'discard' } | null>}
   */
  protected readonly confirmation = signal<{
    operation: InterventionOutboxOperation;
    action: 'retry' | 'discard';
  } | null>(null);
  /**
   * Property confirmedOperation
   * @readonly
   * @description Queued operation currently under confirmation.
   * @access protected
   * @since 1.0.0
   * @type {Signal<InterventionOutboxOperation | null>}
   */
  protected readonly confirmedOperation = computed(() => this.confirmation()?.operation ?? null);

  /** Method target
   * @description Gives a queued task or file a readable identity using the workspace data available.
   * @access protected
   * @since 1.0.0
   * @param {InterventionOutboxOperation} operation - Local entry.
   * @returns {string} Resource label.
   */
  protected target(operation: InterventionOutboxOperation): string {
    const payload = operation.payload;
    if ('fileName' in payload) return payload.fileName;
    if ('workItemId' in payload)
      return (
        this.workItems().find((item) => item.id === payload.workItemId)?.targetSummary?.label ??
        this.interventionName()
      );
    if ('name' in payload && payload.name) return payload.name;
    return this.interventionName();
  }

  /** Method preview
   * @description Exposes stored local content without inventing a server comparison or displaying binary data.
   * @access protected
   * @since 1.0.0
   * @param {InterventionOutboxOperation} operation - Local entry.
   * @returns {string} Stored text or state.
   */
  protected preview(operation: InterventionOutboxOperation): string {
    const payload = operation.payload;
    if ('body' in payload) return payload.body;
    if ('reviewNote' in payload && payload.reviewNote) return payload.reviewNote;
    if ('skipReason' in payload && payload.skipReason) return payload.skipReason;
    if ('status' in payload && payload.status)
      return resolveInterventionTag(
        operation.type === 'work-item.update'
          ? 'workItemStatus'
          : operation.type === 'change.update'
            ? 'changeStatus'
            : 'status',
        payload.status,
      ).label;
    if ('description' in payload && payload.description) return payload.description;
    return this.labels[operation.type];
  }

  /** Method revision
   * @description Returns only the revision provided by the existing conflict recovery contract.
   * @access protected
   * @since 1.0.0
   * @param {InterventionOutboxOperation} operation - Queued entry.
   * @returns {number | null} Last available server revision.
   */
  protected revision(operation: InterventionOutboxOperation): number | null {
    return operation.serverRevision ?? null;
  }

  /** Method retry
   * @description Requires reviewing a conflicting local value before explicitly reapplying it.
   * @access protected
   * @since 1.0.0
   * @param {InterventionOutboxOperation} operation - Retry target.
   * @returns {void}
   */
  protected retry(operation: InterventionOutboxOperation): void {
    if (operation.status === 'conflict') this.confirmation.set({ operation, action: 'retry' });
    else this.resolved.emit({ id: operation.id, action: 'retry' });
  }

  /** Method confirm
   * @description Emits the reviewed decision; dismissal never mutates the queue.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirm(): void {
    const request = this.confirmation();
    if (request) this.resolved.emit({ id: request.operation.id, action: request.action });
    this.confirmation.set(null);
  }
}
