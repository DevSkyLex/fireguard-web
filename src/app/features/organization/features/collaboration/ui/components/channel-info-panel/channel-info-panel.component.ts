import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import type {
  TabListPassThrough,
  TabPanelsPassThrough,
  TabPassThrough,
  TabsPassThrough,
} from 'primeng/types/tabs';
import type {
  ChannelPanelTab,
  ChannelParticipantOutput,
  ConversationAttachmentOutput,
} from '@features/organization/features/collaboration/models';
import { MemberPresenceService } from '@features/organization/features/collaboration/services';
import { ChannelPanelStore } from '@features/organization/features/collaboration/state';
import { ChannelActivityHeatmap } from '@features/organization/features/collaboration/ui/components/channel-activity-heatmap';
import { MEMBER_DIRECTORY_PORT, type MemberDirectoryPort } from '@features/organization/ports';
import { WorkspaceShellService } from '@layouts/workspace-layout';
import { EmptyState } from '@shared/empty-state';
import { deriveInitials } from '@shared/initials';
import { type TagDescriptor } from '@shared/tag';
import { PANEL_TAB_LIST_PT, PANEL_TAB_PANELS_PT, PANEL_TAB_PT, PANEL_TABS_PT } from './constants';
import { formatFileSize } from './utils';

/**
 * Component ChannelInfoPanel
 * @class ChannelInfoPanel
 *
 * @description
 * The workspace's contextual right panel for a channel: its metadata, nested
 * channels, activity rhythm and members, plus its pinned messages, files and
 * links.
 *
 * Contributed to `PANEL_SLOT`, so the layout instantiates it and it receives no
 * routed input — everything comes from the root-provided
 * {@link ChannelPanelStore}, which reads the routed channel off the router.
 *
 * The panel renders no column chrome of its own: the slot outlet owns the
 * border, background and mobile overlay.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-channel-info-panel />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-channel-info-panel',
  imports: [
    AvatarModule,
    ButtonModule,
    ChannelActivityHeatmap,
    DatePipe,
    EmptyState,
    RouterLink,
    TabsModule,
    TagModule,
  ],
  templateUrl: './channel-info-panel.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelInfoPanel {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Everything the panel renders.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InstanceType<typeof ChannelPanelStore>}
   */
  protected readonly store: InstanceType<typeof ChannelPanelStore> = inject(ChannelPanelStore);

  /**
   * Property shell
   * @readonly
   *
   * @description
   * Shell state, used only to close the panel from its mobile header.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WorkspaceShellService}
   */
  protected readonly shell: WorkspaceShellService = inject(WorkspaceShellService);

  /**
   * Property directory
   * @readonly
   *
   * @description
   * Member lookup, consumed through the port the organization feature
   * publishes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MemberDirectoryPort}
   */
  protected readonly directory: MemberDirectoryPort =
    inject<MemberDirectoryPort>(MEMBER_DIRECTORY_PORT);

  /**
   * Property presence
   * @readonly
   *
   * @description
   * Who is currently around.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {MemberPresenceService}
   */
  protected readonly presence: MemberPresenceService = inject(MemberPresenceService);

  /** @type {TabsPassThrough} */
  protected readonly tabsPt: TabsPassThrough = PANEL_TABS_PT;
  /** @type {TabListPassThrough} */
  protected readonly tabListPt: TabListPassThrough = PANEL_TAB_LIST_PT;
  /** @type {TabPassThrough} */
  protected readonly tabPt: TabPassThrough = PANEL_TAB_PT;
  /** @type {TabPanelsPassThrough} */
  protected readonly tabPanelsPt: TabPanelsPassThrough = PANEL_TAB_PANELS_PT;

  /**
   * Property statusDescriptor
   * @readonly
   *
   * @description
   * The channel's archive state as a tag. Archived is the notable state, so it
   * carries the icon and the warning severity.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TagDescriptor>}
   */
  protected readonly statusDescriptor: Signal<TagDescriptor> = computed((): TagDescriptor => {
    const archived: boolean = this.store.channel()?.isArchived === true;

    return archived
      ? {
          label: $localize`:@@workspace.panel.status.archived:Archived`,
          severity: 'warn',
          icon: 'pi pi-inbox',
        }
      : {
          label: $localize`:@@workspace.panel.status.active:Active`,
          severity: 'success',
          icon: 'pi pi-check-circle',
        };
  });

  /**
   * Property childLinkBase
   * @readonly
   *
   * @description
   * Route prefix nested channels link to, so a click stays inside the shell.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly childLinkBase: Signal<string | null> = computed((): string | null => {
    const organizationId: string | null = this.store.organizationId();

    return organizationId === null ? null : `/organizations/${organizationId}/channels`;
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Warms the member directory for the routed organization.
   *
   * It happens here rather than in the store because the store is
   * root-provided and the port is provided by the workspace route — only a
   * component under the layout can see it.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string | null = this.store.organizationId();

      if (organizationId !== null) {
        this.directory.ensureLoaded(organizationId);
        this.presence.start(organizationId);
      }
    });

    // Presence is poll-only and capped at 100 ids per request, so it is asked
    // for exactly the members currently on screen.
    effect((): void => {
      this.presence.track(
        this.store
          .participants()
          .map((participant: ChannelParticipantOutput): string => participant.memberId),
      );
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method memberName
   * @method memberName
   *
   * @description
   * Best available label for a member reference.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} memberIdOrIri - Bare member UUID or member IRI.
   *
   * @return {string} A never-blank label.
   */
  protected memberName(memberIdOrIri: string): string {
    return this.directory.displayNameFor(memberIdOrIri);
  }

  /**
   * Method onTabChange
   * @method onTabChange
   *
   * @description
   * Relays PrimeNG's loosely-typed tab value to the store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string | number | undefined} value - Value of the newly selected tab.
   *
   * @return {void}
   */
  protected onTabChange(value: string | number | undefined): void {
    if (typeof value !== 'string') return;

    this.store.setTab(value as ChannelPanelTab);
  }

  /**
   * Method participantName
   * @method participantName
   *
   * @description
   * Display name for a participant, falling back to their id when the
   * directory is unavailable.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ChannelParticipantOutput} participant - Participant row.
   *
   * @return {string} A never-blank label.
   */
  protected participantName(participant: ChannelParticipantOutput): string {
    return this.directory.displayNameFor(participant.memberId);
  }

  /**
   * Method participantInitials
   * @method participantInitials
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ChannelParticipantOutput} participant - Participant row.
   *
   * @return {string} Up to two initials.
   */
  protected participantInitials(participant: ChannelParticipantOutput): string {
    return deriveInitials(this.participantName(participant));
  }

  /**
   * Method participantAvatar
   * @method participantAvatar
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ChannelParticipantOutput} participant - Participant row.
   *
   * @return {string | undefined} Avatar URL when the directory knows one.
   */
  protected participantAvatar(participant: ChannelParticipantOutput): string | undefined {
    return this.directory.byId().get(participant.memberId)?.avatarUrl;
  }

  /**
   * Method fileSize
   * @method fileSize
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ConversationAttachmentOutput} file - Attachment row.
   *
   * @return {string} A compact size.
   */
  protected fileSize(file: ConversationAttachmentOutput): string {
    return formatFileSize(file.size);
  }

  /**
   * Method hostname
   * @method hostname
   *
   * @description
   * The link's host, shown under the URL. Falls back to the raw value when the
   * URL cannot be parsed — the server extracts URLs but does not validate them
   * for us.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} url - Extracted URL.
   *
   * @return {string} The host, or the URL itself.
   */
  protected hostname(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
  //#endregion
}
