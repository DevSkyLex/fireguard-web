import { InjectionToken } from '@angular/core';
import type { BootReadinessPort } from './boot-readiness.interface';

/**
 * Constant BOOT_READINESS_PORT
 * @const BOOT_READINESS_PORT
 *
 * @description
 * Injection token for the core-owned application boot readiness contract.
 * Bound by the bootstrap concern that resolves first-load readiness
 * (`features/auth` via `provideAuthFeature()`), consumed by core
 * splash-screen infrastructure.
 *
 * @type {InjectionToken<BootReadinessPort>}
 */
export const BOOT_READINESS_PORT: InjectionToken<BootReadinessPort> =
  new InjectionToken<BootReadinessPort>('BOOT_READINESS_PORT');
