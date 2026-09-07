import { svglGoogle, svglMicrosoft } from '@ng-icons/svgl';
import type { FederatedProvider } from '@features/auth/models';

/**
 * Constant FEDERATED_PROVIDER_ICONS
 * @const FEDERATED_PROVIDER_ICONS
 * @description SVGL provider logos registered with Ng Icons under their transport names across Auth surfaces.
 * @since 1.0.0
 * @type {Readonly<Record<FederatedProvider, string>>}
 */
export const FEDERATED_PROVIDER_ICONS: Readonly<Record<FederatedProvider, string>> = {
  google: svglGoogle,
  microsoft: svglMicrosoft,
};
