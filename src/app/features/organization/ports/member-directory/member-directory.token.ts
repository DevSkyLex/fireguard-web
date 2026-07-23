import { InjectionToken } from '@angular/core';
import type { MemberDirectoryPort } from './member-directory.interface';

/**
 * Constant MEMBER_DIRECTORY_PORT
 * @const MEMBER_DIRECTORY_PORT
 *
 * @description
 * Injection token for the MemberDirectoryPort.
 * Feature-owned: bound by `features/organization` providers.
 * Consumed by layouts and approved sibling features — collaboration in
 * particular, which receives member ids and no names.
 *
 * @type {InjectionToken<MemberDirectoryPort>}
 */
export const MEMBER_DIRECTORY_PORT: InjectionToken<MemberDirectoryPort> =
  new InjectionToken<MemberDirectoryPort>('MEMBER_DIRECTORY_PORT');
