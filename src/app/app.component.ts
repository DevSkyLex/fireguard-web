import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SplashScreen, Toast } from '@shared/components';

/**
 * Component App
 * @class App
 *
 * @description
 * Root application component for the FireGuard
 * SSO web application.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```html
 * <!-- Used in main.ts as the bootstrap component -->
 * <app-root></app-root>
 * ```
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ConfirmDialogModule, SplashScreen, Toast],
  template: `
    <app-splash-screen />
    <p-confirmdialog />
    <app-toast />
    <router-outlet />
  `,
})
export class App {}
