/**
 * Interface OnboardingStepPresentation
 * @interface OnboardingStepPresentation
 *
 * @description
 * Localized presentation metadata for a single onboarding step, shared by the
 * wizard's vertical rail and the shell setup checklist. Keeps the icon, short
 * title, and one-line subtitle for a {@link OnboardingStepKey} in one place so
 * both surfaces stay in sync.
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
   * One-line subtitle giving the step extra context (e.g. "Your structure").
   *
   * @type {string}
   */
  readonly sublabel: string;
  //#endregion
}
