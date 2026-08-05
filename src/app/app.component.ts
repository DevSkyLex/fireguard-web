import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastDeck } from '@shared/toast';

/**
 * Component App
 * @class App
 *
 * @description
 * Root application component. Reduced to a bare routing outlet: the interface
 * layer has been removed, so the shell owns no splash screen, toast deck or
 * confirmation host until a new one is built.
 *
 * @version 2.0.0
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
  imports: [RouterOutlet, ToastDeck],
  template: `<router-outlet /> <app-toast-deck />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
