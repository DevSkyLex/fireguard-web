/**
 * Interface ScreenEquipmentMarker
 * @interface ScreenEquipmentMarker
 *
 * @description
 * An actual equipment anchor projected into viewport pixels.
 */
export interface ScreenEquipmentMarker {
  /**
   * Property equipmentId
   *
   * @description
   * Equipment resource identifier.
   */
  readonly equipmentId: string;

  /**
   * Property label
   *
   * @description
   * Localized equipment title.
   */
  readonly label: string;

  /**
   * Property status
   *
   * @description
   * Localized business status.
   */
  readonly status: string;

  /**
   * Property icon
   *
   * @description
   * Equipment catalog icon.
   */
  readonly icon: string;

  /**
   * Property x
   *
   * @description
   * Horizontal viewport coordinate in pixels.
   */
  readonly x: number;

  /**
   * Property y
   *
   * @description
   * Vertical viewport coordinate in pixels.
   */
  readonly y: number;
}
