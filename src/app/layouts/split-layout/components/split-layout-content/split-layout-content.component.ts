import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component SplitLayoutContent
 * @class SplitLayoutContent
 *
 * @description
 * Content column of the split layout: it owns only the vertical centering and
 * horizontal padding. Each routed page sets its own max-width (auth pages a
 * narrow form column, onboarding a wider wizard), so the shared layout carries
 * no width policy.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-split-layout-content>
 *   {{content}}
 * </app-split-layout-content>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-split-layout-content',
  templateUrl: './split-layout-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitLayoutContent {}
