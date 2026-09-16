/**
 * Interface InteractionModeEvidence
 * @interface InteractionModeEvidence
 * @description One browser capability snapshot; dimensions and recent input events are intentionally absent.
 * @since 1.0.0
 */
export interface InteractionModeEvidence {
  /**
   * Property platform
   * @readonly
   * @description Navigator platform, including the MacIntel iPad compatibility value.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly platform?: string;
  /**
   * Property userAgent
   * @readonly
   * @description Legacy platform evidence when client hints are unavailable.
   * @access public
   * @since 1.0.0
   * @type {string | undefined}
   */
  readonly userAgent?: string;
  /**
   * Property maxTouchPoints
   * @readonly
   * @description Maximum simultaneous touch contacts reported by the browser.
   * @access public
   * @since 1.0.0
   * @type {number | undefined}
   */
  readonly maxTouchPoints?: number;
  /**
   * Property anyPointerCoarse
   * @readonly
   * @description One-time coarse-pointer capability, never recent input modality.
   * @access public
   * @since 1.0.0
   * @type {boolean | undefined}
   */
  readonly anyPointerCoarse?: boolean;
  /**
   * Property userAgentData
   * @readonly
   * @description Optional low-entropy client hints; a false mobile hint does not exclude tablets.
   * @access public
   * @since 1.0.0
   * @type {{ readonly platform?: string; readonly mobile?: boolean } | undefined}
   */
  readonly userAgentData?: { readonly platform?: string; readonly mobile?: boolean };
}
