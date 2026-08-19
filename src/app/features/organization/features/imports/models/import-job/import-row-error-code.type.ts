/**
 * Type ImportRowErrorCode
 * @type ImportRowErrorCode
 *
 * @description
 * Why one CSV row is reported, mirroring the backend
 * `Import\Domain\ValueObject\ImportRowErrorCode` enum byte for byte.
 * `would_create` is the one positive code: it appears only in a dry run,
 * on a row that validated and would have been created, and must never
 * render as a failure.
 *
 * @since 1.0.0
 */
export type ImportRowErrorCode = 'quota_exceeded' | 'invalid' | 'missing_required' | 'would_create';
