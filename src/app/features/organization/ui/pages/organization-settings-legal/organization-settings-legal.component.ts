import { ChangeDetectionStrategy, Component, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, type Observable } from 'rxjs';
import type { OptionOutput } from '@core/api/models';
import { OrganizationService } from '@features/organization/data-access';
import type { UpdateOrganizationInput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationSettingsStore } from '@features/organization/state/organization-settings';
import { OrganizationLegalForm } from '@features/organization/ui/forms';

/**
 * Component OrganizationSettingsLegalPage
 * @class OrganizationSettingsLegalPage
 *
 * @description
 * The organization's legal identity, published by the backend since L3.1 and
 * previously unreachable from the app.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-settings-legal',
  imports: [OrganizationLegalForm],
  providers: [OrganizationSettingsStore],
  templateUrl: './organization-settings-legal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSettingsLegalPage {
  //#region Properties
  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  protected readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property store
   * @readonly
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationSettingsStore}
   */
  protected readonly store: OrganizationSettingsStore =
    inject<OrganizationSettingsStore>(OrganizationSettingsStore);

  /**
   * Property legalTypes
   * @readonly
   *
   * @description
   * Legal entity types the API accepts, from
   * `GET /api/organizations/legal-types` — an endpoint whose own description
   * says it exists to feed this tab's select, and which nothing called.
   *
   * Loaded by the page, not the form: a `ui/forms` component owns form state
   * and no API access (ARCHITECTURE §9.4).
   *
   * An empty list on failure rather than a hard-coded fallback: the backend
   * owns this vocabulary, and a local copy would drift silently.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly OptionOutput[]>}
   */
  protected readonly legalTypes: Signal<readonly OptionOutput[]> = toSignal(
    inject(OrganizationService)
      .listLegalTypes()
      .pipe(
        map((collection): readonly OptionOutput[] => collection.member),
        catchError((): Observable<readonly OptionOutput[]> => of([])),
      ),
    { initialValue: [] as readonly OptionOutput[] },
  );
  //#endregion

  //#region Methods
  /**
   * Method save
   *
   * @description
   * Persists the legal profile against the active organization.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {UpdateOrganizationInput} input - The submitted legal fields.
   *
   * @returns {void}
   */
  protected save(input: UpdateOrganizationInput): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;

    if (organizationId) this.store.save({ organizationId, input });
  }
  //#endregion
}
