import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { SplashScreen } from '@shared/components';

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
  imports: [RouterOutlet, ConfirmDialogModule, ToastModule, SplashScreen],
  template: `
    <app-splash-screen />
    <p-confirmdialog />
    <p-toast position="top-right" />
    <router-outlet />
  `,
})
export class App {}
