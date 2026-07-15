import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import type { SkeletonPreset } from './models';

/**
 * Component Skeleton
 * @class Skeleton
 *
 * @description
 * Shared loading placeholder that renders one of a few standard shapes
 * ({@link SkeletonPreset}) while a region loads, so loading looks consistent
 * app-wide, reserves layout to avoid content shift, and is announced to assistive
 * tech through a `role="status"` wrapper with an `sr-only` label. Wraps PrimeNG
 * `p-skeleton`; the placeholder shapes themselves are decorative.
 *
 * @example ```html
 * <app-skeleton preset="list-row" [count]="5" label="Loading facilities" />
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-skeleton',
  imports: [SkeletonModule],
  templateUrl: './skeleton.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  //#region Properties
  /**
   * Property preset
   * @readonly
   *
   * @description
   * Which placeholder shape to render. Defaults to `list-row`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<SkeletonPreset>}
   */
  public readonly preset: InputSignal<SkeletonPreset> = input<SkeletonPreset>('list-row');

  /**
   * Property count
   * @readonly
   *
   * @description
   * How many repeated shapes to render for the repeating presets
   * (`list-row`, `card`, `text`). Ignored by `chart`. Defaults to 3.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly count: InputSignal<number> = input<number>(3);

  /**
   * Property label
   * @readonly
   *
   * @description
   * Screen-reader label announced while the placeholder is visible.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>('Loading…');

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Index array of length {@link count} used to repeat the placeholder shape.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number[]>}
   */
  protected readonly rows: Signal<number[]> = computed<number[]>(() =>
    Array.from({ length: Math.max(1, this.count()) }, (_, index) => index),
  );
  //#endregion
}
