import { svglGoogle, svglMicrosoft } from '@ng-icons/svgl';
import type { FederatedProvider } from '@features/auth/models';

/**
 * Constant FEDERATED_PROVIDER_ICONS
 *
 * @description
 * SVGL provider logos registered with Ng Icons under their transport names across Auth surfaces.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Partial<Record<FederatedProvider, string>>>}
 *
 * @const FEDERATED_PROVIDER_ICONS
 */
export const FEDERATED_PROVIDER_ICONS = {
  google: svglGoogle,
  microsoft: svglMicrosoft,
} as const;

/**
 * Function federatedProviderIcon
 *
 * @description
 * Retains known provider logos and a neutral icon for additional configured providers.
 *
 * @param {FederatedProvider} provider - Current provider.
 *
 * @returns {string} Result of the current operation.
 */
export function federatedProviderIcon(provider: FederatedProvider): string {
  return Object.hasOwn(FEDERATED_PROVIDER_ICONS, provider) ? provider : 'lucideGlobe';
}
