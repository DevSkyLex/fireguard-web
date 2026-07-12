import { ChangeDetectionStrategy, Component, inject, viewChild, type Signal } from '@angular/core';
import { Dispatcher } from '@ngrx/signals/events';
import type { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import {
  InterventionHeaderStore,
  interventionHeaderEvents,
  type InterventionHeaderStoreType,
} from '@features/organization/features/interventions/state';

/**
 * Component InterventionHeaderActions
 * @class InterventionHeaderActions
 *
 * @description
 * Feature-owned widget contributed to the dashboard layout's page-header
 * action slot. Renders the intervention detail page's main actions —
 * prev/next navigation with list position, the review "Request changes"
 * affordance, the canonical phase action and the overflow menu — from the
 * root {@link InterventionHeaderStore} the page publishes into, and
 * dispatches `interventionHeaderEvents` the page reacts to. Renders nothing
 * on routes that publish no header state.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-header-actions',
  imports: [ButtonModule, MenuModule],
  templateUrl: './intervention-header-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionHeaderActions {
  //#region Properties
  /**
   * Property header
   * @readonly
   *
   * @description
   * Root store carrying the header view state published by the detail page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InterventionHeaderStoreType}
   */
  protected readonly header: InterventionHeaderStoreType =
    inject<InterventionHeaderStoreType>(InterventionHeaderStore);

  /**
   * Property dispatcher
   * @readonly
   *
   * @description
   * NgRx events dispatcher used to forward header interactions to the page.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Dispatcher}
   */
  private readonly dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher);

  /**
   * Property overflowMenu
   * @readonly
   *
   * @description
   * Popup menu hosting the page-published overflow entries.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Menu>}
   */
  private readonly overflowMenu: Signal<Menu> = viewChild.required<Menu>('overflowMenu');
  //#endregion

  //#region Methods
  /**
   * Method invokeCommand
   * @method invokeCommand
   *
   * @description
   * Forwards the canonical phase action click to the detail page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected invokeCommand(): void {
    this.dispatcher.dispatch(interventionHeaderEvents.commandInvoked());
  }

  /**
   * Method requestChanges
   * @method requestChanges
   *
   * @description
   * Forwards the review "Request changes" click to the detail page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected requestChanges(): void {
    this.dispatcher.dispatch(interventionHeaderEvents.changesRequested());
  }

  /**
   * Method navigatePrev
   * @method navigatePrev
   *
   * @description
   * Forwards the previous-intervention click to the detail page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected navigatePrev(): void {
    this.dispatcher.dispatch(interventionHeaderEvents.prevRequested());
  }

  /**
   * Method navigateNext
   * @method navigateNext
   *
   * @description
   * Forwards the next-intervention click to the detail page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected navigateNext(): void {
    this.dispatcher.dispatch(interventionHeaderEvents.nextRequested());
  }

  /**
   * Method onOverflowMenuToggle
   * @method onOverflowMenuToggle
   *
   * @description
   * Toggles the overflow popup menu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MouseEvent} event - Click event from the overflow control.
   *
   * @return {void}
   */
  protected onOverflowMenuToggle(event: MouseEvent): void {
    this.overflowMenu().toggle(event);
  }

  /**
   * Method invokeSingleOverflowItem
   * @method invokeSingleOverflowItem
   *
   * @description
   * Runs the command of the lone overflow entry rendered as a direct button
   * (a one-entry menu is an unnecessary detour).
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {MenuItem} item - The single overflow menu item.
   *
   * @return {void}
   */
  protected invokeSingleOverflowItem(item: MenuItem): void {
    item.command?.({ item });
  }
  //#endregion
}
