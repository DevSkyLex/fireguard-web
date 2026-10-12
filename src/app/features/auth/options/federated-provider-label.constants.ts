import type { FederatedProvider } from '@features/auth/models';

/**
 * Constant FEDERATED_PROVIDER_LABELS
 *
 * @description
 * Localized display names for federated sign-in providers, resolved once here instead of branching on the provider in three separate templates and methods.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Partial<Record<FederatedProvider, string>>>}
 *
 * @const FEDERATED_PROVIDER_LABELS
 */
export const FEDERATED_PROVIDER_LABELS: Readonly<Partial<Record<FederatedProvider, string>>> = {
  google: $localize`:@@auth.federated.google:Google`,
  microsoft: $localize`:@@auth.federated.microsoft:Microsoft`,
};
