import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { type IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';
import type { MotionOptions } from '@primeuix/motion';
import type { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { DividerModule } from 'primeng/divider';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PanelMenuModule, type PanelMenuPassThroughOptions } from 'primeng/panelmenu';
import { RippleModule } from 'primeng/ripple';

/**
 * Component SidebarNavigation
 * @class SidebarNavigation
 *
 * @description
 * Generic, domain-agnostic sidebar navigation panel with an optional
 * search field and a PrimeNG PanelMenu. Accepts plain data inputs and
 * emits outputs; it has no dependency on layout services or feature
 * state.
 *
 * Consumers are responsible for maintaining search query state and
 * filtering items before passing them in. The component only renders
 * what it receives.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-sidebar-navigation
 *   [items]="navigationItems()"
 *   [searchQuery]="searchQuery()"
 *   (searchQueryChange)="onSearchQueryChange($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-sidebar-navigation',
  imports: [
    BadgeModule,
    DividerModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    PanelMenuModule,
    RippleModule,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './sidebar-navigation.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarNavigation {
  //#region Inputs
  /**
   * Property items
   * @readonly
   *
   * @description
   * Navigation sections to render. Each top-level item is treated as a
   * collapsible section header; its `items` array contains leaf entries.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MenuItem[]>}
   */
  readonly items = input.required<MenuItem[]>();

  /**
   * Property searchQuery
   * @readonly
   *
   * @description
   * Current search query displayed in the search field.
   * The consumer is responsible for maintaining this state and filtering
   * items before passing them in.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  readonly searchQuery = input<string>('');

  /**
   * Property showSearch
   * @readonly
   *
   * @description
   * Whether to render the search input above the navigation menu.
   * Set to `false` when the item count is small and a search field
   * is not useful.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  readonly showSearch = input<boolean>(true);
  //#endregion

  //#region Outputs
  /**
   * Property searchQueryChange
   * @readonly
   *
   * @description
   * Emits the new search query string whenever the user types in the search
   * field or clears it. The consumer updates its own state and passes the
   * filtered items back through the `items` input.
   *
   * @access public
   * @since 1.0.0
   */
  readonly searchQueryChange = output<string>();

  /**
   * Property itemClick
   * @readonly
   *
   * @description
   * Emits the clicked leaf navigation item. Consumers may use this to
   * close a mobile drawer or perform any other side effect on navigation.
   *
   * @access public
   * @since 1.0.0
   */
  readonly itemClick = output<MenuItem>();
  //#endregion

  //#region Properties
  /**
   * Property panelMenuPt
   * @readonly
   *
   * @description
   * Pass-through options for PrimeNG PanelMenu.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {PanelMenuPassThroughOptions}
   */
  protected readonly panelMenuPt: PanelMenuPassThroughOptions = {
    submenuIcon: { class: 'hidden' },
    submenu: { class: 'ml-6 border-l border-surface-200 pl-3' },
  };

  /**
   * Property panelMenuMotionOptions
   * @readonly
   *
   * @description
   * Animation options for submenu enter/leave transitions.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MotionOptions}
   */
  protected readonly panelMenuMotionOptions: MotionOptions = {
    type: 'transition',
    autoHeight: true,
    duration: { enter: 250, leave: 200 },
    enterClass: {
      from: 'h-0 opacity-0',
      active: 'overflow-hidden transition-[height,opacity] duration-250 ease-in-out',
      to: 'h-[var(--pui-motion-height)] opacity-100',
    },
    leaveClass: {
      from: 'h-[var(--pui-motion-height)] opacity-100',
      active: 'overflow-hidden transition-[height,opacity] duration-200 ease-in-out',
      to: 'h-0 opacity-0',
    },
  };

  /**
   * Property exactMatchOptions
   * @readonly
   *
   * @description
   * Router active options for exact route matching (used for root `/`).
   *
   * @access private
   * @since 1.0.0
   *
   * @type {IsActiveMatchOptions}
   */
  private readonly exactMatchOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  /**
   * Property subsetMatchOptions
   * @readonly
   *
   * @description
   * Router active options for non-root route matching.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {IsActiveMatchOptions}
   */
  private readonly subsetMatchOptions: IsActiveMatchOptions = {
    paths: 'subset',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };
  //#endregion

  //#region Methods
  /**
   * Method onSearchInput
   * @method onSearchInput
   *
   * @description
   * Emits the new search query to the consumer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} value - Current input value.
   *
   * @returns {void}
   */
  protected onSearchInput(value: string): void {
    this.searchQueryChange.emit(value);
  }

  /**
   * Method onClearSearch
   * @method onClearSearch
   *
   * @description
   * Emits an empty string to signal that the search should be cleared.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onClearSearch(): void {
    this.searchQueryChange.emit('');
  }

  /**
   * Method onItemClick
   * @method onItemClick
   *
   * @description
   * Emits the clicked navigation item to the consumer.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MenuItem} item - Clicked navigation item.
   *
   * @returns {void}
   */
  protected onItemClick(item: MenuItem): void {
    this.itemClick.emit(item);
  }

  /**
   * Method getRouterLinkActiveOptions
   * @method getRouterLinkActiveOptions
   *
   * @description
   * Returns active route matching options based on the item's route.
   * Root route uses exact matching to avoid being active on all URLs.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MenuItem['routerLink']} routerLink - Navigation item route.
   *
   * @returns {IsActiveMatchOptions}
   */
  protected getRouterLinkActiveOptions(routerLink: MenuItem['routerLink']): IsActiveMatchOptions {
    if (typeof routerLink === 'string' && routerLink === '/') {
      return this.exactMatchOptions;
    }

    return this.subsetMatchOptions;
  }
  //#endregion
}
