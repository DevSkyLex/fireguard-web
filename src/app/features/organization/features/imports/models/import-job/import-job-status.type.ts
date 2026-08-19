/**
 * Type ImportJobStatus
 * @type ImportJobStatus
 *
 * @description
 * Lifecycle of one import job, mirroring the backend
 * `Import\Domain\ValueObject\ImportJobStatus` enum byte for byte.
 * `completed` and `failed` are the only terminal values — `failed` means the
 * whole file could not be processed (see {@link ImportJobOutput.jobError}),
 * never that some rows failed: a real run's per-row failures still reach
 * `completed`.
 *
 * @since 1.0.0
 */
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
