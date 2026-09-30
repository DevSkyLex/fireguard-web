/**
 * Interface PlanViewerOverlayContext
 * @interface PlanViewerOverlayContext
 *
 * @description
 * The template context {@link PlanViewer} exposes to its projected overlay.
 * The overlay renders inside the transformed stage, so it inherits pan and
 * zoom automatically through the DOM; `scale` is exposed only for content
 * that needs to counter-scale itself (e.g. keeping a pin's label a constant
 * on-screen size).
 *
 * @since 1.0.0
 */
export interface PlanViewerOverlayContext {
  /**
   * Property scale
   * @readonly
   *
   * @description
   * Current zoom multiplier for overlays that need to counter-scale their content.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly scale: number;
}
