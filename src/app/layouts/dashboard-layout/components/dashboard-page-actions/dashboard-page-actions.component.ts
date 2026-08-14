import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { PageActionsService } from '@core/page-actions';

/**
 * Component DashboardPageActions
 * @class DashboardPageActions
 *
 * @description
 * Renders the activated page's own header action buttons, registered through
 * `PageActionsService`. It projects the page's `TemplateRef` verbatim, so the
 * buttons render with the declaring page's injector and change-detection
 * context rather than this component's — the shell stays ignorant of what a
 * page put there.
 *
 * Renders nothing when no page has registered a template, which is the
 * common case: most pages have no header actions of their own.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-page-actions />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-page-actions',
  imports: [NgTemplateOutlet],
  templateUrl: './dashboard-page-actions.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageActions {
  //#region Properties
  /**
   * Property pageActions
   * @readonly
   *
   * @description
   * Source of the currently activated page's registered header actions.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {PageActionsService}
   */
  private readonly pageActions: PageActionsService = inject<PageActionsService>(PageActionsService);

  /**
   * Property actions
   * @readonly
   *
   * @description
   * The registered template, or `null` when the activated page contributes
   * none.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | null>}
   */
  protected readonly actions: Signal<TemplateRef<unknown> | null> = this.pageActions.actions;
  //#endregion
}
