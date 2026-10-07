import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  LOCALE_ID,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import type { MaintenanceCostItem } from '@features/organization/features/maintenance-costs/models';
import { formatMaintenanceAmount } from '@features/organization/features/maintenance-costs/utils';
import { OrgDatePipe } from '@shared/regional-format';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmTableImports } from '@shared/ui/table';

/**
 * Class MaintenanceCostFacts
 *
 * @description
 * Presents exact private contributions and their traceable adjustments without owning transport or
 * navigation.
 */
@Component({
  selector: 'app-maintenance-cost-facts',
  templateUrl: './maintenance-cost-facts.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    OrgDatePipe,
    HlmBadge,
    HlmButton,
    ...HlmCardImports,
    ...HlmTableImports,
    ...HlmEmptyImports,
  ],
})
export class MaintenanceCostFacts {
  /**
   * Property items
   * @readonly
   *
   * @description
   * Current contributions or an immutable frozen list of contributions.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly MaintenanceCostItem[]>}
   */
  public readonly items: InputSignal<readonly MaintenanceCostItem[]> = input<
    readonly MaintenanceCostItem[]
  >([]);
  /**
   * Property canAdjust
   * @readonly
   *
   * @description
   * Finance management permission permits motivated adjustments of original expenses.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canAdjust: InputSignal<boolean> = input(false);
  /**
   * Property pending
   * @readonly
   *
   * @description
   * An accepted write is awaiting acknowledgement.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);
  /**
   * Property adjusted
   * @readonly
   *
   * @description
   * Original expense selected for a traceable correcting declaration.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<MaintenanceCostItem>}
   */
  public readonly adjusted: OutputEmitterRef<MaintenanceCostItem> = output<MaintenanceCostItem>();
  /**
   * Property locale
   * @readonly
   *
   * @description
   * Interface locale for exact decimal grouping.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly locale: string = inject(LOCALE_ID);
  /**
   * Property money
   * @readonly
   *
   * @description
   * Exact string formatter keeping unknown values distinct from known zero.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof formatMaintenanceAmount}
   */
  protected readonly money: typeof formatMaintenanceAmount = formatMaintenanceAmount;
  /**
   * Method originalExpense
   *
   * @description
   * Identifies an original expense eligible for a linked correction rather than correcting a
   * correction.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceCostItem} item - Original operational contribution.
   *
   * @returns {boolean} Validated financial contract result.
   */
  protected originalExpense(item: MaintenanceCostItem): boolean {
    return item.kind === 'expense' && !item.correctionOf?.startsWith('expense:');
  }
  /**
   * Method kindLabel
   *
   * @description
   * Returns the localized operational contribution category.
   *
   * @access protected
   * @since unreleased
   *
   * @param {MaintenanceCostItem['kind']} kind - Operational contribution category.
   *
   * @returns {string} Validated financial contract result.
   */
  protected kindLabel(kind: MaintenanceCostItem['kind']): string {
    switch (kind) {
      case 'time':
        return $localize`:@@maintenanceCost.kind.time:Work time`;
      case 'material':
        return $localize`:@@maintenanceCost.kind.material:Materials`;
      case 'expense':
        return $localize`:@@maintenanceCost.kind.expense:External expense`;
    }
  }
}
