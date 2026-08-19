import type { Signal } from '@angular/core';
import type { OrganizationPermissionName } from '@features/organization/models';
import type { InterventionOutput } from '../intervention/intervention-output.interface';

/**
 * Interface InterventionCapabilityDeps
 * @interface InterventionCapabilityDeps
 *
 * @description
 * The reactive inputs `createInterventionCapabilities` derives from — the
 * signals and accessors the detail page already owns. Passing them as plain
 * values keeps the factory injector-free and unit-testable with bare signals.
 * The caller's identity is no longer among them: every identity-dependent
 * gate now arrives pre-computed on `InterventionOutput.allowedActions`.
 */
export interface InterventionCapabilityDeps {
  /** The current intervention, or null while loading. */
  readonly intervention: Signal<InterventionOutput | null>;
  /** Whether the signed-in member holds the given organization permission. */
  readonly hasPermission: (permission: OrganizationPermissionName) => boolean;
  /** Whether the device can decode a QR code from a camera capture. */
  readonly scanSupported: () => boolean;
}
