import { InjectionToken } from '@angular/core';
import type { InteractionCapabilitiesPort } from './interaction-capabilities.interface';

/**
 * Constant INTERACTION_CAPABILITIES_PORT
 * @const INTERACTION_CAPABILITIES_PORT
 * @description Injection token for the core-owned interaction capability contract.
 * @type {InjectionToken<InteractionCapabilitiesPort>}
 */
export const INTERACTION_CAPABILITIES_PORT: InjectionToken<InteractionCapabilitiesPort> =
  new InjectionToken<InteractionCapabilitiesPort>('INTERACTION_CAPABILITIES_PORT');
