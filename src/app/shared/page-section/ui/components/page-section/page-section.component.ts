import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';

/**
 * Component PageSection
 * @class PageSection
 *
 * @description
 * The single carrier of the canonical section heading (`DESIGN.md` § Page
 * Grammar → "Headings and lead"): a `<section aria-labelledby>` wrapping an
 * `<h2 class="text-base font-semibold">`, an optional description, an
 * optional right-aligned action slot, and projected body content. Replaces
 * six divergent hand-rolled `<h2>` styles across the app with one. Generic
 * by design — it names no domain and takes only scalars plus projected
 * markup (`ARCHITECTURE.md` §6.4).
 *
 * When the caller omits `headingId`, a stable id is generated from a
 * per-class counter (the same pattern as `HlmDatePickerTrigger.buttonId`) so
 * `aria-labelledby` always resolves without forcing every call site to name
 * its own id.
 *
 * @since 1.0.0
 *
 * @example
 * ```html
 * <app-page-section heading="Members" description="Who can access this organization.">
 *   <button hlmBtn pageSectionAction>Invite</button>
 *   <app-organization-member-table ... />
 * </app-page-section>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-page-section',
  imports: [],
  host: { class: 'block' },
  templateUrl: './page-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageSection {
  /**
   * Property nextId
   * @static
   *
   * @description
   * Per-class counter backing the generated fallback for `headingId`.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {number}
   */
  private static nextId: number = 0;

  //#region Inputs
  /**
   * Property heading
   * @readonly
   *
   * @description
   * The section's `<h2>` text.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly heading: InputSignal<string> = input.required<string>();

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional sentence rendered under the heading.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly description: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property headingId
   * @readonly
   *
   * @description
   * The `<h2>` element id that `aria-labelledby` points at. Defaults to a
   * generated, stable-per-instance id when the caller does not supply one.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly headingId: InputSignal<string> = input<string>(
    `page-section-${++PageSection.nextId}`,
  );
  //#endregion
}
