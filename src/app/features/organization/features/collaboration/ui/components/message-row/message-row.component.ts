import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import type {
  MessageOutput,
  MessageReactionOutput,
} from '@features/organization/features/collaboration/models';
import { deriveInitials } from '@shared/utils';
import { MessageBody } from '../message-body';
import { MessageReferenceCard } from '../message-reference-card';

/**
 * Component MessageRow
 * @class MessageRow
 *
 * @description
 * One message in a thread: avatar, author line, body, reactions, and a hover
 * toolbar.
 *
 * Presentational — it injects no store and calls no service. The author's
 * display name arrives as an input because member IRIs are not dereferenceable
 * on this API.
 *
 * The toolbar reveals on `:focus-within` as well as hover: the source
 * prototype was mouse-only, which put its actions out of keyboard reach.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-message-row [message]="message" [authorName]="name" (reacted)="react($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-row',
  imports: [AvatarModule, ButtonModule, DatePipe, MessageBody, MessageReferenceCard],
  templateUrl: './message-row.component.html',
  host: { class: 'group relative flex gap-3 max-lg:flex-wrap' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageRow {
  //#region Inputs
  /**
   * Property message
   * @readonly
   *
   * @description
   * The message to render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MessageOutput>}
   */
  public readonly message: InputSignal<MessageOutput> = input.required<MessageOutput>();

  /**
   * Property authorName
   * @readonly
   *
   * @description
   * Author's display name, resolved by the caller.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly authorName: InputSignal<string> = input.required<string>();

  /**
   * Property authorAvatarUrl
   * @readonly
   *
   * @description
   * Author's avatar, when one is known.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly authorAvatarUrl: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property isOwn
   * @readonly
   *
   * @description
   * Whether the acting member wrote this message, which unlocks editing and
   * shows the "You" marker.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly isOwn: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property memberNames
   * @readonly
   *
   * @description
   * Display names by member id, forwarded to the body for mention chips.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<Readonly<Record<string, string>>>}
   */
  public readonly memberNames: InputSignal<Readonly<Record<string, string>>> = input<
    Readonly<Record<string, string>>
  >({});

  /**
   * Property continuation
   * @readonly
   *
   * @description
   * Whether this message carries on the previous author's run, in which case
   * the avatar and author line are suppressed and the row tightens up.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly continuation: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether the message is shown optimistically and has not reached the server
   * yet.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property failed
   * @readonly
   *
   * @description
   * Whether the send failed and is waiting on the member.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly failed: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property quickActions
   * @readonly
   *
   * @description
   * Whether the hover toolbar offers reacting and pinning.
   *
   * Off on surfaces that cannot act on them — the saved-messages list binds
   * only `saveToggled`, so every other control there was a real, focusable
   * button that silently did nothing.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly quickActions: InputSignal<boolean> = input<boolean>(true);
  //#endregion

  /**
   * Property saveLabel
   * @readonly
   *
   * @description
   * The bookmark button's accessible name, which follows the toggle rather
   * than saying "Save message" while the button unsaves.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string>}
   */
  protected readonly saveLabel: Signal<string> = computed((): string =>
    this.message().isSaved
      ? $localize`:@@workspace.message.unsave.aria:Remove from saved messages`
      : $localize`:@@workspace.message.save.aria:Save message`,
  );

  //#region Outputs
  /** Emits the emoji the member reacted with. */
  public readonly reacted: OutputEmitterRef<string> = output<string>();
  /** Emits the emoji whose reaction the member is taking back. */
  public readonly reactionRemoved: OutputEmitterRef<string> = output<string>();
  /** Emits when the member toggles the bookmark. */
  public readonly saveToggled: OutputEmitterRef<void> = output<void>();
  /** Emits when the member pins the message. */
  public readonly pinned: OutputEmitterRef<void> = output<void>();
  /** Emits when the member asks to send a failed message again. */
  public readonly retried: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property initials
   * @readonly
   *
   * @description
   * Avatar fallback derived from the author's display name.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly initials: Signal<string> = computed((): string =>
    deriveInitials(this.authorName()),
  );

  /**
   * Property reactions
   * @readonly
   *
   * @description
   * Reaction tallies on this message.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MessageReactionOutput[]>}
   */
  protected readonly reactions: Signal<readonly MessageReactionOutput[]> = computed(
    (): readonly MessageReactionOutput[] => this.message().reactions,
  );

  /**
   * Property quickReactions
   * @readonly
   *
   * @description
   * The short emoji set offered on hover.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly string[]}
   */
  protected readonly quickReactions: readonly string[] = ['👍', '✅', '👀', '🔥'];
  //#endregion
}
