import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component Logo
 * @class Logo
 *
 * @description
 * The Fireguard brand mark ("Garde diagonale") — three stable rounded blocks
 * with a fourth block pivoted 45° holding the corner. The three blocks are
 * painted with `currentColor`, so the mark takes the host's text color (set a
 * text-color class on `<app-logo>` per surface: dark on light, light on dark).
 * The pivoted guard is the fixed indigo brand accent (`--p-primary-600`).
 *
 * Symbol only (no wordmark); pair it with a separate text label where a lockup
 * is needed. Scales to its host box: apply a sizing class (e.g. `class="size-7"`)
 * to `<app-logo>` and the SVG fills it.
 *
 * @example ```html
 * <app-logo class="size-7 text-surface-900 dark:text-surface-50" />
 * ```
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-logo',
  templateUrl: './logo.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
})
export class Logo {}
