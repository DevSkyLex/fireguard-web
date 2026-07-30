/**
 * Severity vocabulary shared by every enum/status indicator rendered through
 * the shared {@link Tag} component. Mirrors the PrimeNG `p-tag` severity
 * contract so feature registries can resolve a single semantic colour role
 * instead of hard-coded hex values.
 */
export type TagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';
