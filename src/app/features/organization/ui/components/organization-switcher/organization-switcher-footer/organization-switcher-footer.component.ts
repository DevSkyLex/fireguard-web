import { ChangeDetectionStrategy, Component, output, type OutputEmitterRef } from '@angular/core';
import { RippleModule } from 'primeng/ripple';

/**
 * Component OrganizationSwitcherFooter
 * @class OrganizationSwitcherFooter
 *
 * @description
 * Footer of the organization selector popover.
 * Provides a "Create workspace" action button.
 * Emits {@link createOrganization} when clicked so the parent can
 * handle navigation without coupling this component to the router.
 *
 * @since 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-switcher-footer',
  imports: [RippleModule],
  templateUrl: './organization-switcher-footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSwitcherFooter {
  //#region Outputs
  /**
   * Output createOrganization
   * @readonly
   *
   * @description
   * Emitted when the user clicks the "Create workspace" button.
   * The parent component handles the actual navigation.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly createOrganization: OutputEmitterRef<void> = output<void>();
  //#endregion
}
