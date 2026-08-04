import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '@shared/logo';
import { ThemeSwitcher } from '@shared/theme-switcher';

/**
 * Component FocusedLayoutHeader
 * @class FocusedLayoutHeader
 *
 * @description
 * Header of the focused shell — the one that serves errors and maintenance.
 *
 * It used to be an empty `<header>` element, which left those pages with no
 * mark, no way home from the chrome, and no theme control: the two shells a
 * member can land in from outside the application looked like two different
 * products. It now carries the same lockup and switcher as the split shell.
 *
 * @version 2.0.0
 *
 * @example
 * ```html
 * <app-focused-layout-header/>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-focused-layout-header',
  imports: [RouterLink, Logo, ThemeSwitcher],
  templateUrl: './focused-layout-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusedLayoutHeader {}
