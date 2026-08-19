/**
 * Interface OrganizationAssistantSettings
 * @interface OrganizationAssistantSettings
 *
 * @description
 * Organization-wide AI-assistant policy: whether it is available, an
 * optional model override (`null` uses the operator-configured default),
 * the sampling temperature, and whether the server pre-injects a bounded
 * business-context block alongside the thread transcript.
 */
export interface OrganizationAssistantSettings {
  //#region Properties
  /** @type {boolean} */
  readonly enabled: boolean;
  /** @type {(string | null)} */
  readonly model: string | null;
  /** @type {number} */
  readonly temperature: number;
  /** @type {boolean} */
  readonly includeBusinessContext: boolean;
  //#endregion
}
