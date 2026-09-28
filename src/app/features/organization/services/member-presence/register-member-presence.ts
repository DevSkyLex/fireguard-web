import { DestroyRef, effect, inject, untracked, type Signal } from '@angular/core';
import type { PresenceStatus } from '@features/organization/models';
import { MEMBER_PRESENCE_PORT, ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';

/**
 * Function registerMemberPresence
 * @description Registers the members rendered by a page or slot root. It rereads the selected organization
 * even when ids stay unchanged, releases its own registration on destruction, and returns presentation data.
 * Call in an injection context; presentational children receive the returned map as an input.
 * @access public
 * @since 1.0.0
 * @param {() => readonly string[]} members - Reactive member references currently displayed by the owner.
 * @returns {Signal<Readonly<Record<string, PresenceStatus>>>} Shared fresh status map.
 */
export function registerMemberPresence(
  members: () => readonly string[],
): Signal<Readonly<Record<string, PresenceStatus>>> {
  const presence = inject(MEMBER_PRESENCE_PORT);
  const context = inject(ORGANIZATION_CONTEXT_PORT);
  const owner = {};
  effect(() => {
    context.selectedOrganizationId();
    const memberIds = members();
    untracked(() => presence.register(owner, memberIds));
  });
  inject(DestroyRef).onDestroy(() => presence.unregister(owner));
  return presence.byId;
}
