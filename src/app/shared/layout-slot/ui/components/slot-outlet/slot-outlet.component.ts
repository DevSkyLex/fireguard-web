import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { SlotContribution, SlotPresentation } from '../../../models';
import { SLOT_PRESENTATION } from '../../../slot-presentation.token';
import { sortSlotContributions } from '../../../utils';

/**
 * Component SlotOutlet
 * @class SlotOutlet
 *
 * @description
 * Renders every contribution of an additive layout slot, ordered by `order`.
 * It knows nothing about what it renders: the host layout injects the slot
 * token and hands the array over, so the same outlet serves a sidebar section
 * list, a header tool cluster and a footer alike.
 * Presentation is provided locally to its view, leaving Angular's native
 * parent injector intact for contributions rendered inside a portal.
 *
 * The host is `display: contents`, so the outlet never becomes a flex or grid
 * item of its own — the contributions sit directly in the layout's own box.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-slot-outlet [contributions]="headerContributions" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-slot-outlet',
  imports: [NgComponentOutlet],
  viewProviders: [
    {
      provide: SLOT_PRESENTATION,
      useFactory: (): SlotPresentation => inject(SlotOutlet).presentation(),
    },
  ],
  templateUrl: './slot-outlet.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlotOutlet {
  //#region Inputs
  /**
   * Property contributions
   * @readonly
   *
   * @description
   * The contributions registered for the slot, as injected by the host layout.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly SlotContribution[]>}
   */
  public readonly contributions: InputSignal<readonly SlotContribution[]> =
    input.required<readonly SlotContribution[]>();

  /**
   * Property presentation
   * @readonly
   *
   * @description
   * Presentation resolved when contributions are instantiated. Hosts set this
   * before rendering; the provider changes only this token, not the inherited
   * injector or native overlay context.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<SlotPresentation>}
   */
  public readonly presentation: InputSignal<SlotPresentation> = input<SlotPresentation>('default');
  //#endregion

  //#region Properties
  /**
   * Property ordered
   * @readonly
   *
   * @description
   * The contributions in render order.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly SlotContribution[]>}
   */
  protected readonly ordered: Signal<readonly SlotContribution[]> = computed(
    (): readonly SlotContribution[] => sortSlotContributions(this.contributions()),
  );
  //#endregion
}
