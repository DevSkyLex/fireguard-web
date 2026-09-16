import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type Signal,
} from '@angular/core';

import type {
  PlanningCatalogueKind,
  PlanningCatalogueState,
} from '@features/organization/features/interventions/models';

import { HlmButton } from '@shared/ui/button';

/**
 * Component InterventionCatalogueStatus
 * @class InterventionCatalogueStatus
 * @description Reports actual loaded coverage next to a preparation picker and exposes source-specific retry.
 * @since 1.0.0
 */

@Component({
  selector: 'app-intervention-catalogue-status',
  imports: [HlmButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './intervention-catalogue-status.component.html',
  host: { '[class.hidden]': '!hasFeedback()' },
})
export class InterventionCatalogueStatus {
  /**
   * Property state
   * @readonly
   * @description Request and coverage of this source.
   * @access public
   * @since 1.0.0
   */

  public readonly state = input<PlanningCatalogueState>();

  /**
   * Property kind
   * @readonly
   * @description Source to load on request.
   * @access public
   * @since 1.0.0
   */

  public readonly kind = input.required<PlanningCatalogueKind>();

  /**
   * Property requested
   * @readonly
   * @description Next-page or retry intent owned by the parent page.
   * @access public
   * @since 1.0.0
   */

  public readonly requested = output<PlanningCatalogueKind>();

  /**
   * Property hasFeedback
   * @readonly
   *
   * @description
   * Whether the catalogue has visible loading, error or coverage feedback.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */

  protected readonly hasFeedback: Signal<boolean> = computed<boolean>(() => {
    const catalogue = this.state();

    return (
      catalogue !== undefined &&
      (catalogue.callState.status === 'pending' ||
        catalogue.callState.error !== null ||
        catalogue.loaded < catalogue.total)
    );
  });
}
