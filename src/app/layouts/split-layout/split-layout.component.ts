import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { SplitLayoutHeader, SplitLayoutContent, SplitLayoutFooter, SplitLayoutShowcase } from "@layouts/split-layout/partials";

/**
 * Component SplitLayout
 * @class SplitLayout
 *
 * @description
 * Layout component for authentication pages
 * like login, register, forgot password, etc.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-split-layout/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-split-layout',
  imports: [
    RouterOutlet,
    SplitLayoutHeader,
    SplitLayoutContent,
    SplitLayoutFooter,
    SplitLayoutShowcase,
  ],
  templateUrl: './split-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitLayout {}

