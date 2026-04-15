import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  type WritableSignal,
} from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SPLASH_SCREEN_PORT, type SplashScreenPort } from '@core/ports/splash-screen';

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
 * Visibility is consumed through a neutral splash port so the
 * component stays decoupled from core implementations.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-splash-screen',
  imports: [ProgressSpinnerModule],
  templateUrl: './splash-screen.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplashScreen {
  //#region Properties
  /**
   * Property splashScreenPort
   * @readonly
   *
   * @description
   * Injects the neutral splash screen port to
   * react to visibility changes.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {SplashScreenPort}
   */
  private readonly splashScreenPort: SplashScreenPort =
    inject<SplashScreenPort>(SPLASH_SCREEN_PORT);

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
  protected readonly rendered: WritableSignal<boolean> = signal<boolean>(true);

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
  protected readonly hiding: WritableSignal<boolean> = signal<boolean>(false);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Registers an effect that reacts to the splash screen port visibility
   * signal. When the splash becomes visible the overlay is restored
   * immediately. When it becomes hidden an opacity fade-out is started
   * and the overlay is removed from the DOM after the transition
   * completes.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    let fadeTimer: ReturnType<typeof setTimeout> | null = null;

    effect(() => {
      const visible: boolean = this.splashScreenPort.visible();

      if (visible) {
        if (fadeTimer !== null) {
          clearTimeout(fadeTimer);
          fadeTimer = null;
        }
        this.hiding.set(false);
        this.rendered.set(true);
        return;
      }

      this.hiding.set(true);
      fadeTimer = setTimeout(() => {
        this.rendered.set(false);
        this.hiding.set(false);
        fadeTimer = null;
      }, FADE_DURATION_MS);
    });
  }
  //#endregion
}
