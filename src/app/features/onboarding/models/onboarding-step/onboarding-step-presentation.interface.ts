/**
 * Interface OnboardingStepPresentation
 * @interface OnboardingStepPresentation
 *
 * @description
 * Localized presentation metadata for a single onboarding step, shared by the
 * wizard's vertical rail, the wizard content heading, and the shell setup
 * checklist. Keeps the icon, short title, compact rail subtitle, and the longer
 * content-heading description for a {@link OnboardingStepKey} in one place so
 * every surface stays in sync.
 */
export interface OnboardingStepPresentation {
  //#region Properties
  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcons class (without the leading `pi pi-`) representing the step.
   *
   * @type {string}
   */
  readonly icon: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Short, human-readable step title (e.g. "Create organization").
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property sublabel
   * @readonly
   *
   * @description
   * Compact one-line subtitle used by the wizard rail and the shell checklist
   * (e.g. "Your structure").
   *
   * @type {string}
   */
  readonly sublabel: string;

  /**
   * Property description
   * @readonly
   *
   * @description
   * Longer, action-oriented sentence rendered under the step title in the wizard
   * content heading (e.g. "Set up the basic information for your fire safety
   * company."). Richer than {@link OnboardingStepPresentation.sublabel}, which
   * stays compact for the rail.
   *
   * @type {string}
   */
  readonly description: string;
  //#endregion
}
