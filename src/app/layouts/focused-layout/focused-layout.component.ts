import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  FocusedLayoutContent,
  FocusedLayoutFooter,
  FocusedLayoutHeader,
} from '@layouts/focused-layout/partials';

/**
 * Component FocusedLayout
 * @class FocusedLayout
 *
 * @description
 * Minimal layout used for simple pages
 * with centered content.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-focused-layout/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-focused-layout',
  imports: [RouterOutlet, FocusedLayoutHeader, FocusedLayoutContent, FocusedLayoutFooter],
  templateUrl: './focused-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusedLayout {}
