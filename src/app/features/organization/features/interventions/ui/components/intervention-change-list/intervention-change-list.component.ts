import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { InterventionChangeOutput } from '@features/organization/features/interventions/models';
import { HlmCardImports } from '@shared/ui/card';
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
 * Read-only in this pass: `UpdateInterventionChangeInput.status` only ever
 * accepts `'proposed' | 'rejected'` — the client can reject a change, never
 * accept one, and `InterventionWorkspaceStore` exposes no method to do
 * either yet. Offering a control this surface cannot back would be worse
 * than offering none, so the list only reads and a caption explains what
 * happens next: a pending change is applied automatically at publication.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-change-list [changes]="store.changes()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-change-list',
  imports: [InterventionTag, ...HlmCardImports],
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
