import {
  ChangeDetectionStrategy,
  Component,
  input,
  type InputSignal,
  output,
  type OutputEmitterRef,
} from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import type { MessageOutput } from '@features/organization/features/collaboration/models';
import { MessageComposer } from '@features/organization/features/collaboration/ui/components';
import type { MemberDirectoryEntry } from '@features/organization/models';
import { ChatMessage, ChatThread, type ChatMessageItem } from '@shared/chat';
import { DRAWER_STYLE_CLASS } from '@shared/overlay-size';

/**
 * Component MessageThreadDrawer
 * @class MessageThreadDrawer
 *
 * @description
 * A message's replies, in a side panel over the conversation it belongs to.
 *
 * A panel rather than an inline expansion because the API decides it: threaded
 * replies are **excluded** from the conversation listing, so they are not rows
 * the thread could reveal — they are a second collection, fetched from the
 * parent. Keeping the conversation visible behind them is what makes that read
 * as one place rather than two.
 *
 * Presentational: it injects nothing, fetches nothing, and reports what the
 * reader did. The root message renders with every control off — it is the
 * thread's subject, and acting on it belongs where it was opened from.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-message-thread-drawer [visible]="open()" [replies]="replies()" (sent)="reply($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-thread-drawer',
  imports: [ChatMessage, ChatThread, DrawerModule, MessageComposer],
  templateUrl: './message-thread-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageThreadDrawer {
  //#region Properties
  /**
   * Property drawerStyleClass
   * @readonly
   *
   * @description
   * The one canonical drawer width step (`shared/overlay-size`): full width
   * on mobile, a fixed 34rem panel from `sm` up.
   *
   * @access protected
   * @since 1.5.0
   *
   * @type {string}
   */
  protected readonly drawerStyleClass: string = DRAWER_STYLE_CLASS;
  //#endregion

  //#region Inputs
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the panel is open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property parentMessage
   * @readonly
   *
   * @description
   * The root message the thread hangs off, or `null` while it is unknown.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ChatMessageItem<MessageOutput> | null>}
   */
  public readonly parentMessage: InputSignal<ChatMessageItem<MessageOutput> | null> =
    input<ChatMessageItem<MessageOutput> | null>(null);

  /**
   * Property replies
   * @readonly
   *
   * @description
   * The replies, oldest first.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly ChatMessageItem<MessageOutput>[]>}
   */
  public readonly replies: InputSignal<readonly ChatMessageItem<MessageOutput>[]> = input<
    readonly ChatMessageItem<MessageOutput>[]
  >([]);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether a read of the replies is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property posting
   * @readonly
   *
   * @description
   * Whether a reply is being sent, which locks the composer.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly posting: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property errorMessage
   * @readonly
   *
   * @description
   * An already-worded read failure, or `null`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly errorMessage: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property hasMore
   * @readonly
   *
   * @description
   * Whether earlier replies remain to be fetched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasMore: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property loadedCount
   * @readonly
   *
   * @description
   * How many replies are loaded, for the counter beside the load control.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly loadedCount: InputSignal<number> = input<number>(0);

  /**
   * Property totalCount
   * @readonly
   *
   * @description
   * How many replies there are in total.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly totalCount: InputSignal<number> = input<number>(0);

  /**
   * Property members
   * @readonly
   *
   * @description
   * Who the reply composer may offer as a mention.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MemberDirectoryEntry[]>}
   */
  public readonly members: InputSignal<readonly MemberDirectoryEntry[]> = input<
    readonly MemberDirectoryEntry[]
  >([]);
  //#endregion

  //#region Outputs
  /** Emits the panel's requested visibility. */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();
  /** Emits when the reader asks for earlier replies. */
  public readonly loadMore: OutputEmitterRef<void> = output<void>();
  /** Emits the reply body the composer produced. */
  public readonly sent: OutputEmitterRef<string> = output<string>();
  /** Emits a reply as plain text, for the parent to put on the clipboard. */
  public readonly copied: OutputEmitterRef<string> = output<string>();
  //#endregion
}
