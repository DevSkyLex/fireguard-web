import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCircleAlert, lucidePackage } from '@ng-icons/lucide';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EmptyState } from '@shared/empty-state';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { HlmTableImports } from '@shared/ui/table';
import { InterventionTag } from '../../components/intervention-tag';

/**
 * Component InterventionEquipmentTable
 * @class InterventionEquipmentTable
 *
 * @description
 * The Equipment tab of the intervention detail page's "Linked" surface: a
 * read-only `hlmTable` of the equipment scoped to this intervention through
 * the backend's canonical `intervention` search filter. No pagination, no
 * search, no row actions.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-equipment-table',
  imports: [EmptyState, InterventionTag, ...HlmSpinnerImports, ...HlmTableImports],
  providers: [provideIcons({ lucideCircleAlert, lucidePackage })],
  templateUrl: './intervention-equipment-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionEquipmentTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The equipment linked to this intervention.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly EquipmentOutput[]>}
   */
  public readonly items: InputSignal<readonly EquipmentOutput[]> =
    input.required<readonly EquipmentOutput[]>();

  /**
   * Property loading
   * @readonly
   * @description Whether the tab's own fetch is in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   * @description The tab's own fetch error, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Methods
  /**
   * Method typeLabelOf
   *
   * @description
   * The equipment's type, humanized. The backend field is a free-form string
   * (organization-configurable equipment types), not a closed enum, so this
   * only normalizes punctuation rather than resolving a registry entry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentOutput} item - The equipment being rendered.
   *
   * @returns {string} The humanized type.
   */
  protected typeLabelOf(item: EquipmentOutput): string {
    return item.type.replace(/_/g, ' ');
  }

  /**
   * Method brandModelOf
   * @description The brand and model, joined for one cell, or `null` when neither is set.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentOutput} item - The equipment being rendered.
   * @returns {string | null} The joined label, or `null`.
   */
  protected brandModelOf(item: EquipmentOutput): string | null {
    const parts: readonly string[] = [item.brand, item.model].filter(
      (part): part is string => !!part,
    );

    return parts.length > 0 ? parts.join(' ') : null;
  }
  //#endregion
}
