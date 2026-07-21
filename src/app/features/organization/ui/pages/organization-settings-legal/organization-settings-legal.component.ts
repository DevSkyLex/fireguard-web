import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { catchError, map, of, type Observable } from 'rxjs';
import type { OptionOutput } from '@core/api/models';
import { OrganizationService } from '@features/organization/data-access';
import type { UpdateOrganizationInput } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationSettingsStore } from '@features/organization/state/organization-settings';
import { OrganizationLegalForm, type LegalFormCompleteness } from '@features/organization/ui/forms';
import { Tag, type TagDescriptor } from '@shared/components';

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
  imports: [CardModule, OrganizationLegalForm, Tag],
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

  /**
   * Property completeness
   * @readonly
   *
   * @description
   * Latest field-completeness count reported by the legal form, rendered as
   * the section header's completeness tag. `null` until the form's first
   * emission.
   *
   * @access private
   * @since 1.3.0
   *
   * @type {WritableSignal<LegalFormCompleteness | null>}
   */
  private readonly completeness: WritableSignal<LegalFormCompleteness | null> =
    signal<LegalFormCompleteness | null>(null);

  /**
   * Property completenessTag
   * @readonly
   *
   * @description
   * Presentation descriptor for the header completeness tag: a success tag
   * once every legal field is filled, an informational count otherwise.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<TagDescriptor | null>}
   */
  protected readonly completenessTag: Signal<TagDescriptor | null> = computed(
    (): TagDescriptor | null => {
      const completeness: LegalFormCompleteness | null = this.completeness();
      if (completeness === null) return null;

      return completeness.filled === completeness.total
        ? {
            label: $localize`:@@org.legal.complete:Legal profile complete`,
            severity: 'success',
            icon: 'pi pi-check-circle',
          }
        : {
            label: $localize`:@@org.legal.completeness:${completeness.filled}:filled: of ${completeness.total}:total: legal details provided`,
            severity: 'info',
            icon: 'pi pi-info-circle',
          };
    },
  );

  /**
   * Property sectionCardPt
   * @readonly
   *
   * @description
   * Bordered section card styling shared with the sibling settings sections.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly sectionCardPt: CardPassThroughOptions = {
    root: {
      class: 'border border-surface-200 dark:border-surface-800',
    },
  };
  //#endregion

  //#region Methods
  /**
   * Method onCompletenessChange
   *
   * @description
   * Captures the legal form's latest field-completeness count.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {LegalFormCompleteness} completeness - Current field-completeness count.
   * @returns {void}
   */
  protected onCompletenessChange(completeness: LegalFormCompleteness): void {
    this.completeness.set(completeness);
  }

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
