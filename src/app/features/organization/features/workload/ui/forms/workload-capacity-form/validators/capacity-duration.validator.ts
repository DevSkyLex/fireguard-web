import { schema, validate } from '@angular/forms/signals';
import type { CapacityDurationValues } from '../models/capacity-duration-values.interface';

/**
 * Constant CAPACITY_DURATION_SCHEMA
 *
 * @description
 * Validates explicit whole duration parts, allowing zero but never converting unknown hours to zero.
 *
 * @since 1.0.0
 */
export const CAPACITY_DURATION_SCHEMA = schema<CapacityDurationValues>((path) => {
  validate(path.hours, ({ value }) => {
    if (!value())
      return {
        kind: 'required',
        message: $localize`:@@workload.hoursRequired:Enter the hours, or 0 for a day off.`,
      };
    return /^\d{1,2}$/.test(value()) && Number(value()) <= 24
      ? null
      : {
          kind: 'hours',
          message: $localize`:@@workload.hoursRange:Enter whole hours between 0 and 24.`,
        };
  });
  validate(path.minutes, ({ value, valueOf }) => {
    if (value() && (!/^\d{1,2}$/.test(value()) || Number(value()) > 59)) {
      return {
        kind: 'minutes',
        message: $localize`:@@workload.minutesRange:Enter whole minutes between 0 and 59.`,
      };
    }
    return Number(valueOf(path.hours)) === 24 && Number(value()) > 0
      ? {
          kind: 'duration',
          message: $localize`:@@workload.durationRange:A day cannot exceed 24 hours.`,
        }
      : null;
  });
});
