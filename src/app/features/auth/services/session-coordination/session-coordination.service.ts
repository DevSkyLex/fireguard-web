import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, DestroyRef, inject, PLATFORM_ID, Service } from '@angular/core';

/**
 * Constant CHANNEL_NAME
 *
 * @description
 * Same-origin channel for credential-free session invalidation.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
const CHANNEL_NAME = 'fireguard-session';
/**
 * Constant STORAGE_KEY
 *
 * @description
 * Fallback browser event key containing only an ephemeral invalidation identity.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
const STORAGE_KEY = 'fireguard-session-invalidation';

/**
 * Service SessionCoordinationService
 *
 * @description
 * Invalidates other same-origin tabs after explicit session changes without sharing credentials.
 */
@Service()
export class SessionCoordinationService {
  /**
   * Property listeners
   * @readonly
   *
   * @description
   * Session owners registered for remote invalidation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Set<() => void>}
   */
  private readonly listeners: Set<() => void> = new Set<() => void>();
  /**
   * Property seen
   * @readonly
   *
   * @description
   * Bounded event identities preventing duplicate channel and storage delivery.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Set<string>}
   */
  private readonly seen: Set<string> = new Set<string>();
  /**
   * Property browserWindow
   * @readonly
   *
   * @description
   * Browser surface, absent during server rendering.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {(Window & typeof globalThis) | null}
   */
  private readonly browserWindow: (Window & typeof globalThis) | null = isPlatformBrowser(
    inject(PLATFORM_ID),
  )
    ? inject(DOCUMENT).defaultView
    : null;
  /**
   * Property channel
   *
   * @description
   * Optional broadcast transport; storage remains a fallback.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {BroadcastChannel | null}
   */
  private channel: BroadcastChannel | null = null;

  /**
   * Constructor
   * @constructor
   *
   * @description
   * Registers browser-only listeners and releases them with the application injector.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    const target = this.browserWindow;
    if (!target) return;
    const receiveStorage = (event: StorageEvent): void => {
      if (event.key !== STORAGE_KEY || !event.newValue || event.newValue.length > 256) return;
      try {
        this.receive(JSON.parse(event.newValue) as unknown);
      } catch {
        // Foreign or malformed storage values are not session events.
      }
    };
    target.addEventListener('storage', receiveStorage);
    try {
      if (typeof target.BroadcastChannel === 'function') {
        this.channel = new target.BroadcastChannel(CHANNEL_NAME);
        this.channel.addEventListener('message', (event: MessageEvent<unknown>): void =>
          this.receive(event.data),
        );
      }
    } catch {
      this.channel = null;
    }
    inject(DestroyRef).onDestroy(() => {
      target.removeEventListener('storage', receiveStorage);
      this.channel?.close();
      this.channel = null;
      this.listeners.clear();
      this.seen.clear();
    });
  }

  /**
   * Method subscribe
   *
   * @description
   * Registers one session owner and returns its cleanup.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {() => void} listener - Local invalidation callback.
   *
   * @returns {() => void} Subscription cleanup.
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Method publish
   *
   * @description
   * Sends only an ephemeral event identity, never a token, profile or user identifier.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public publish(): void {
    const target = this.browserWindow;
    if (!target) return;
    const id =
      typeof target.crypto.randomUUID === 'function'
        ? target.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const event = { type: 'invalidate', id };
    try {
      this.channel?.postMessage(event);
    } catch {
      // A blocked channel can still use the storage transport.
    }
    try {
      target.localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
    } catch {
      // Ownership checks still refuse a changed refresh subject when storage is unavailable.
    }
  }

  /**
   * Method receive
   *
   * @description
   * Accepts bounded invalidation events once across both browser transports.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {unknown} value - Untrusted browser event data.
   *
   * @returns {void}
   */
  private receive(value: unknown): void {
    if (typeof value !== 'object' || value === null) return;
    const event = value as Record<string, unknown>;
    if (event['type'] !== 'invalidate' || typeof event['id'] !== 'string') return;
    const id = event['id'];
    if (!id || id.length > 100 || this.seen.has(id)) return;
    this.seen.add(id);
    if (this.seen.size > 32) {
      const oldest = this.seen.values().next().value;
      if (oldest !== undefined) this.seen.delete(oldest);
    }
    for (const listener of this.listeners) listener();
  }
}
