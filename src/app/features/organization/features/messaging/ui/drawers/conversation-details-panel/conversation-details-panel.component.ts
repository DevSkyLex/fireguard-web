import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { ENV_CONFIG, type EnvironmentConfig } from '@core/config/environment';
import { toMemberId } from '@features/organization/features/messaging/data-access';
import type {
  ChannelParticipant,
  ConversationOutput,
  MessageAttachment,
  MessageOutput,
} from '@features/organization/features/messaging/models';
import {
  ConversationDetailsStore,
  ConversationInventoryStore,
} from '@features/organization/features/messaging/state';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import {
  OrganizationMemberDirectoryStore,
  type MemberIdentity,
  type OrganizationMemberDirectoryStoreType,
} from '@features/organization/state';

/**
 * Which body the panel shows.
 *
 * @since 1.0.0
 */
type DetailsTab = 'info' | 'pins' | 'files';

/**
 * A conversation linked to the open one through the channel hierarchy.
 *
 * @since 1.2.0
 */
interface LinkedThreadRow {
  readonly id: string;
  readonly name: string;
  readonly relation: 'parent' | 'child';
}

/**
 * Projects a conversation into a linked-thread row.
 *
 * A channel falls back to its subject label and then to its id, so a row is
 * never rendered nameless — an unnamed link is not clickable in practice.
 *
 * @param {ConversationOutput} thread - The linked conversation.
 * @param {LinkedThreadRow['relation']} relation - How it relates to the open one.
 *
 * @returns {LinkedThreadRow} The row.
 *
 * @since 1.2.0
 */
function toLinkedThreadRow(
  thread: ConversationOutput,
  relation: LinkedThreadRow['relation'],
): LinkedThreadRow {
  return {
    id: thread.id,
    name: thread.name ?? thread.subjectLabel ?? thread.id,
    relation,
  };
}

/**
 * A participant joined with the identity the directory knows.
 *
 * @since 1.0.0
 */
interface ParticipantRow {
  readonly memberId: string;
  readonly displayName: string;
  readonly initials: string;
  readonly role: string | null;
  readonly fromTeam: boolean;
  readonly online: boolean;
}

/**
 * Component ConversationDetailsPanel
 * @class ConversationDetailsPanel
 *
 * @description
 * The workspace's right-hand contextual panel for a conversation: main info
 * (creator, created, visibility), its members, its pinned messages and its
 * files.
 *
 * Reads the open conversation from the URL, not from the messaging page: the
 * shell instantiates this panel in the layout's injector, where a
 * page-provided store is out of reach — the URL is the source both surfaces
 * already share.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-conversation-details-panel',
  imports: [DatePipe, NgTemplateOutlet],
  providers: [ConversationDetailsStore],
  templateUrl: './conversation-details-panel.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationDetailsPanel {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InstanceType<typeof ConversationDetailsStore>}
   */
  protected readonly store: InstanceType<typeof ConversationDetailsStore> =
    inject(ConversationDetailsStore);

  /**
   * Property inventory
   * @readonly
   *
   * @description
   * Shared conversation list — the panel reads the open conversation's own
   * row from it rather than re-fetching it.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InstanceType<typeof ConversationInventoryStore>}
   */
  private readonly inventory: InstanceType<typeof ConversationInventoryStore> = inject(
    ConversationInventoryStore,
  );

  /**
   * Property directory
   * @readonly
   *
   * @description
   * Resolves member ids into names — participants and pin authors arrive as
   * bare ids.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationMemberDirectoryStoreType}
   */
  protected readonly directory: OrganizationMemberDirectoryStoreType = inject(
    OrganizationMemberDirectoryStore,
  );

  /**
   * Property env
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {EnvironmentConfig}
   */
  private readonly env: EnvironmentConfig = inject<EnvironmentConfig>(ENV_CONFIG);

  /**
   * Property router
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property organizationContext
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property currentUrl
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  private readonly currentUrl: Signal<string> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((): string => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /**
   * Property activeTab
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<DetailsTab>}
   */
  protected readonly activeTab: WritableSignal<DetailsTab> = signal<DetailsTab>('info');

  /**
   * Property conversation
   * @readonly
   *
   * @description
   * The conversation the URL currently opens, or `null` when the workspace is
   * showing no thread.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<ConversationOutput | null>}
   */
  protected readonly conversation: Signal<ConversationOutput | null> = computed(
    (): ConversationOutput | null => {
      const url: string = this.currentUrl();
      const queryStart: number = url.indexOf('?');
      if (queryStart === -1) return null;

      const id: string | null = new URLSearchParams(url.slice(queryStart + 1)).get('conversation');
      if (id === null) return null;

      return (
        this.inventory
          .conversations()
          .find((candidate: ConversationOutput): boolean => candidate.id === id) ?? null
      );
    },
  );

  /**
   * Property linkedThreads
   * @readonly
   *
   * @description
   * The open conversation's place in the channel hierarchy: its parent first,
   * then its children, each as a row that opens that thread.
   *
   * Read from the inventory the panel already holds — the parent id is on the
   * conversation and the children are the rows pointing back at it, so this
   * costs no request.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<readonly LinkedThreadRow[]>}
   */
  protected readonly linkedThreads: Signal<readonly LinkedThreadRow[]> = computed(
    (): readonly LinkedThreadRow[] => {
      const conversation: ConversationOutput | null = this.conversation();
      if (conversation === null) return [];

      const all: readonly ConversationOutput[] = this.inventory.conversations();
      const parent: ConversationOutput | undefined = conversation.parentConversationId
        ? all.find(
            (candidate: ConversationOutput): boolean =>
              candidate.id === conversation.parentConversationId,
          )
        : undefined;

      const children: readonly ConversationOutput[] = all.filter(
        (candidate: ConversationOutput): boolean =>
          candidate.parentConversationId === conversation.id,
      );

      return [
        ...(parent ? [toLinkedThreadRow(parent, 'parent')] : []),
        ...children.map(
          (child: ConversationOutput): LinkedThreadRow => toLinkedThreadRow(child, 'child'),
        ),
      ];
    },
  );

  /**
   * Property participantRows
   * @readonly
   *
   * @description
   * Participants joined with directory identities, members added by hand
   * first — a team-sourced member is there because of a binding, not a
   * decision about this channel.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly ParticipantRow[]>}
   */
  protected readonly participantRows: Signal<readonly ParticipantRow[]> = computed(
    (): readonly ParticipantRow[] => {
      const identities: ReadonlyMap<string, MemberIdentity> = this.directory.identities();
      const online: ReadonlySet<string> = new Set(this.store.onlineMemberIds());

      return this.store
        .participants()
        .map((participant: ChannelParticipant): ParticipantRow => {
          const identity: MemberIdentity | undefined = identities.get(participant.memberId);

          return {
            memberId: participant.memberId,
            displayName: identity?.displayName ?? participant.memberId,
            initials: identity?.initials ?? '?',
            role: participant.role,
            fromTeam: participant.source === 'team',
            online: online.has(participant.memberId),
          };
        })
        .toSorted((left: ParticipantRow, right: ParticipantRow): number =>
          left.fromTeam === right.fromTeam
            ? left.displayName.localeCompare(right.displayName)
            : Number(left.fromTeam) - Number(right.fromTeam),
        );
    },
  );

  /**
   * Property onlineParticipants
   * @readonly
   *
   * @description
   * Participants the presence read reported online.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly ParticipantRow[]>}
   */
  protected readonly onlineParticipants: Signal<readonly ParticipantRow[]> = computed(
    (): readonly ParticipantRow[] =>
      this.participantRows().filter((row: ParticipantRow): boolean => row.online),
  );

  /**
   * Property offlineParticipants
   * @readonly
   *
   * @description
   * Everyone else — including members whose presence could not be read, since
   * an unknown presence is not a claim that someone is there.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly ParticipantRow[]>}
   */
  protected readonly offlineParticipants: Signal<readonly ParticipantRow[]> = computed(
    (): readonly ParticipantRow[] =>
      this.participantRows().filter((row: ParticipantRow): boolean => !row.online),
  );
  //#endregion

  //#region Lifecycle
  /**
   * Loads the open conversation's details, and the member directory the rows
   * are named from.
   *
   * @since 1.0.0
   */
  public constructor() {
    this.store.load(
      computed(() => {
        const conversation: ConversationOutput | null = this.conversation();

        return {
          conversationId: conversation?.id ?? null,
          isChannel: conversation?.isChannel ?? false,
        };
      }),
    );

    this.directory.load(
      computed((): string | null => this.organizationContext.selectedOrganization()?.id ?? null),
    );

    // Presence is read here rather than reused from the messaging page: that
    // store is page-provided, and this panel lives in the layout injector.
    this.store.loadPresence(
      computed(() => {
        const organizationId: string | undefined =
          this.organizationContext.selectedOrganization()?.id;

        return {
          organization: organizationId ? `/api/organizations/${organizationId}` : '',
          memberIds: organizationId
            ? this.store
                .participants()
                .map((participant: ChannelParticipant): string => participant.memberId)
            : [],
        };
      }),
    );
  }
  //#endregion

  //#region Methods
  /**
   * Method authorName
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MessageOutput} message - The pinned message.
   *
   * @returns {string} The author's display name.
   */
  protected authorName(message: MessageOutput): string {
    // `authorMember` is a member IRI; the directory is keyed by bare id.
    return this.directory.identities().get(toMemberId(message.authorMember))?.displayName ?? '';
  }

  /**
   * Method attachmentUrl
   *
   * @description
   * Absolute URL of an attachment's bytes — a cookie-authenticated plain
   * navigation, so the model carries no URL of its own.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {MessageAttachment} attachment - The file.
   *
   * @returns {string} Download URL.
   */
  protected attachmentUrl(attachment: MessageAttachment): string {
    return `${this.env.apiUrl}/api/messaging-attachments/${attachment.id}/content`;
  }

  /**
   * Method formatSize
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {number} bytes - File size in bytes.
   *
   * @returns {string} A short human size.
   */
  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Method retry
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retry(): void {
    this.store.reload(this.conversation()?.isChannel ?? false);
  }

  /**
   * Method openThread
   *
   * @description
   * Opens a linked thread by swapping the `?conversation=` parameter. The path
   * is left untouched — the panel and the workspace both read that one
   * parameter, so changing it moves both.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {string} conversationId - Thread to open.
   *
   * @returns {void}
   */
  protected openThread(conversationId: string): void {
    void this.router.navigate([], {
      queryParams: { conversation: conversationId },
      queryParamsHandling: 'merge',
    });
  }
  //#endregion
}
