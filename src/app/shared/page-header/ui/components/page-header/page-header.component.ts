import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';

/**
 * Component PageHeader
 * @class PageHeader
 *
 * @description
 * Shared header for a routed page: renders the page's `h1`, an optional
 * subtitle, and four content slots — a leading `avatar`, an inline
 * `titleAccessory` beside the `h1`, a `meta` line under the subtitle, and a
 * trailing `actions` row — so every routed page composes the same heading
 * structure instead of hand-rolling it. It is the accessibility owner of the
 * routed page's `h1`: the workspace shell's own `sr-only` fallback heading
 * stands down once a page renders one here (`main:has(div h1)` in
 * `WorkspaceLayoutHeader`).
 *
 * @example ```html
 * <app-page-header title="Settings" i18n-title="@@org.settings.pageTitle">
 *   <p-tag titleAccessory value="Pro" severity="info" />
 *   <p-button actions label="Save" icon="pi pi-check" (onClick)="save()" />
 * </app-page-header>
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  //#region Properties
  /**
   * Property title
   * @readonly
   *
   * @description
   * Page headline rendered in the `h1`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> = input.required<string>();

  /**
   * Property subtitle
   * @readonly
   *
   * @description
   * Optional supporting copy rendered under the title.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly subtitle: InputSignal<string | undefined> = input<string>();
  //#endregion
}
