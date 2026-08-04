import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConnectivityService } from '@core/connectivity';
import { ErrorContent } from '../../components/error-content';

/**
 * Component ServerErrorPage
 * @class ServerErrorPage
 *
 * @description
 * Displayed when an unhandled server-side or application error occurs (HTTP 500).
 *
 * **Tells a dropped connection apart from a broken server.** The two are the
 * same HTTP failure to the transport layer and nothing alike to the member: one
 * resolves by walking back into coverage, the other by waiting. Getting it
 * wrong is worse here than anywhere else, because a field agent reading "an
 * error occurred on our end" while standing in a basement has been told the
 * one thing that is not true — and their captured work is safe on the device,
 * which is exactly what they need to hear.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-server-error-page',
  imports: [RouterLink, ButtonModule, ErrorContent],
  templateUrl: './server-error-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerErrorPage {
  //#region Properties
  /** Browser connectivity, SSR-safe (resolves to online on the server). */
  private readonly connectivity: ConnectivityService =
    inject<ConnectivityService>(ConnectivityService);

  /** Whether the device has lost its connection. */
  protected readonly isOffline: Signal<boolean> = computed<boolean>(
    () => !this.connectivity.online(),
  );

  /** Code shown in the error tile: a status number only when there is one. */
  protected readonly code: Signal<string> = computed<string>(() =>
    this.isOffline() ? $localize`:@@error.offline.code:offline` : '500',
  );

  /** Heading, chosen by what actually went wrong. */
  protected readonly title: Signal<string> = computed<string>(() =>
    this.isOffline()
      ? $localize`:@@error.offline.title:You're not connected`
      : $localize`:@@error.500.title:Something went wrong`,
  );

  /** Explanation, chosen by what actually went wrong. */
  protected readonly description: Signal<string> = computed<string>(() =>
    this.isOffline()
      ? $localize`:@@error.offline.description:Field work you have already captured stays on this device and syncs on its own once you are back in range.`
      : $localize`:@@error.500.description:An unexpected error occurred on our end. Please try again in a moment.`,
  );
  //#endregion

  //#region Methods
  /**
   * Method refresh
   * @method refresh
   *
   * @description
   * Reloads the current document so the user can retry after a server error.
   *
   * @access public
   * @returns {void}
   */
  public refresh(): void {
    window.location.reload();
  }
  //#endregion
}
