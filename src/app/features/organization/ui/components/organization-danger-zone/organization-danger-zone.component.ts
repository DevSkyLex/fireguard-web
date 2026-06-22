import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import type { OrganizationOutput } from '@features/organization/models';

/**
 * Component OrganizationDangerZone
 * @class OrganizationDangerZone
 *
 * @description
 * Presentational "danger zone" panel grouping irreversible organization actions.
 * Currently exposes organization deletion, emitted through `delete` for the
 * parent page to confirm and perform. The panel owns no store or API access.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-danger-zone',
  imports: [ButtonModule],
  templateUrl: './organization-danger-zone.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDangerZone {
  //#region Properties
  /** Organization targeted by the danger-zone actions. */
  public readonly organization: InputSignal<OrganizationOutput | null> =
    input<OrganizationOutput | null>(null);
  /** Whether a deletion request is in progress. */
  public readonly deleting: InputSignal<boolean> = input<boolean>(false);
  /** Emits when the user requests organization deletion. */
  public readonly delete: OutputEmitterRef<void> = output();
  /** Localized fallback used when the organization name is unavailable. */
  protected readonly thisOrganizationLabel: string = $localize`:@@org.danger.thisOrg:this organization`;
  //#endregion
}
