import { ChangeDetectionStrategy, Component, signal, type WritableSignal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EmptyState } from '@shared/empty-state';

/**
 * Component DirectMessagesPage
 * @class DirectMessagesPage
 *
 * @description
 * The direct-messages route entry: the routed conversation, or a placeholder
 * when none is open. The conversation list itself lives in the dashboard
 * sidebar (`DirectMessagesNav`), which is on screen for the whole surface, so
 * this page owns only the outlet and its empty state.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-direct-messages-page',
  imports: [RouterOutlet, EmptyState],
  templateUrl: './direct-messages-page.component.html',
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DirectMessagesPage {
  //#region Properties
  /**
   * Property hasOpenConversation
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
  protected readonly hasOpenConversation: WritableSignal<boolean> = signal<boolean>(false);
  //#endregion
}
