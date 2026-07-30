import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  type InputSignal,
} from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import type { MessageOutput } from '@features/organization/features/collaboration/models';
import { SavedMessagesStore } from '@features/organization/features/collaboration/state';
import { MessageRow } from '@features/organization/features/collaboration/ui/components';
import { EmptyState } from '@shared/empty-state';

/**
 * Component SavedMessagesPage
 * @class SavedMessagesPage
 *
 * @description
 * The member's bookmarks across the organization — one of the workspace's
 * system views, alongside a channel conversation.
 *
 * Rows are read-only here apart from unsaving: reacting or pinning from a
 * bookmark list would act on a message whose conversation is not loaded.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-saved-messages />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-saved-messages',
  imports: [EmptyState, MessageRow, SkeletonModule],
  providers: [SavedMessagesStore],
  templateUrl: './saved-messages.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedMessagesPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Routed organization identifier, bound from the URL by
   * `withComponentInputBinding()`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * The bookmark list.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InstanceType<typeof SavedMessagesStore>}
   */
  protected readonly store: InstanceType<typeof SavedMessagesStore> = inject(SavedMessagesStore);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Loads the first page whenever the routed organization changes.
   *
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      // This endpoint is the one place that rejects a bare UUID.
      this.store.load({ organization: `/api/organizations/${this.organizationId()}` });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method authorNameFor
   * @method authorNameFor
   *
   * @description
   * Resolves an author's display label.
   *
   * The name rides on the message itself. Resolving it client-side needs the
   * member directory, which is gated behind `organization.members.read`, so
   * every member without that permission was shown a raw UUID above every
   * message — which is what this used to render for everyone.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {MessageOutput} message - Message whose author is being labelled.
   *
   * @return {string} The author's name, or a neutral label — never an id.
   */
  protected authorNameFor(message: MessageOutput): string {
    return (
      message.authorDisplayName ?? $localize`:@@workspace.message.unknownAuthor:Unknown member`
    );
  }

  /**
   * Method loadMore
   * @method loadMore
   *
   * @description
   * Fetches the next page of bookmarks.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void}
   */
  protected loadMore(): void {
    this.store.load({
      organization: `/api/organizations/${this.organizationId()}`,
      page: this.store.loadedPage() + 1,
    });
  }
  //#endregion
}
