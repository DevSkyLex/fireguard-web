import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { InputSignal, OutputEmitterRef, Signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRefreshCw, lucideTriangleAlert } from '@ng-icons/lucide';
import { INTERVENTION_OUTBOX_LABEL } from '@features/organization/features/interventions/constants';
import type {
  InterventionOutboxOperation,
  InterventionOutboxType,
} from '@features/organization/features/interventions/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';

/**
 * Component InterventionSyncBlockedAlert
 * @class InterventionSyncBlockedAlert
 *
 * @description
 * The on-page consequence of a failed outbox replay, for the one intervention
 * the operator is standing on: what could not be sent, why, and the retry.
 *
 * It exists because the shell's `app-intervention-sync-indicator` is the only
 * thing that reported this, as a glyph on a 32px header button behind a
 * popover — so an agent whose field work failed to replay learned nothing on
 * the workspace holding the data at risk, while the popover's `role="alert"`
 * live region told a screen-reader user. `PRODUCT.md` principle 3 makes
 * offline a first-class state that is surfaced plainly, never hidden; this is
 * that surface. The indicator stays as the device-global drill-in.
 *
 * Purely presentational: the page reads the outbox and owns the retry
 * (`ARCHITECTURE.md` §10.5). Discard is deliberately absent — it is data loss
 * and stays confirm-gated in the indicator's panel.
 *
 * @since 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-sync-blocked-alert
 *   [operations]="blockedOperations()"
 *   [reason]="syncProblem()"
 *   [retrying]="syncing()"
 *   (retryRequested)="retryBlockedSync()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-sync-blocked-alert',
  imports: [NgIcon, HlmButton, ...HlmAlertImports],
  providers: [provideIcons({ lucideRefreshCw, lucideTriangleAlert })],
  templateUrl: './intervention-sync-blocked-alert.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionSyncBlockedAlert {
  //#region Inputs
  /**
   * Property operations
   * @readonly
   *
   * @description
   * The queued operations for this intervention that failed to replay, oldest
   * first. Naming them is the point: "3 changes could not be sent" tells an
   * agent nothing about whether their inspection or their photos are at risk.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionOutboxOperation[]>}
   */
  public readonly operations: InputSignal<readonly InterventionOutboxOperation[]> = input<
    readonly InterventionOutboxOperation[]
  >([]);

  /**
   * Property reason
   * @readonly
   *
   * @description
   * Why the replay stopped, from the coordinator's own last failure. `null`
   * when it carried no message. Rendered through {@link unlistedReason}, not
   * directly — the coordinator derives it from the *first* blocked
   * operation's error, which this component already prints beside that
   * operation's name.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly reason: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property retrying
   * @readonly
   * @description Whether a replay is in flight, so the action reads as busy rather than unresponsive.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly retrying: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property retryRequested
   * @readonly
   * @description The operator asked to replay the blocked operations again.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property title
   * @readonly
   *
   * @description
   * Names the problem with its count, in the plural form the count actually
   * takes — the title carries the fact, so the list below is detail rather
   * than the only place the severity is stated.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly title: Signal<string> = computed<string>(() => {
    const count: number = this.operations().length;

    return count === 1
      ? $localize`:@@intervention.sync.blockedAlert.titleOne:1 change could not be sent`
      : $localize`:@@intervention.sync.blockedAlert.titleMany:${count}:count: changes could not be sent`;
  });

  /**
   * Property unlistedReason
   * @readonly
   *
   * @description
   * {@link reason}, unless one of the listed operations already carries that
   * exact message. `InterventionSyncCoordinatorService.refreshStatus` sets
   * the problem to `blocked[0]?.error`, so printing both verbatim repeats the
   * same sentence twice in one alert — which is what the first build did.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly unlistedReason: Signal<string | null> = computed<string | null>(() => {
    const reason: string | null = this.reason();
    if (reason === null) return null;

    return this.operations().some(
      (operation: InterventionOutboxOperation): boolean => operation.error === reason,
    )
      ? null
      : reason;
  });
  //#endregion

  //#region Methods
  /**
   * Method operationLabel
   * @method operationLabel
   * @description Names one blocked operation for the list.
   * @access protected
   * @since 1.0.0
   * @param {InterventionOutboxType} type - The queued operation's type.
   * @returns {string} The localized label.
   */
  protected operationLabel(type: InterventionOutboxType): string {
    return INTERVENTION_OUTBOX_LABEL[type];
  }
  //#endregion
}
