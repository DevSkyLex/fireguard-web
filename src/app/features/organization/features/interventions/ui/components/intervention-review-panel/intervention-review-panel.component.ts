import { JsonPipe } from '@angular/common';
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
import { MessageModule } from 'primeng/message';
import type {
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { Card } from '@shared/components';
import { InterventionTag } from '../intervention-tag';

/**
 * Interface ReviewReadinessCheck
 * @interface ReviewReadinessCheck
 *
 * @description
 * One publication-readiness condition rendered in the review decision
 * checklist, mirroring the preparation panel's "Ready to plan" pattern.
 */
interface ReviewReadinessCheck {
  /** Human-readable condition label. */
  readonly label: string;
  /** Whether the condition is currently satisfied. */
  readonly done: boolean;
}

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
  imports: [ButtonModule, Card, InterventionTag, JsonPipe, MessageModule],
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
  public readonly intervention: InputSignal<InterventionOutput> =
    input.required<InterventionOutput>();

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
  public readonly saving: InputSignal<boolean> = input<boolean>(false);

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
  public readonly online: InputSignal<boolean> = input<boolean>(true);

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
  public readonly canReview: InputSignal<boolean> = input<boolean>(false);

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
  public readonly canPublish: InputSignal<boolean> = input<boolean>(false);

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
   * Property publishChecks
   * @readonly
   *
   * @description
   * The three publication-readiness conditions surfaced in the review decision
   * checklist, mirroring the preparation panel's "Ready to plan" rail: the
   * intervention is awaiting a decision, carries no blockers, and the reviewer
   * is connected (publication is a connected, atomic action).
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly ReviewReadinessCheck[]>}
   */
  protected readonly publishChecks: Signal<readonly ReviewReadinessCheck[]> = computed<
    readonly ReviewReadinessCheck[]
  >(() => {
    const intervention: InterventionOutput = this.intervention();

    return [
      { label: 'Submitted for review', done: intervention.status === 'submitted' },
      { label: 'No blocking issues', done: (intervention.blockersCount ?? 0) === 0 },
      { label: 'Connected to the network', done: this.online() },
    ];
  });

  /**
   * Property readyToPublishCount
   * @readonly
   *
   * @description
   * Number of satisfied publication-readiness conditions, shown as the review
   * decision rail's `N / 3` badge.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<number>}
   */
  protected readonly readyToPublishCount: Signal<number> = computed<number>(
    () => this.publishChecks().filter((check: ReviewReadinessCheck): boolean => check.done).length,
  );

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
