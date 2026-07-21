import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import type { OrganizationOutput } from '@features/organization/models';

/**
 * Component OrganizationDangerZone
 * @class OrganizationDangerZone
 *
 * @description
 * Presentational "danger zone" panel grouping the organization-wide lifecycle
 * actions: suspending or bringing back the workspace, and archiving it. Each is
 * emitted for the parent page to confirm and perform — the panel owns no store
 * or API access.
 *
 * @version 2.0.0
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
  /** Whether a suspend / bring-back request is in progress. */
  public readonly changingStatus: InputSignal<boolean> = input<boolean>(false);
  /** Emits when the user requests organization archival. */
  public readonly delete: OutputEmitterRef<void> = output();

  /**
   * Property activeChange
   * @readonly
   *
   * @description
   * Requested activity state: `false` suspends the workspace, `true` brings it
   * back. The backend maps that same flag onto its `suspended` / `active`
   * statuses — there is no separate status field to send.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly activeChange: OutputEmitterRef<boolean> = output<boolean>();

  /** Localized fallback used when the organization name is unavailable. */
  protected readonly thisOrganizationLabel: string = $localize`:@@org.danger.thisOrg:this organization`;

  /**
   * Property isArchived
   * @readonly
   *
   * @description
   * An archived workspace cannot be suspended — the backend rejects it — so
   * the card offers restoration instead of a Suspend button that would fail.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isArchived: Signal<boolean> = computed(
    (): boolean => this.organization()?.status === 'archived',
  );

  /**
   * Property isSuspended
   * @readonly
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isSuspended: Signal<boolean> = computed(
    (): boolean => this.organization()?.status === 'suspended',
  );
  //#endregion
}
