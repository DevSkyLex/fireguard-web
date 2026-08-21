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
import { HlmItemImports } from '@shared/ui/item';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { InterventionTag } from '../intervention-tag';
import type { InterventionChangeRowViewModel } from './models';
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
  imports: [InterventionTag, HlmButton, ...HlmCardImports, ...HlmItemImports, ...HlmSpinnerImports],
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
   * Property proposedRows
   * @readonly
   *
   * @description
   * The still-proposed changes as fully derived row view models — rejected and
   * applied ones are history. Resource kind and patch lines are resolved once
   * per change instead of once per binding per change-detection pass.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {Signal<readonly InterventionChangeRowViewModel[]>}
   */
  protected readonly proposedRows: Signal<readonly InterventionChangeRowViewModel[]> = computed<
    readonly InterventionChangeRowViewModel[]
  >(() => {
    const pending: ReadonlySet<string> = this.pendingChangeIds();

    return this.changes()
      .filter((change) => change.status === 'proposed')
      .map((change: InterventionChangeOutput) => ({
        change,
        resourceKind: this.resourceKindOf(change),
        patchLines: formatInterventionChangePatch(change.patch),
        pending: pending.has(change.id),
      }));
  });
  //#endregion

  //#region Methods
  /**
   * Method resourceKindOf
   * @description Names the kind of resource a change's IRI points at, for the row's caption.
   * @access private
   * @since 1.0.0
   * @param {InterventionChangeOutput} change - The proposed change.
   * @returns {string} A short, localized resource kind.
   */
  private resourceKindOf(change: InterventionChangeOutput): string {
    if (change.resource.includes('/equipment/'))
      return $localize`:@@intervention.changes.resourceEquipment:Equipment`;
    if (change.resource.includes('/facilities/'))
      return $localize`:@@intervention.changes.resourceFacility:Facility`;
    if (change.resource.includes('/inspections/'))
      return $localize`:@@intervention.changes.resourceInspection:Inspection`;

    return $localize`:@@intervention.changes.resourceOther:Linked resource`;
  }
  //#endregion
}
