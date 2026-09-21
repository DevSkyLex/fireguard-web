import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import {
  FailedMessagesStore,
  type FailedMessagesStoreType,
} from '@features/organization/features/collaboration/state/failed-messages';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component FailedMessagesPage
 * @class FailedMessagesPage
 * @description Lists authorized local failures and returns to the owning conversation's existing retry flow. No draft is transferred through SSR.
 * @version 1.0.0
 */
@Component({
  selector: 'app-failed-messages-page',
  imports: [DatePipe, RouterLink, HlmButton, HlmSkeleton, ...HlmEmptyImports],
  providers: [FailedMessagesStore],
  templateUrl: './failed-messages-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col overflow-y-auto' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FailedMessagesPage {
  /**
   * Property store
   * @readonly
   * @description Local failure query scoped to this page.
   * @access protected
   * @since 1.0.0
   * @type {FailedMessagesStoreType}
   */
  protected readonly store: FailedMessagesStoreType = inject(FailedMessagesStore);
  /**
   * Property context
   * @readonly
   * @description Server-backed selected organization.
   * @access private
   * @since 1.0.0
   * @type {OrganizationContextPort}
   */
  private readonly context: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);
  /**
   * Property identity
   * @readonly
   * @description Current account; any change invalidates displayed drafts.
   * @access private
   * @since 1.0.0
   * @type {UserIdentityPort}
   */
  private readonly identity: UserIdentityPort = inject(USER_IDENTITY_PORT);
  /**
   * Property browserReady
   * @readonly
   * @description Defers local storage and access checks until browser hydration.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  private readonly browserReady: WritableSignal<boolean> = signal(false);
  /**
   * Constructor
   * @constructor
   * @description Reloads on organization/account changes after browser initialization.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    afterNextRender(() => this.browserReady.set(true));
    effect(() => {
      const organizationId = this.context.selectedOrganizationId();
      const owner = this.identity.profile()?.id ?? this.identity.profile()?.sub;
      const ready = this.browserReady();
      untracked(() => this.store.load(ready && owner ? organizationId : null));
    });
  }
  /**
   * Method reload
   * @method reload
   * @description Rechecks server access and local failure state on request.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reload(): void {
    this.store.load(this.context.selectedOrganizationId());
  }
}
