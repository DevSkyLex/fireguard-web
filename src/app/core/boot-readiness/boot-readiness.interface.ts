import type { Signal } from '@angular/core';

/**
 * BootReadinessPort
 * @interface BootReadinessPort
 *
 * @description
 * Core-owned contract describing application boot readiness. Exposes whether
 * the initial app bootstrap (session restoration) has settled, so core
 * infrastructure consumers such as the splash screen can derive boot state
 * without importing the feature that owns session restoration.
 *
 * The concrete implementation is provided by the bootstrap concern that
 * resolves first-load readiness — currently `features/auth` via
 * `provideAuthFeature()` — and bound to `BOOT_READINESS_PORT`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface BootReadinessPort {
  /**
   * Property initialized
   * @readonly
   *
   * @description
   * Emits `true` once the initial application bootstrap has settled.
   *
   * @type {Signal<boolean>}
   */
  readonly initialized: Signal<boolean>;
}
