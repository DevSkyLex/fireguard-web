import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, inject, Injectable, PLATFORM_ID } from '@angular/core';
import type { FederatedProvider } from '@features/auth/models';
import { resolveReturnUrl } from '@features/auth/utils';

/**
 * Constant RETURN_CONTEXT_KEY
 * @readonly
 * @description Tab-local recovery destination; never contains provider credentials.
 * @since 1.0.0
 * @type {string}
 */
const RETURN_CONTEXT_KEY = 'fireguard.auth.federated-return';

/**
 * Constant RETURN_CONTEXT_MAX_AGE
 * @readonly
 * @description Limits reuse of an abandoned provider flow to thirty minutes.
 * @since 1.0.0
 * @type {number}
 */
const RETURN_CONTEXT_MAX_AGE = 30 * 60 * 1000;

/**
 * Service FederatedReturnContextService
 * @class FederatedReturnContextService
 * @description
 * Keeps a validated return destination across a full-page provider redirect in
 * this browser tab. A callback consumes it into its cleaned URL so retry and
 * reload preserve intent without retaining OAuth code or state. Storage refusal
 * is tolerated; SSR never reads or writes browser storage.
 * @since 1.0.0
 */
@Injectable({ providedIn: 'root' })
export class FederatedReturnContextService {
  /**
   * Property document
   * @readonly
   * @description Browser document providing the tab-local storage boundary.
   * @access private
   * @since 1.0.0
   * @type {Document}
   */
  private readonly document: Document = inject(DOCUMENT);

  /**
   * Property platformId
   * @readonly
   * @description Prevents persistence in server and request-less contexts.
   * @access private
   * @since 1.0.0
   * @type {object}
   */
  private readonly platformId: object = inject(PLATFORM_ID);

  /**
   * Method remember
   * @method remember
   * @description Replaces any previous flow immediately before leaving for the provider.
   * @access public
   * @since 1.0.0
   * @param {FederatedProvider} provider - Provider receiving the browser redirect.
   * @param {string} returnUrl - Local application destination to restore.
   * @returns {void}
   */
  public remember(provider: FederatedProvider, returnUrl: string): void {
    this.clear();
    const destination = this.resolve(returnUrl);
    if (!destination) return;

    try {
      this.storage()?.setItem(
        RETURN_CONTEXT_KEY,
        JSON.stringify({ provider, returnUrl: destination, createdAt: Date.now() }),
      );
    } catch {
      return;
    }
  }

  /**
   * Method consume
   * @method consume
   * @description Reads a matching unexpired destination once, purging invalid and stale records.
   * @access public
   * @since 1.0.0
   * @param {FederatedProvider | null} provider - Callback provider; invalid callbacks cannot reuse intent.
   * @returns {string} Valid destination or an empty string.
   */
  public consume(provider: FederatedProvider | null): string {
    try {
      const raw = this.storage()?.getItem(RETURN_CONTEXT_KEY);
      this.clear();
      if (!raw) return '';
      const context: unknown = JSON.parse(raw);
      if (!context || typeof context !== 'object') return '';
      const record = context as Record<string, unknown>;
      if (
        record['provider'] !== provider ||
        typeof record['returnUrl'] !== 'string' ||
        typeof record['createdAt'] !== 'number' ||
        Date.now() - record['createdAt'] < 0 ||
        Date.now() - record['createdAt'] > RETURN_CONTEXT_MAX_AGE
      ) {
        return '';
      }
      return this.resolve(record['returnUrl']);
    } catch {
      this.clear();
      return '';
    }
  }

  /**
   * Method resolve
   * @method resolve
   * @description Rejects external and authentication callback destinations and strips OAuth query credentials.
   * @access public
   * @since 1.0.0
   * @param {string | null | undefined} returnUrl - Untrusted return context.
   * @returns {string} Sanitized application path or an empty string.
   */
  public resolve(returnUrl: string | null | undefined): string {
    const destination = resolveReturnUrl(returnUrl, '');
    if (!destination) return '';
    try {
      const url = new URL(destination, 'https://fireguard.invalid');
      if (url.origin !== 'https://fireguard.invalid') return '';
      if (url.pathname.startsWith('/auth/federated/')) return '';
      if (url.pathname.startsWith('/account/security/federated/')) return '/account/security';
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return '';
    }
  }

  /**
   * Method clear
   * @method clear
   * @description Purges a consumed flow or a flow abandoned by returning to sign-in or registration.
   * @access public
   * @since 1.0.0
   * @returns {void}
   */
  public clear(): void {
    try {
      this.storage()?.removeItem(RETURN_CONTEXT_KEY);
    } catch {
      return;
    }
  }

  /**
   * Method storage
   * @method storage
   * @description Returns tab-local persistence only in the browser; callers handle blocked storage.
   * @access private
   * @since 1.0.0
   * @returns {Storage | null} Browser session storage or no storage during SSR.
   */
  private storage(): Storage | null {
    return isPlatformBrowser(this.platformId)
      ? (this.document.defaultView?.sessionStorage ?? null)
      : null;
  }
}
