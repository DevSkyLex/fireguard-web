import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  viewChild,
  type ElementRef,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideMessageSquare } from '@ng-icons/lucide';
import type {
  MessageReactionToggle,
  MessageThreadEntry,
  MessageView,
} from '@features/organization/features/collaboration/models';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmMarker, HlmMarkerContent } from '@shared/ui/marker';
import { HlmMessageGroup } from '@shared/ui/message';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { MessageRow } from '../message-row';
import type { MessageThreadRenderGroup } from './models';
import { buildThreadEntries, groupRenderEntries } from './utils';

/**
 * How close to the bottom still counts as reading the newest message.
 *
 * A few pixels of slack, so a scroller that is one sub-pixel short of the end
 * does not read as "the member has scrolled away".
 */
const BOTTOM_SLACK_PX = 64;

/**
 * Component MessageThread
 * @class MessageThread
 *
 * @description
 * The conversation itself: date rules, runs of messages by one author, and
 * whatever the caller projects as the composer.
 *
 * **This component owns the only scroller on the page.** The shell wraps the
 * routed page in an `overflow-y-auto` box of its own, so every level between
 * the two has to refuse to grow — hence `min-h-0` on the host and on the
 * column — or the whole page scrolls and takes the composer with it. The
 * composer is projected *into* the scroller as a sticky footer rather than
 * placed beside it, which is what makes the scrollbar run the full height of
 * the pane and keeps the composer aligned with the messages at every width.
 *
 * Scroll position is managed here because nothing in CSS covers it: the thread
 * opens at the newest message, follows new ones only while the member is
 * already at the bottom, and holds its place when older history is paged in
 * above. `overflow-anchor` cannot substitute — Safari does not implement it.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-message-thread [messages]="messages()" (loadMore)="loadOlder()">
 *   <app-message-composer (sent)="send($event)" />
 * </app-message-thread>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-message-thread',
  imports: [
    EmptyState,
    ErrorState,
    HlmButton,
    HlmMarker,
    HlmMarkerContent,
    HlmMessageGroup,
    HlmSkeleton,
    MessageRow,
  ],
  providers: [provideIcons({ lucideMessageSquare })],
  templateUrl: './message-thread.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageThread {
  //#region Inputs
  /**
   * Property messages
   * @readonly
   *
   * @description
   * The conversation in chronological order, oldest first.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly MessageView[]>}
   */
  public readonly messages: InputSignal<readonly MessageView[]> =
    input.required<readonly MessageView[]>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the first page is still on its way.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property hasMore
   * @readonly
   *
   * @description
   * Whether older history remains unfetched.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasMore: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property errorMessage
   * @readonly
   *
   * @description
   * Why the conversation could not be read, or `null` when it could.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly errorMessage: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property canReact
   * @readonly
   *
   * @description
   * Whether the reader may react to messages, which is a write rather than a
   * consequence of being able to read them.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canReact: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property loadMore
   * @readonly
   *
   * @description
   * Asks for the page of history before the one already loaded.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly loadMore: OutputEmitterRef<void> = output<void>();

  /**
   * Property retried
   * @readonly
   *
   * @description
   * Emits the id of a message the member wants to send again.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly retried: OutputEmitterRef<string> = output<string>();

  /**
   * Property reactionToggled
   * @readonly
   *
   * @description
   * Emits the emoji a reader pressed, and on which message.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<MessageReactionToggle>}
   */
  public readonly reactionToggled: OutputEmitterRef<MessageReactionToggle> =
    output<MessageReactionToggle>();

  /**
   * Property caughtUp
   * @readonly
   *
   * @description
   * Emitted once the newest message is on screen, which is what makes a
   * conversation read. Fires on arrival at the bottom, not on every scroll
   * event, so a parent can move the read marker without debouncing it.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly caughtUp: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property entries
   * @readonly
   *
   * @description
   * What the thread draws: the messages with date rules inserted and each run
   * of one author's messages marked.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MessageThreadEntry[]>}
   */
  protected readonly entries: Signal<readonly MessageThreadEntry[]> = computed(
    (): readonly MessageThreadEntry[] => buildThreadEntries(this.messages()),
  );

  /**
   * Property renderGroups
   * @readonly
   *
   * @description
   * What the template actually iterates: {@link entries} folded so a run of
   * one author's messages draws inside a single `hlmMessageGroup` instead of a
   * flat list of independently-margined rows.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MessageThreadRenderGroup[]>}
   */
  protected readonly renderGroups: Signal<readonly MessageThreadRenderGroup[]> = computed(
    (): readonly MessageThreadRenderGroup[] => groupRenderEntries(this.entries()),
  );

  /**
   * Property scroller
   * @readonly
   *
   * @description
   * The scrolling element, addressed directly because scroll position is the
   * one thing this component manages imperatively.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  protected readonly scroller: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild<ElementRef<HTMLElement>>('scroller');

  /** Whether the member is reading the newest message rather than history. */
  private pinnedToBottom: boolean = true;

  /** Scroll height at the previous render, to measure what was added. */
  private previousScrollHeight: number = 0;

  /** First rendered message id, which changes when history is paged in above. */
  private previousFirstId: string | null = null;

  /** Whether the thread has drawn a message yet. */
  private hasDrawn: boolean = false;

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Active locale, used to name the day a date rule marks.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   * @constructor
   *
   * @description
   * Registers the scroll-position effect. It runs after render because it has
   * to measure the DOM the entries just produced.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterRenderEffect((): void => this.keepScrollPosition(this.entries()));
  }
  //#endregion

  //#region Methods
  /**
   * Method formatDay
   * @method formatDay
   *
   * @description
   * Names the day a date rule marks, in the active locale.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} iso - The day's first message instant.
   *
   * @returns {string} The formatted date, or an empty string when unparseable.
   */
  protected formatDay(iso: string): string {
    const parsed: number = Date.parse(iso);

    if (Number.isNaN(parsed)) return '';

    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'long' }).format(parsed);
  }

  /**
   * Method trackEntry
   * @method trackEntry
   *
   * @description
   * Identity of one rendered entry. A date rule is keyed by its day and a
   * message by its id, so neither is recreated when the other moves.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MessageThreadEntry} entry - The entry being tracked.
   *
   * @returns {string} A key unique within the thread.
   */
  protected trackEntry(entry: MessageThreadEntry): string {
    return entry.kind === 'day' ? `day:${entry.day}` : entry.message.id;
  }

  /**
   * Method trackGroup
   * @method trackGroup
   *
   * @description
   * Identity of one rendered group, so a day rule and a run are each
   * recreated only when their own key changes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MessageThreadRenderGroup} group - The group being tracked.
   *
   * @returns {string} A key unique within the thread.
   */
  protected trackGroup(group: MessageThreadRenderGroup): string {
    return group.kind === 'day' ? `day:${group.day}` : `run:${group.key}`;
  }

  /**
   * Method onScroll
   * @method onScroll
   *
   * @description
   * Records whether the member is still reading the newest message, which is
   * what decides if the thread follows the next one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onScroll(): void {
    const element: HTMLElement | undefined = this.scroller()?.nativeElement;

    if (element === undefined) return;

    const wasPinned: boolean = this.pinnedToBottom;
    this.pinnedToBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_SLACK_PX;

    if (this.pinnedToBottom && !wasPinned) this.caughtUp.emit();
  }

  /**
   * Method keepScrollPosition
   * @method keepScrollPosition
   *
   * @description
   * Opens the thread at the newest message, follows new ones while the member
   * is at the bottom, and holds the reading position when older history lands
   * above it.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {readonly MessageThreadEntry[]} entries - Entries that were just drawn.
   *
   * @returns {void}
   */
  private keepScrollPosition(entries: readonly MessageThreadEntry[]): void {
    const element: HTMLElement | undefined = this.scroller()?.nativeElement;

    if (element === undefined || entries.length === 0) return;

    const firstId: string = this.trackEntry(entries[0]);
    const grewAbove: boolean = this.previousFirstId !== null && firstId !== this.previousFirstId;
    const previousHeight: number = this.previousScrollHeight;

    this.previousFirstId = firstId;
    this.previousScrollHeight = element.scrollHeight;

    if (!this.hasDrawn) {
      this.hasDrawn = true;
      element.scrollTop = element.scrollHeight;
      this.caughtUp.emit();

      return;
    }

    if (grewAbove) {
      element.scrollTop += element.scrollHeight - previousHeight;

      return;
    }

    if (!this.pinnedToBottom) return;

    element.scrollTop = element.scrollHeight;
    this.caughtUp.emit();
  }
  //#endregion
}
