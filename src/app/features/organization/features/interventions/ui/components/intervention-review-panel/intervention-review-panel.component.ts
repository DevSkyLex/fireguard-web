import { JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import type {
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';

/**
 * Component InterventionReviewPanel
 * @class InterventionReviewPanel
 *
 * @description
 * Renders the intervention review workflow panel.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-review-panel',
  imports: [ButtonModule, JsonPipe, MessageModule, TagModule],
  templateUrl: './intervention-review-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionReviewPanel {
  /**
   * Property intervention
   * @readonly
   *
   * @description
   * Provides the intervention value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionOutput>}
   */
  public readonly intervention: InputSignal<InterventionOutput> = input.required<InterventionOutput>();

  /**
   * Property issues
   * @readonly
   *
   * @description
   * Provides the issues value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionIssueOutput[]>}
   */
  public readonly issues: InputSignal<readonly InterventionIssueOutput[]> =
    input.required<readonly InterventionIssueOutput[]>();

  /**
   * Property changes
   * @readonly
   *
   * @description
   * Provides the changes value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionChangeOutput[]>}
   */
  public readonly changes: InputSignal<readonly InterventionChangeOutput[]> =
    input.required<readonly InterventionChangeOutput[]>();

  /**
   * Property skippedItems
   * @readonly
   *
   * @description
   * Provides the skipped items value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly skippedItems: InputSignal<readonly InterventionWorkItemOutput[]> =
    input.required<readonly InterventionWorkItemOutput[]>();

  /**
   * Property discoveredItems
   * @readonly
   *
   * @description
   * Provides the discovered items value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionWorkItemOutput[]>}
   */
  public readonly discoveredItems: InputSignal<readonly InterventionWorkItemOutput[]> =
    input.required<readonly InterventionWorkItemOutput[]>();

  /**
   * Property saving
   * @readonly
   *
   * @description
   * Provides the saving value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly saving: InputSignal<boolean> = input(false);

  /**
   * Property online
   * @readonly
   *
   * @description
   * Provides the online value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly online: InputSignal<boolean> = input(true);

  /**
   * Property canReview
   * @readonly
   *
   * @description
   * Whether the current user may request changes on the intervention.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canReview: InputSignal<boolean> = input(false);

  /**
   * Property canPublish
   * @readonly
   *
   * @description
   * Whether the current user may publish the intervention.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canPublish: InputSignal<boolean> = input(false);

  /**
   * Property publicationMessage
   * @readonly
   *
   * @description
   * Provides the publication message value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly publicationMessage: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property requestChanges
   * @readonly
   *
   * @description
   * Provides the request changes value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly requestChanges: OutputEmitterRef<string> = output<string>();

  /**
   * Property publishIntervention
   * @readonly
   *
   * @description
   * Provides the publish intervention value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly publishIntervention: OutputEmitterRef<void> = output<void>();

  /**
   * Method requestCorrection
   * @method requestCorrection
   *
   * @description
   * Executes the request correction operation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @return {void} Result of the request correction operation.
   */
  protected requestCorrection(): void {
    this.requestChanges.emit('Please resolve the remaining review findings before resubmitting.');
  }
}
