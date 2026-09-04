import { ChangeDetectionStrategy, Component, signal, type WritableSignal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHash } from '@ng-icons/lucide';
import { HlmEmptyImports } from '@shared/ui/empty';

/**
 * Component ChannelsPage
 * @class ChannelsPage
 *
 * @description
 * The channels route entry: the routed channel, or a placeholder
 * when none is open. The channel list belongs to the dashboard extension
 * (`ChannelsPanel`), so this page owns only the outlet and its empty state.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channels-page',
  imports: [NgIcon, ...HlmEmptyImports, RouterOutlet],
  providers: [provideIcons({ lucideHash })],
  templateUrl: './channels-page.component.html',
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelsPage {
  //#region Properties
  /**
   * Property hasOpenChannel
   * @readonly
   *
   * @description
   * Whether a conversation is routed, which decides the empty state. Read from
   * the outlet rather than the URL because the outlet is what actually holds
   * one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly hasOpenChannel: WritableSignal<boolean> = signal<boolean>(false);
  //#endregion
}
