/**
 * Interface FacilityPlanCalibration
 * @interface
 *
 * @description
 * Uniform image scale and plan placement in the building's metric X/Z plane.
 */
export interface FacilityPlanCalibration {
  /**
   * Property widthMeters
   *
   * @description
   * Physical width of the entire image, in metres.
   */
  readonly widthMeters: number;

  /**
   * Property rotationDegrees
   *
   * @description
   * Clockwise plan orientation, in degrees.
   */
  readonly rotationDegrees: number;

  /**
   * Property offsetXMeters
   *
   * @description
   * Horizontal origin offset, in metres.
   */
  readonly offsetXMeters: number;

  /**
   * Property offsetZMeters
   *
   * @description
   * Depth origin offset, in metres.
   */
  readonly offsetZMeters: number;
}
