import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { EMPTY, switchMap, timer } from 'rxjs';
import { SplashScreenService } from '@core/services/splash-screen';

/**
 * Constant FADE_DURATION_MS
 * @const FADE_DURATION_MS
 *
 * @description
 * Fade-out duration in milliseconds — must match
 * Tailwind `duration-300`.
 *
 * @type {number}
 */
const FADE_DURATION_MS: number = 300;

/**
 * Component SplashScreen
 * @class SplashScreen
 *
 * @description
 * Full-viewport overlay displayed during application boot
 * and lazy-loaded route transitions. Theme-aware via the
 * `data-theme` attribute already applied on `<html>`.
 *
 * Uses a CSS opacity transition (Tailwind) instead of
 * `@angular/animations` to drive the fade-out effect.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [ProgressSpinnerModule],
  templateUrl: './splash-screen.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplashScreen {
  //#region Properties
  /**
   * Property splashScreenService
   * @readonly
   *
   * @description
   * Injects the SplashScreenService to
   * react to visibility changes.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {SplashScreenService}
   */
  private readonly splashScreenService: SplashScreenService =
    inject<SplashScreenService>(SplashScreenService);

  /**
   * Property rendered
   * @readonly
   *
   * @description
   * True if the splash screen should be
   * rendered in the DOM.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly rendered: WritableSignal<boolean> =
    signal<boolean>(true);

  /**
   * Property hiding
   * @readonly
   *
   * @description
   * Whether the overlay is currently
   * fading out (opacity-0).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly hiding: WritableSignal<boolean> =
    signal<boolean>(false);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Subscribes to the SplashScreenService visibility signal
   * to manage the rendered and hiding states, triggering the
   * fade-out effect when the splash screen should be hidden.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    toObservable(this.splashScreenService.visible)
      .pipe(
        switchMap((visible) => {
          if (visible) {
            this.hiding.set(false);
            this.rendered.set(true);
            return EMPTY;
          }
          this.hiding.set(true);
          return timer(FADE_DURATION_MS);
        }),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.rendered.set(false);
        this.hiding.set(false);
      });
  }
  //#endregion
}
