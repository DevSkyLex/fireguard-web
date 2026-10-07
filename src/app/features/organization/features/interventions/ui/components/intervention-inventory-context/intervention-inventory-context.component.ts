import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import type { InterventionWorkItemOutput } from '@features/organization/features/interventions/models';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmSelectImports } from '@shared/ui/select';
import { InterventionTag } from '../intervention-tag';

/**
 * Component InterventionInventoryContext
 * @class InterventionInventoryContext
 *
 * @description
 * Selects a task context from the caller's complete authorized workspace, including offline.
 */
@Component({
  selector: 'app-intervention-inventory-context',
  templateUrl: './intervention-inventory-context.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...HlmFieldImports, ...HlmSelectImports, InterventionTag],
})
export class InterventionInventoryContext {
  //#region Properties
  /**
   * Property items
   * @readonly
   *
   * @description
   * Tasks whose execution assignment permits a physical declaration.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly items: InputSignal<readonly InterventionWorkItemOutput[]> = input<
    readonly InterventionWorkItemOutput[]
  >([]);

  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Null means the intervention as a whole.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly workItemId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * The parent freezes context until a submitted declaration is durable.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly disabled: InputSignal<boolean> = input(false);

  /**
   * Property canSelectIntervention
   * @readonly
   *
   * @description
   * The intervention itself can be selected only by its responsible member or participants.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canSelectIntervention: InputSignal<boolean> = input(false);

  /**
   * Property contextChanged
   * @readonly
   *
   * @description
   * Emits only a context from the provided authorized options.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<string | null>}
   */
  public readonly contextChanged: OutputEmitterRef<string | null> = output<string | null>();

  /**
   * Property labelOf
   * @readonly
   *
   * @description
   * Provides the same accessible label to the select trigger and every option.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: unknown) => string}
   */
  protected readonly labelOf: (value: unknown) => string = (value) => {
    if (value === 'general')
      return $localize`:@@intervention.inventory.generalContext:Whole intervention`;
    const index = this.items().findIndex((item) => item.id === value);
    const item = this.items()[index];
    return (
      item?.targetSummary?.label ||
      (item ? $localize`:@@intervention.inventory.taskNumber:Work item ${index + 1}:number:` : '')
    );
  };
  //#endregion

  //#region Methods
  /**
   * Method select
   * @method select
   *
   * @description
   * A selection never changes an already submitted physical declaration.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Selected option identity; only authorized task or general contexts are
   *   emitted.
   *
   * @returns {void} Retains the frozen declaration context or emits an authorized selection.
   */
  protected select(value: unknown): void {
    if (this.disabled()) return;
    if (value === 'general' && this.canSelectIntervention()) this.contextChanged.emit(null);
    else if (typeof value === 'string' && this.items().some((item) => item.id === value))
      this.contextChanged.emit(value);
  }
  //#endregion
}
