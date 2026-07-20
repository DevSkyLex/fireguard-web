import { DatePipe } from '@angular/common';
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
  imports: [DatePipe],
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
          };
        })
        .toSorted((left: ParticipantRow, right: ParticipantRow): number =>
          left.fromTeam === right.fromTeam
            ? left.displayName.localeCompare(right.displayName)
            : Number(left.fromTeam) - Number(right.fromTeam),
        );
    },
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
    return this.directory.identities().get(message.authorMember)?.displayName ?? '';
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
  //#endregion
}
