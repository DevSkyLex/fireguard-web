import { InjectionToken } from '@angular/core';
import type { MemberPresencePort } from './member-presence.interface';

/**
 * Constant MEMBER_PRESENCE_PORT
 * @description Organization-owned presence contract for account and collaboration consumers.
 * @since 1.0.0
 * @type {InjectionToken<MemberPresencePort>}
 */
export const MEMBER_PRESENCE_PORT = new InjectionToken<MemberPresencePort>('MEMBER_PRESENCE_PORT');
