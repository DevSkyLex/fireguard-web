/**
 * Interface BreadcrumbItem
 * @interface BreadcrumbItem
 *
 * @description
 * One node of the breadcrumb trail. Carries data only: no icon class and no
 * styling hint, so the presentation layer stays free to render it however it
 * wants.
 *
 * @since 2.1.0
 */
export interface BreadcrumbItem {
  //#region Properties

  /**
   * Property label
   *
   * @description
   * Already-localized text of the node. Absent on the home node, which the
   * consumer labels or illustrates itself.
   *
   * @type {string | undefined}
   */
  readonly label?: string;

  /**
   * Property routerLink
   *
   * @description
   * Absolute path this node navigates to, or `undefined` when the node is the
   * current page and must not be clickable.
   *
   * @type {string | undefined}
   */
  readonly routerLink?: string;

  /**
   * Property current
   *
   * @description
   * Whether this node is the page currently displayed. Exactly one node of a
   * non-empty trail carries `true`.
   *
   * @type {boolean}
   */
  readonly current: boolean;

  //#endregion
}
