/**
 * Type ImportJobKind
 * @type ImportJobKind
 *
 * @description
 * Which resource collection an import job creates rows in, mirroring the
 * backend `Import\Domain\ValueObject\ImportKind` enum byte for byte.
 *
 * @since 1.0.0
 */
export type ImportJobKind = 'equipment' | 'facility' | 'member';
