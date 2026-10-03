import type { FacilityType } from '../facility/facility-output.interface';

/**
 * Interface FacilityOption
 * @interface FacilityOption
 *
 * @description
 * One facility as a picker offers it: the id to submit, the name to show,
 * and two things that tell two same-named facilities apart — the localized
 * type and the ancestor path — plus the address for the summary line. Built
 * by `toFacilityOption`; no template ever formats a facility on its own.
 *
 * @since 1.0.0
 */
export interface FacilityOption {
  /**
   * Property type
   *
   * @description
   * Raw type used to guide hierarchy choices independently of translated labels.
   */
  readonly type?: FacilityType;

  /**
   * Property value
   *
   * @description
   * The facility id — what a form submits.
   */
  readonly value: string;

  /**
   * Property label
   *
   * @description
   * The facility name — the option's first line.
   */
  readonly label: string;

  /**
   * Property typeLabel
   *
   * @description
   * The localized facility type ("Site", "Building"…).
   */
  readonly typeLabel: string;

  /**
   * Property pathLabel
   *
   * @description
   * The ancestor names joined with " › ", or `null` for a root facility.
   */
  readonly pathLabel: string | null;

  /**
   * Property address
   *
   * @description
   * The postal address, or `null` when none is recorded.
   */
  readonly address: string | null;
}
