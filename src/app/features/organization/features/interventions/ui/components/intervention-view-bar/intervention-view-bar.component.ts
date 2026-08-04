import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import type { InterventionView } from '@features/organization/features/interventions/models';

/**
 * Component InterventionViewBar
 * @class InterventionViewBar
 *
 * @description
 * The row of named work views: the ones the product ships, then the ones the
 * operator saved, then the affordance to save the current narrowing as another.
 *
 * A view whose narrowing has since been edited is marked, so "All" never
 * silently means something other than all.
 *
 * Presentational (ARCHITECTURE.md §10.3): it renders what it is given and emits
 * what was pressed. The page owns which views exist, which is active, and what
 * saving one means.
 *
 * @example
 * ```html
 * <app-intervention-view-bar
 *   [views]="views()"
 *   [activeViewId]="activeViewId()"
 *   [modified]="isViewModified()"
 *   [canSave]="canSaveView()"
 *   (selected)="selectView($event)"
 *   (saved)="saveCurrentView()"
 *   (deleted)="deleteView($event)"
 * />
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-view-bar',
  imports: [ButtonModule, TooltipModule],
  templateUrl: './intervention-view-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionViewBar {
  //#region Inputs
  /**
   * Property views
   * @readonly
   *
   * @description
   * Views to offer, built-ins first.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionView[]>}
   */
  public readonly views: InputSignal<readonly InterventionView[]> =
    input.required<readonly InterventionView[]>();

  /**
   * Property activeViewId
   * @readonly
   *
   * @description
   * Identifier of the view currently open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly activeViewId: InputSignal<string> = input.required<string>();

  /**
   * Property modified
   * @readonly
   *
   * @description
   * Whether the active view's narrowing has been edited since it was opened.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly modified: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canSave
   * @readonly
   *
   * @description
   * Whether another view may be saved — false once the cap is reached.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canSave: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property saveHint
   * @readonly
   *
   * @description
   * Tooltip on the save affordance, naming why it is unavailable when it is.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly saveHint: InputSignal<string> = input<string>('');
  //#endregion

  //#region Outputs
  /**
   * Property selected
   * @readonly
   *
   * @description
   * A view was chosen; carries its identifier.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly selected: OutputEmitterRef<string> = output<string>();

  /**
   * Property saved
   * @readonly
   *
   * @description
   * The operator asked to save the current narrowing as a new view.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly saved: OutputEmitterRef<void> = output<void>();

  /**
   * Property deleted
   * @readonly
   *
   * @description
   * A saved view was dismissed; carries its identifier.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly deleted: OutputEmitterRef<string> = output<string>();
  //#endregion

  //#region Properties
  /**
   * Property modifiedLabel
   * @readonly
   *
   * @description
   * Accessible name of the edited-view marker, so the state is not carried by
   * a dot alone.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly modifiedLabel: string = $localize`:@@intervention.view.modified:edited`;

  /**
   * Property saveLabel
   * @readonly
   *
   * @description
   * Accessible name of the save affordance.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly saveLabel: string = $localize`:@@intervention.view.save:Save this view`;

  /**
   * Property deleteLabel
   * @readonly
   *
   * @description
   * Accessible name of a saved view's dismiss affordance.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly deleteLabel: string = $localize`:@@intervention.view.delete:Delete this view`;
  //#endregion
}
