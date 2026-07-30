import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  type Signal,
  untracked,
  type WritableSignal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { isCallSuccess } from '@core/request-state';
import type { ConversationOutput } from '@features/organization/features/collaboration/models';
import { DirectConversationsStore } from '@features/organization/features/collaboration/state';
import type { MemberDirectoryEntry } from '@features/organization/models';
import {
  MEMBER_DIRECTORY_PORT,
  type MemberDirectoryPort,
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { deriveInitials } from '@shared/initials';
import type { DirectNavRow } from './models';

/**
 * Component CollaborationDirectNav
 * @class CollaborationDirectNav
 *
 * @description
 * Direct-messages section of the workspace sidebar: the member's 1-to-1
 * conversations, and a picker to start a new one from the organization's
 * member directory.
 *
 * Both the conversation list and the directory are shared, root-provided
 * sources; this component only projects them into rows and starts a
 * conversation. When the directory is unreadable (no `members.read`), names
 * fall back to ids and the picker is hidden — there is nothing honest to pick
 * from.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-collaboration-direct-nav />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collaboration-direct-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './collaboration-direct-nav.component.html',
  host: { class: 'flex flex-col px-2 pb-4' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollaborationDirectNav {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Shared direct-conversations store.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {DirectConversationsStoreType}
   */
  protected readonly store: InstanceType<typeof DirectConversationsStore> =
    inject(DirectConversationsStore);

  /**
   * Property directory
   * @readonly
   *
   * @description
   * Member directory, resolving counterpart IRIs and backing the picker.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {MemberDirectoryPort}
   */
  protected readonly directory: MemberDirectoryPort =
    inject<MemberDirectoryPort>(MEMBER_DIRECTORY_PORT);

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
   * Property router
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /**
   * Property expanded
   *
   * @description
   * Whether the section is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly expanded: WritableSignal<boolean> = signal<boolean>(true);

  /**
   * Property pickerOpen
   *
   * @description
   * Whether the new-message member picker is open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly pickerOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property pickerSearch
   *
   * @description
   * Filter text for the member picker.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string>}
   */
  protected readonly pickerSearch: WritableSignal<string> = signal<string>('');

  /**
   * Property routePrefix
   * @readonly
   *
   * @description
   * Organization-scoped prefix every conversation destination is built from.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  private readonly routePrefix: Signal<string | null> = computed((): string | null => {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();

    return organizationId === null ? null : `/organizations/${organizationId}/direct`;
  });

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Direct conversations as sidebar rows, counterpart resolved through the
   * directory.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly DirectNavRow[]>}
   */
  protected readonly rows: Signal<readonly DirectNavRow[]> = computed(
    (): readonly DirectNavRow[] => {
      const prefix: string | null = this.routePrefix();
      if (!prefix) return [];

      return this.store.rows().map((conversation: ConversationOutput): DirectNavRow => {
        const name: string = conversation.counterpartMember
          ? this.directory.displayNameFor(conversation.counterpartMember)
          : $localize`:@@workspace.direct.unknownMember:Direct message`;

        return {
          id: conversation.id,
          name,
          initials: deriveInitials(name),
          unreadCount: conversation.unreadCount > 0 ? conversation.unreadCount : null,
          link: [prefix, conversation.id],
        };
      });
    },
  );

  /**
   * Property pickerCandidates
   * @readonly
   *
   * @description
   * Active members matching the picker filter, sorted by name.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly MemberDirectoryEntry[]>}
   */
  protected readonly pickerCandidates: Signal<readonly MemberDirectoryEntry[]> = computed(
    (): readonly MemberDirectoryEntry[] => {
      const term: string = this.pickerSearch().trim().toLowerCase();

      return [...this.directory.byId().values()]
        .filter(
          (member: MemberDirectoryEntry): boolean =>
            member.isActive &&
            (term.length === 0 || member.displayName.toLowerCase().includes(term)),
        )
        .toSorted((a: MemberDirectoryEntry, b: MemberDirectoryEntry): number =>
          a.displayName.localeCompare(b.displayName),
        );
    },
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Keeps the shared conversation list and the member directory loaded for the
   * routed organization, and navigates to a conversation the moment it is
   * opened from the picker.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string | null = this.organizationContext.selectedOrganizationId();

      if (organizationId === null) return;

      // `ensureLoaded` reads store state to decide whether to fetch; untracked
      // so this effect depends on the organization alone and never loops on a
      // load transition.
      untracked((): void => {
        this.store.ensureLoaded(organizationId);
        this.directory.ensureLoaded(organizationId);
      });
    });

    let navigatedId: string | null = null;
    effect((): void => {
      const state = this.store.openCallState();

      if (!isCallSuccess(state) || !state.data) return;

      const prefix: string | null = this.routePrefix();
      if (!prefix || state.data.id === navigatedId) return;

      navigatedId = state.data.id;
      this.pickerOpen.set(false);
      this.pickerSearch.set('');
      void this.router.navigate([prefix, state.data.id]);
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method toggle
   * @method toggle
   *
   * @description
   * Opens or closes the section.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected toggle(): void {
    this.expanded.update((expanded: boolean): boolean => !expanded);
  }

  /**
   * Method togglePicker
   * @method togglePicker
   *
   * @description
   * Opens or closes the new-message member picker.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected togglePicker(): void {
    this.pickerOpen.update((open: boolean): boolean => !open);
  }

  /**
   * Method onPickerSearch
   * @method onPickerSearch
   *
   * @description
   * Tracks the picker's filter value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - Input event.
   *
   * @return {void}
   */
  protected onPickerSearch(event: Event): void {
    this.pickerSearch.set((event.target as HTMLInputElement).value);
  }

  /**
   * Method startWith
   * @method startWith
   *
   * @description
   * Opens (or reopens) the direct conversation with a member. Navigation
   * follows once the store reports the conversation open.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} memberId - Bare member UUID of the counterpart.
   *
   * @return {void}
   */
  protected startWith(memberId: string): void {
    const organizationId: string | null = this.organizationContext.selectedOrganizationId();

    if (organizationId === null) return;

    this.store.open({ organization: organizationId, memberId });
  }
  //#endregion
}
