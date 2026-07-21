import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  type ElementRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ENV_CONFIG, type EnvironmentConfig } from '@core/config/environment';
import { toMemberId } from '@features/organization/features/messaging/data-access';
import type {
  MessageAttachment,
  MessageOutput,
  MessageReaction,
} from '@features/organization/features/messaging/models';
import type { MemberIdentity } from '@features/organization/state';
import { EmptyState, Skeleton } from '@shared/components';
import { toMessageBodyParts, type MessageBodyPart } from './utils/message-body-parts.utils';

/**
 * Component MessageThread
 * @class MessageThread
 *
 * @description
 * A conversation's messages, oldest first.
 *
 * Presentational. Two things it must get right: a deleted message keeps its row
 * with a null body (replies and reactions hang off it), and the author is a
 * bare member id until the member directory lands — so it is rendered as an
 * explicit placeholder rather than a blank.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-message-thread [messages]="store.messages()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-thread',
  imports: [DatePipe, EmptyState, Skeleton],
  templateUrl: './message-thread.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageThread {
  //#region Inputs
  /**
   * Property messages
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MessageOutput[]>}
   */
  public readonly messages: InputSignal<readonly MessageOutput[]> = input<readonly MessageOutput[]>(
    [],
  );

  /**
   * Property loading
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property scroller
   * @readonly
   *
   * @description
   * The scrolling log element, needed to keep the newest message in view.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  protected readonly scroller: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('scroller');
  //#endregion

  /**
   * Property authors
   * @readonly
   *
   * @description
   * Member id → identity, supplied by the directory. A message whose author is
   * missing from it still renders — a member can be removed from the
   * organization while their messages stay.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<ReadonlyMap<string, MemberIdentity>>}
   */
  public readonly authors: InputSignal<ReadonlyMap<string, MemberIdentity>> = input<
    ReadonlyMap<string, MemberIdentity>
  >(new Map<string, MemberIdentity>());
  /**
   * Property currentMemberId
   * @readonly
   *
   * @description
   * Who "I" am. The API sends `memberIds` per emoji, so without this the UI
   * cannot tell "3 people reacted" from "3 people including me".
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly currentMemberId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property onlineMembers
   * @readonly
   *
   * @description
   * Members currently online. Absent from the set means offline **or**
   * unknown — presence expires server-side, so a missing id is not a claim
   * that someone left.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly onlineMembers: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set<string>(),
  );

  /**
   * Property attachmentsByMessage
   * @readonly
   *
   * @description
   * Attachments keyed by message id. There is no download endpoint yet, so
   * these render as metadata (name, size), not links.
   *
   * @access public
   * @since 4.0.0
   *
   * @type {InputSignal<ReadonlyMap<string, readonly MessageAttachment[]>>}
   */
  public readonly attachmentsByMessage: InputSignal<
    ReadonlyMap<string, readonly MessageAttachment[]>
  > = input<ReadonlyMap<string, readonly MessageAttachment[]>>(
    new Map<string, readonly MessageAttachment[]>(),
  );
  //#endregion

  //#region Outputs
  /**
   * Property reactionToggled
   * @readonly
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<{ message: MessageOutput; emoji: string }>}
   */
  public readonly reactionToggled: OutputEmitterRef<{
    readonly message: MessageOutput;
    readonly emoji: string;
  }> = output<{ readonly message: MessageOutput; readonly emoji: string }>();

  /**
   * Property pinToggled
   * @readonly
   *
   * @access public
   * @since 3.0.0
   *
   * @type {OutputEmitterRef<MessageOutput>}
   */
  public readonly pinToggled: OutputEmitterRef<MessageOutput> = output<MessageOutput>();

  /**
   * Property saveToggled
   * @readonly
   *
   * @access public
   * @since 3.0.0
   *
   * @type {OutputEmitterRef<MessageOutput>}
   */
  public readonly saveToggled: OutputEmitterRef<MessageOutput> = output<MessageOutput>();

  /**
   * Property threadOpened
   * @readonly
   *
   * @access public
   * @since 4.0.0
   *
   * @type {OutputEmitterRef<MessageOutput>}
   */
  public readonly threadOpened: OutputEmitterRef<MessageOutput> = output<MessageOutput>();

  /**
   * Property edited
   * @readonly
   *
   * @description
   * A message's new body, confirmed by its author.
   *
   * @access public
   * @since 2.2.0
   *
   * @type {OutputEmitterRef<{ message: MessageOutput; body: string }>}
   */
  public readonly edited: OutputEmitterRef<{
    readonly message: MessageOutput;
    readonly body: string;
  }> = output<{ readonly message: MessageOutput; readonly body: string }>();

  /**
   * Property deleteRequested
   * @readonly
   *
   * @description
   * The member asked to delete a message. Confirmation is the page's call, not
   * this component's.
   *
   * @access public
   * @since 2.2.0
   *
   * @type {OutputEmitterRef<MessageOutput>}
   */
  public readonly deleteRequested: OutputEmitterRef<MessageOutput> = output<MessageOutput>();
  //#endregion

  //#region Editing state
  /**
   * Property canManageMessages
   * @readonly
   *
   * @description
   * Whether the acting member holds `messaging.manage`, which lets them delete
   * someone else's message. Editing stays the author's alone — the backend
   * refuses it to anyone else whatever their permissions.
   *
   * @access public
   * @since 2.2.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canManageMessages: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property hasOlderMessages
   * @readonly
   *
   * @description
   * Whether history remains above what is loaded, which is what the scrollback
   * affordance is for.
   *
   * @access public
   * @since 2.2.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasOlderMessages: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property olderRequested
   * @readonly
   *
   * @description
   * The reader asked for the page before.
   *
   * @access public
   * @since 2.2.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly olderRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property moreMessageId
   * @readonly
   *
   * @description
   * Which message has its overflow menu open.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly moreMessageId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property editingMessageId
   * @readonly
   *
   * @description
   * Which message is being rewritten in place.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly editingMessageId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property editDraft
   * @readonly
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly editDraft: WritableSignal<string> = signal<string>('');
  //#endregion

  //#region Lifecycle
  /**
   * Constructor
   *
   * @description
   * Keeps the newest message in view — a chat that does not follow its own
   * arrivals leaves the reader stranded mid-history on every send.
   *
   * Only when the reader is already near the bottom: yanking someone back down
   * while they are reading older messages is worse than not scrolling at all.
   *
   * @access public
   * @since 2.2.0
   */
  public constructor() {
    effect((): void => {
      // Read first so the effect re-runs on every arrival.
      const count: number = this.messages().length;
      const element: HTMLElement | undefined = this.scroller()?.nativeElement;

      if (count === 0 || !element) return;

      const distanceFromBottom: number =
        element.scrollHeight - element.scrollTop - element.clientHeight;

      // One viewport of slack: enough to cover a message that just pushed the
      // content down, without hijacking a deliberate scroll upwards.
      if (distanceFromBottom > element.clientHeight) return;

      // Deferred a turn: the new message has not been laid out yet, so
      // scrollHeight is still the previous one.
      setTimeout((): void => {
        element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method canEdit
   *
   * @description
   * Only the author may rewrite a message, and only while it exists. The
   * backend enforces this too — showing the action to anyone else would just
   * buy a 403.
   *
   * @access protected
   * @since 2.2.0
   *
   * @param {MessageOutput} message - The message under the cursor.
   *
   * @returns {boolean} Whether to offer Edit.
   */
  /**
   * Method isImage
   *
   * @description
   * Whether an attachment can be shown rather than only downloaded. A photo of
   * a site is the common case here, and a filename tells the reader nothing
   * about what was photographed.
   *
   * @access protected
   * @since 2.3.0
   *
   * @param {MessageAttachment} attachment - The attached file.
   *
   * @returns {boolean} Whether to render a preview.
   */
  protected isImage(attachment: MessageAttachment): boolean {
    return attachment.mimeType.startsWith('image/');
  }

  /**
   * Method fileIcon
   *
   * @description
   * Icon standing for an attachment's kind, from its MIME type.
   *
   * A paperclip on every row says only "a file is attached", which the row
   * already says. The kind is what tells the reader whether this is the
   * signed report or someone's spreadsheet, before they spend a download on
   * finding out.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {MessageAttachment} attachment - Attachment to describe.
   *
   * @returns {string} PrimeIcons class.
   */
  protected fileIcon(attachment: MessageAttachment): string {
    const type: string = attachment.mimeType;

    if (type === 'application/pdf') return 'pi pi-file-pdf';
    if (type.startsWith('video/')) return 'pi pi-video';
    if (type.startsWith('audio/')) return 'pi pi-volume-up';
    if (type.includes('spreadsheet') || type.includes('excel')) return 'pi pi-file-excel';
    if (type.includes('word') || type.includes('document')) return 'pi pi-file-word';
    if (type.includes('zip') || type.includes('compressed')) return 'pi pi-box';

    return 'pi pi-file';
  }

  /**
   * Method fileKind
   *
   * @description
   * Short human label for an attachment's kind — the subtitle beside its name.
   *
   * Derived from the MIME subtype rather than the file extension: the
   * extension is part of the name already shown above it, so repeating it
   * would fill the line without adding anything.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {MessageAttachment} attachment - Attachment to describe.
   *
   * @returns {string} Upper-case kind, for example `PDF`.
   */
  protected fileKind(attachment: MessageAttachment): string {
    const subtype: string = attachment.mimeType.split('/')[1] ?? attachment.mimeType;

    return (subtype.split('.').pop() ?? subtype).replace(/^x-/, '').toUpperCase();
  }

  protected canEdit(message: MessageOutput): boolean {
    const self: string | null = this.currentMemberId();

    return !message.isDeleted && self !== null && toMemberId(message.authorMember) === self;
  }

  /**
   * Method canDelete
   *
   * @description
   * The author, or a member holding `messaging.manage` — moderation has to
   * reach someone else's message.
   *
   * @access protected
   * @since 2.2.0
   *
   * @param {MessageOutput} message - The message under the cursor.
   *
   * @returns {boolean} Whether to offer Delete.
   */
  protected canDelete(message: MessageOutput): boolean {
    return !message.isDeleted && (this.canEdit(message) || this.canManageMessages());
  }

  /**
   * Method toggleMore
   *
   * @access protected
   * @since 2.2.0
   *
   * @param {MessageOutput} message - The message whose menu to toggle.
   *
   * @returns {void}
   */
  protected toggleMore(message: MessageOutput): void {
    this.moreMessageId.update((open: string | null): string | null =>
      open === message.id ? null : message.id,
    );
  }

  /**
   * Method startEditing
   *
   * @description
   * Opens the in-place editor seeded with the current body.
   *
   * @access protected
   * @since 2.2.0
   *
   * @param {MessageOutput} message - The message to rewrite.
   *
   * @returns {void}
   */
  protected startEditing(message: MessageOutput): void {
    this.moreMessageId.set(null);
    this.editDraft.set(message.body ?? '');
    this.editingMessageId.set(message.id);
  }

  /**
   * Method cancelEditing
   *
   * @access protected
   * @since 2.2.0
   *
   * @returns {void}
   */
  protected cancelEditing(): void {
    this.editingMessageId.set(null);
    this.editDraft.set('');
  }

  /**
   * Method saveEdit
   *
   * @description
   * Emits the new body and closes the editor. Nothing is patched locally: the
   * page owns the call, and the server's answer carries `editedAt`.
   *
   * @access protected
   * @since 2.2.0
   *
   * @param {MessageOutput} message - The message being rewritten.
   *
   * @returns {void}
   */
  protected saveEdit(message: MessageOutput): void {
    const body: string = this.editDraft().trim();
    if (body.length === 0) return;

    this.edited.emit({ message, body });
    this.cancelEditing();
  }

  /**
   * Method requestDelete
   *
   * @access protected
   * @since 2.2.0
   *
   * @param {MessageOutput} message - The message to delete.
   *
   * @returns {void}
   */
  protected requestDelete(message: MessageOutput): void {
    this.moreMessageId.set(null);
    this.deleteRequested.emit(message);
  }

  /**
   * Method hasReacted
   *
   * @description
   * Whether the acting member is among an emoji's reactors — straight from
   * the API's aggregated `reactedByMe`; reactor ids are never sent.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {MessageReaction} reaction - The reaction to test.
   *
   * @returns {boolean} `true` when the current member reacted.
   */
  protected hasReacted(reaction: MessageReaction): boolean {
    return reaction.reactedByMe;
  }

  /**
   * Method author
   *
   * @description
   * The author's identity, or a stable fallback when the directory does not
   * know them — a removed member must not blank out their own messages.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {string} memberId - The author's member id.
   *
   * @returns {MemberIdentity} The identity to render.
   */
  /**
   * Method bodyParts
   *
   * @description
   * The message body split into text and mention segments, so a mention can
   * render as a chip instead of the raw `@{uuid}` token the body stores.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {string | null} body - The message body.
   *
   * @returns {readonly MessageBodyPart[]} Ordered segments.
   */
  protected bodyParts(body: string | null): readonly MessageBodyPart[] {
    return toMessageBodyParts(body);
  }

  /**
   * Method mentionLabel
   *
   * @description
   * A mention's display label. Falls back to the bare id while the directory
   * is still loading — never to the raw token, which is unreadable.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {string} memberId - The mentioned member.
   *
   * @returns {string} The label to show after the `@`.
   */
  protected mentionLabel(memberId: string): string {
    return this.authors().get(memberId)?.displayName ?? memberId;
  }

  /**
   * Method isMine
   *
   * @description
   * Whether the acting member wrote this message — the row carries a "You"
   * badge when they did.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {MessageOutput} message - The row's message.
   *
   * @returns {boolean} Whether the message is the reader's own.
   */
  protected isMine(message: MessageOutput): boolean {
    const currentMemberId: string | null = this.currentMemberId();

    return currentMemberId !== null && toMemberId(message.authorMember) === currentMemberId;
  }

  /**
   * Property quickReactions
   * @readonly
   *
   * @description
   * The eight one-tap emoji of the design kit's reaction picker.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {readonly string[]}
   */
  protected readonly quickReactions: readonly string[] = [
    '👍',
    '❤️',
    '🎉',
    '✅',
    '🙏',
    '🔥',
    '👀',
    '⚠️',
  ];

  /**
   * Property pickerMessageId
   * @readonly
   *
   * @description
   * Which message currently has its reaction picker open — one at a time, so
   * opening a second closes the first.
   *
   * @access protected
   * @since 2.1.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly pickerMessageId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Method togglePicker
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {string} messageId - The row whose picker was requested.
   *
   * @returns {void}
   */
  protected togglePicker(messageId: string): void {
    this.pickerMessageId.update((open: string | null): string | null =>
      open === messageId ? null : messageId,
    );
  }

  /**
   * Method pickReaction
   *
   * @description
   * Applies a quick reaction and closes the picker — leaving it open would
   * hide the very chip the user just added.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {MessageOutput} message - The message reacted to.
   * @param {string} emoji - The chosen emoji.
   *
   * @returns {void}
   */
  protected pickReaction(message: MessageOutput, emoji: string): void {
    this.pickerMessageId.set(null);
    this.reactionToggled.emit({ message, emoji });
  }

  /**
   * Method isOnline
   *
   * @description
   * Whether a message's author is currently online. Converts the member IRI
   * the payload carries into the bare id the presence set is keyed by.
   *
   * @access protected
   * @since 2.1.0
   *
   * @param {string} memberReference - The message's `authorMember` IRI.
   *
   * @returns {boolean} Whether that member is online.
   */
  protected isOnline(memberReference: string): boolean {
    return this.onlineMembers().has(toMemberId(memberReference));
  }

  protected author(memberReference: string): MemberIdentity {
    // The payload carries a member IRI; the directory is keyed by bare id.
    const memberId: string = toMemberId(memberReference);

    return (
      this.authors().get(memberId) ?? {
        id: memberId,
        displayName: $localize`:@@messaging.thread.formerMember:Former member`,
        initials: '??',
        avatarUrl: null,
      }
    );
  }

  /**
   * Method attachments
   *
   * @description
   * The files on a message, or an empty list.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {string} messageId - The message id.
   *
   * @returns {readonly MessageAttachment[]} Its attachments.
   */
  protected attachments(messageId: string): readonly MessageAttachment[] {
    return this.attachmentsByMessage().get(messageId) ?? [];
  }

  /**
   * Property env
   * @readonly
   *
   * @description
   * Runtime environment, for the absolute attachment download URL — the
   * download is a plain navigation (cookie-authenticated, served with
   * `Content-Disposition: attachment`), not an HttpClient call.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {EnvironmentConfig}
   */
  private readonly env: EnvironmentConfig = inject<EnvironmentConfig>(ENV_CONFIG);

  /**
   * Method attachmentUrl
   *
   * @description
   * Absolute URL of an attachment's binary content.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {MessageAttachment} attachment - The attachment to download.
   *
   * @returns {string} Download URL.
   */
  protected attachmentUrl(attachment: MessageAttachment): string {
    return `${this.env.apiUrl}/api/messaging-attachments/${attachment.id}/content`;
  }

  /**
   * Method formatSize
   *
   * @description
   * A short human size (e.g. `1.4 MB`) for an attachment.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {number} bytes - The file size.
   *
   * @returns {string} The formatted size.
   */
  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  //#endregion
}
