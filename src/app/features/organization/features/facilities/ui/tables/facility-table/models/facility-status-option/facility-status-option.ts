import type { FacilityStatus } from '@features/organization/features/facilities/models';
import type { TagOption } from '@shared/components';

/**
 * Type FacilityStatusOption
 * @typedef FacilityStatusOption
 *
 * @description
 * Display metadata used to render facility status badges consistently in the
 * facility table and its filters — the shared {@link TagOption} generic
 * specialized to the facility status enum (`label`, `severity`, `icon` plus the
 * API `value` sent in list filters).
 *
 * @since 1.0.0
 */
export type FacilityStatusOption = TagOption<FacilityStatus>;
