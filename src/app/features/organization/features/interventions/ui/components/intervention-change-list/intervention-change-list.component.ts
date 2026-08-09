import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type { InterventionChangeOutput } from '@features/organization/features/interventions/models';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { InterventionTag } from '../intervention-tag';
import type { InterventionChangePatchLine } from './models';
import { formatInterventionChangePatch } from './utils';

/**
 * Component InterventionChangeList
 * @class InterventionChangeList
 *
 * @description
 * The changes a sub-resource applier proposed on this intervention's linked
 * facilities, equipment, or inspections, and that are still waiting on
 * publication.
 *
 * Rejection is the one control this surface offers, and only when the host
 * grants it (`canReject`): `UpdateInterventionChangeInput.status` only ever
 * accepts `'proposed' | 'rejected'` — acceptance is not a client action, a
 * pending change is applied automatically at publication, and the caption
 * says so. A row locks and spins on **its own** write through
 * `pendingChangeIds`, mirroring the work-item table's per-row rule.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-intervention-change-list
 *   [changes]="store.changes()"
 *   [canReject]="canRejectChange()"
 *   [pendingChangeIds]="store.pendingChangeIds()"
 *   (rejected)="rejectChange($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-change-list',
  imports: [InterventionTag, HlmButton, ...HlmCardImports, ...HlmSpinnerImports],
  templateUrl: './intervention-change-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionChangeList {
  //#region Inputs
  /**
   * Property changes
   * @readonly
   * @description Every change the workspace loaded, filtered here to the still-proposed ones.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionChangeOutput[]>}
   */
  public readonly changes: InputSignal<readonly InterventionChangeOutput[]> = input<
    readonly InterventionChangeOutput[]
  >([]);

  /**
   * Property canReject
   * @readonly
   * @description Whether the host grants rejecting a proposed change; the backend rules stay with the page.
   * @access public
   * @since 2.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canReject: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pendingChangeIds
   * @readonly
   * @description Ids of the changes whose rejection is in flight, so each row locks on its own write.
   * @access public
   * @since 2.0.0
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly pendingChangeIds: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set<string>(),
  );
  //#endregion

  //#region Outputs
  /**
   * Property rejected
   * @readonly
   * @description Emits the id of the change the operator rejected; the page owns the store call.
   * @access public
   * @since 2.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly rejected: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property proposedChanges
   * @readonly
   * @description The changes still awaiting publication — rejected and applied ones are history.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly InterventionChangeOutput[]>}
   */
  protected readonly proposedChanges: Signal<readonly InterventionChangeOutput[]> = computed<
    readonly InterventionChangeOutput[]
  >(() => this.changes().filter((change) => change.status === 'proposed'));
  //#endregion

  //#region Methods
  /**
   * Method isRowPending
   * @description Whether this row's own rejection is in flight.
   * @access protected
   * @since 2.0.0
   * @param {InterventionChangeOutput} change - The proposed change.
   * @returns {boolean} True while the change's write is pending.
   */
  protected isRowPending(change: InterventionChangeOutput): boolean {
    return this.pendingChangeIds().has(change.id);
  }

  /**
   * Method resourceKindOf
   * @description Names the kind of resource a change's IRI points at, for the row's caption.
   * @access protected
   * @since 1.0.0
   * @param {InterventionChangeOutput} change - The proposed change.
   * @returns {string} A short, localized resource kind.
   */
  protected resourceKindOf(change: InterventionChangeOutput): string {
    if (change.resource.includes('/equipment/'))
      return $localize`:@@intervention.changes.resourceEquipment:Equipment`;
    if (change.resource.includes('/facilities/'))
      return $localize`:@@intervention.changes.resourceFacility:Facility`;
    if (change.resource.includes('/inspections/'))
      return $localize`:@@intervention.changes.resourceInspection:Inspection`;

    return $localize`:@@intervention.changes.resourceOther:Linked resource`;
  }

  /**
   * Method patchLinesOf
   * @description The change's patch, as readable field/value lines.
   * @access protected
   * @since 1.0.0
   * @param {InterventionChangeOutput} change - The proposed change.
   * @returns {readonly InterventionChangePatchLine[]} One line per patched field.
   */
  protected patchLinesOf(change: InterventionChangeOutput): readonly InterventionChangePatchLine[] {
    return formatInterventionChangePatch(change.patch);
  }
  //#endregion
}
