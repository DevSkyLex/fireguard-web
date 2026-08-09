import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import type { InterventionView } from '@features/organization/features/interventions/models';
import { HlmButton } from '@shared/ui/button';

/**
 * Component InterventionViewSwitcher
 * @class InterventionViewSwitcher
 *
 * @description
 * The view bar above the interventions list: one button per named view —
 * built-ins first, then the operator's saved views. Selecting a view emits its
 * id; the page owns applying the preset and remembering the choice. A custom
 * view carries a remove affordance (built-ins cannot be deleted). No view is
 * highlighted when the operator has detached from the preset by narrowing
 * manually.
 *
 * Presentational: no store, no service — the page decides what a view does.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-view-switcher
 *   [views]="views()"
 *   [activeViewId]="activeViewId()"
 *   (selected)="selectView($event)"
 *   (removed)="removeCustomView($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-view-switcher',
  imports: [NgIcon, HlmButton],
  providers: [provideIcons({ lucideX })],
  templateUrl: './intervention-view-switcher.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionViewSwitcher {
  //#region Inputs
  /**
   * Property views
   * @readonly
   * @description Every offered view, built-ins first.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionView[]>}
   */
  public readonly views: InputSignal<readonly InterventionView[]> = input<
    readonly InterventionView[]
  >([]);

  /**
   * Property activeViewId
   * @readonly
   * @description The applied view's id, or null when the operator detached from any preset.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly activeViewId: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property selected
   * @readonly
   * @description Emits the id of the view the operator picked.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly selected: OutputEmitterRef<string> = output<string>();

  /**
   * Property removed
   * @readonly
   * @description Emits the id of the custom view the operator deleted.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<string>}
   */
  public readonly removed: OutputEmitterRef<string> = output<string>();
  //#endregion
}
