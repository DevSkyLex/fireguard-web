import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type Signal,
  type Type,
} from '@angular/core';
import { SHOWCASE_SLOT, type ShowcaseContribution } from '@layouts/split-layout/slots/showcase';

/**
 * Component SplitLayoutShowcaseOutlet
 * @class SplitLayoutShowcaseOutlet
 *
 * @description
 * Generic slot host for the split layout left panel. Resolves the
 * highest-priority active showcase contribution and renders its component
 * class dynamically via `NgComponentOutlet`.
 *
 * The component is intentionally thin: it owns the slot structure (full-height
 * stretch box) but has no knowledge of what content it renders. Content
 * ownership stays with the contributing factory registered through:
 * ```typescript
 * provideSplitLayoutSlots({ showcase: [withAuthShowcase()] })
 * ```
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-split-layout-showcase-outlet />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-split-layout-showcase-outlet',
  imports: [NgComponentOutlet],
  templateUrl: './split-layout-showcase-outlet.component.html',
  host: { class: 'grid h-full w-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitLayoutShowcaseOutlet {
  //#region Properties
  /**
   * Property contributions
   * @readonly
   *
   * @description
   * All registered showcase contributions, injected as a multi-provider array.
   * Optional: defaults to an empty array when no feature has registered a
   * contribution.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ShowcaseContribution[]}
   */
  private readonly contributions: ShowcaseContribution[] =
    inject<ShowcaseContribution[]>(SHOWCASE_SLOT, { optional: true }) ?? [];

  /**
   * Property activeComponent
   * @readonly
   *
   * @description
   * The component class of the highest-priority active contribution, or `null`
   * when no contribution is currently active.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<Type<unknown> | null>}
   */
  protected readonly activeComponent: Signal<Type<unknown> | null> = computed(
    (): Type<unknown> | null => {
      const active: ShowcaseContribution | undefined = this.contributions
        .toSorted(
          (a: ShowcaseContribution, b: ShowcaseContribution): number => b.priority - a.priority,
        )
        .find((c: ShowcaseContribution) => c.active());

      return active?.component ?? null;
    },
  );
  //#endregion
}
