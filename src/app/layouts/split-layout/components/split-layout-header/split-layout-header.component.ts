import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Logo } from '@shared/components/logo';
import { ThemeSwitcher } from '@shared/components/theme-switcher';

/**
 * Component SplitLayoutHeader
 * @class SplitLayoutHeader
 *
 * @description
 * Top bar of the split layout form column. Carries the compact brand lockup on
 * small screens (where the showcase panel is hidden, so the brand would
 * otherwise disappear) and the theme switcher, which stays reachable on every
 * breakpoint.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-split-layout-header/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-split-layout-header',
  imports: [Logo, ThemeSwitcher],
  templateUrl: './split-layout-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitLayoutHeader {}
