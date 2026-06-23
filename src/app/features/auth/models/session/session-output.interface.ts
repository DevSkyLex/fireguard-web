import type { HydraItem } from '@core/api/models';

/**
 * Interface SessionOutput
 * @interface SessionOutput
 *
 * @description
 * User session information.
 * Returned by GET /api/sessions endpoints.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * const session: SessionOutput = {
 *   '@id': '/api/sessions/550e8400-e29b-41d4-a716-446655440000',
 *   '@type': 'Session',
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   userId: '0c1b3f6a-8c2e-4f5d-9c0a-2c2b7b9f1c7a',
 *   ipAddress: '203.0.113.5',
 *   userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
 *   deviceType: 'desktop',
 *   browser: 'Chrome',
 *   createdAt: '2026-01-29T10:15:30+00:00',
 *   lastActivityAt: '2026-01-29T12:01:00+00:00',
 *   isActive: true,
 *   isCurrent: true
 * };
 * ```
 */
export interface SessionOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Session unique identifier (UUID v4).
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property userId
   * @readonly
   *
   * @description
   * User identifier (UUID v4) owning the session.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly userId: string;

  /**
   * Property ipAddress
   * @readonly
   *
   * @description
   * Client IP address for the session.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly ipAddress: string;

  /**
   * Property userAgent
   * @readonly
   *
   * @description
   * Client user agent string for device/browser detection.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly userAgent: string;

  /**
   * Property deviceType
   * @readonly
   *
   * @description
   * Detected device type (desktop, mobile, tablet).
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly deviceType?: string | null;

  /**
   * Property browser
   * @readonly
   *
   * @description
   * Detected browser name (Chrome, Firefox, Safari, etc.).
   *
   * @since 1.0.0
   *
   * @type {string | null | undefined}
   */
  readonly browser?: string | null;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * ISO 8601 datetime when the session was created.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property lastActivityAt
   * @readonly
   *
   * @description
   * ISO 8601 datetime of the last activity on this session.
   *
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly lastActivityAt: string;

  /**
   * Property isActive
   * @readonly
   *
   * @description
   * Whether the session is currently active (not revoked or expired).
   *
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly isActive: boolean;

  /**
   * Property isCurrent
   * @readonly
   *
   * @description
   * Whether this session is the current one making the request.
   *
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly isCurrent: boolean;
}
