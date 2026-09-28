import type { FederatedProvider } from '@features/auth/models';

/**
 * Constant FEDERATED_PROVIDER_LABELS
 * @const FEDERATED_PROVIDER_LABELS
 * @description Localized display names for federated sign-in providers, resolved once here instead of branching on the provider in three separate templates and methods.
 * @since 1.0.0
 * @type {Readonly<Record<FederatedProvider, string>>}
 */
export const FEDERATED_PROVIDER_LABELS: Readonly<Record<FederatedProvider, string>> = {
  google: $localize`:@@auth.federated.google:Google`,
  microsoft: $localize`:@@auth.federated.microsoft:Microsoft`,
};
