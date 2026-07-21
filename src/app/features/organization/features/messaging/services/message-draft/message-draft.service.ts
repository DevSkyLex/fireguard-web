import { Injectable } from '@angular/core';

/**
 * A stored draft: the conversation it belongs to and its body.
 *
 * @since 1.0.0
 */
export interface StoredMessageDraft {
  readonly conversationId: string;
  readonly body: string;

  /**
   * When the draft was last written, ISO-8601. Null for an entry stored by an
   * older build, which kept the bare body — the Drafts view renders no time
   * rather than inventing one.
   */
  readonly updatedAt: string | null;
}

/**
 * Storage key prefix. The full key is `fg.msg.draft.<orgId>.<conversationId>`
 * — per organization so the Drafts view of one workspace never lists another
 * workspace's leftovers.
 */
const KEY_PREFIX: string = 'fg.msg.draft';

/**
 * Service MessageDraftService
 * @class MessageDraftService
 *
 * @description
 * Persists half-typed composer drafts in `localStorage`, keyed per
 * organization and conversation, so a draft survives navigation and reloads
 * and the Drafts view can list what is waiting to be sent.
 *
 * Deliberately NOT the interventions outbox: that engine's semantics is
 * deferred replay, and a message auto-sent three hours later is actively
 * harmful. A draft is only ever sent by the member, explicitly.
 *
 * All methods are no-ops when storage is unavailable (SSR, private mode).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MessageDraftService {
  //#region Methods
  /**
   * Method read
   *
   * @description
   * The stored draft body for a conversation, or empty when none.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} conversationId - Conversation the draft belongs to.
   *
   * @returns {string} The draft body, possibly empty.
   */
  public read(organizationId: string, conversationId: string): string {
    const storage: Storage | null = this.storage();
    if (storage === null) return '';

    return this.parse(storage.getItem(this.key(organizationId, conversationId))).body;
  }

  /**
   * Method write
   *
   * @description
   * Stores a draft body, or clears the entry when the body is blank — a
   * cleared composer is not a draft.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} conversationId - Conversation the draft belongs to.
   * @param {string} body - Current composer text.
   *
   * @returns {void}
   */
  public write(organizationId: string, conversationId: string, body: string): void {
    const storage: Storage | null = this.storage();
    if (storage === null) return;

    const key: string = this.key(organizationId, conversationId);

    if (body.trim().length === 0) {
      storage.removeItem(key);
      return;
    }

    // Stored as an envelope so the Drafts view can tell a draft written a
    // minute ago from one left over for a week.
    storage.setItem(key, JSON.stringify({ body, updatedAt: new Date().toISOString() }));
  }

  /**
   * Method clear
   *
   * @description
   * Drops a conversation's draft — called after a successful send or an
   * explicit discard.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} conversationId - Conversation whose draft to drop.
   *
   * @returns {void}
   */
  public clear(organizationId: string, conversationId: string): void {
    this.storage()?.removeItem(this.key(organizationId, conversationId));
  }

  /**
   * Method listForOrganization
   *
   * @description
   * Every stored draft of an organization — the Drafts view's data source.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Owning organization.
   *
   * @returns {readonly StoredMessageDraft[]} Stored drafts, storage order.
   */
  public listForOrganization(organizationId: string): readonly StoredMessageDraft[] {
    const storage: Storage | null = this.storage();
    if (storage === null) return [];

    const prefix: string = `${KEY_PREFIX}.${organizationId}.`;
    const drafts: StoredMessageDraft[] = [];

    for (let index = 0; index < storage.length; index += 1) {
      const key: string | null = storage.key(index);
      if (key === null || !key.startsWith(prefix)) continue;

      const entry: { readonly body: string; readonly updatedAt: string | null } = this.parse(
        storage.getItem(key),
      );
      if (entry.body.trim().length === 0) continue;

      drafts.push({
        conversationId: key.slice(prefix.length),
        body: entry.body,
        updatedAt: entry.updatedAt,
      });
    }

    return drafts;
  }

  /**
   * Method parse
   *
   * @description
   * Reads a stored entry, tolerating the pre-envelope format: builds before
   * 1.1.0 stored the bare body, and those entries must keep working rather
   * than silently reading as an empty draft.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {string | null} raw - The stored value, if any.
   *
   * @returns {{ body: string; updatedAt: string | null }} The draft body and its timestamp.
   */
  private parse(raw: string | null): { readonly body: string; readonly updatedAt: string | null } {
    if (raw === null) return { body: '', updatedAt: null };

    try {
      const parsed: unknown = JSON.parse(raw);

      if (typeof parsed === 'object' && parsed !== null && 'body' in parsed) {
        const entry = parsed as { body?: unknown; updatedAt?: unknown };

        return {
          body: typeof entry.body === 'string' ? entry.body : '',
          updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : null,
        };
      }
    } catch {
      // Not JSON: a legacy bare-body entry.
    }

    return { body: raw, updatedAt: null };
  }

  /**
   * Method key
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} conversationId - Conversation the draft belongs to.
   *
   * @returns {string} Storage key.
   */
  private key(organizationId: string, conversationId: string): string {
    return `${KEY_PREFIX}.${organizationId}.${conversationId}`;
  }

  /**
   * Method storage
   *
   * @description
   * The browser's localStorage, or null where it does not exist (SSR) or
   * refuses access (privacy modes).
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {Storage | null} Usable storage, if any.
   */
  private storage(): Storage | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  }
  //#endregion
}
