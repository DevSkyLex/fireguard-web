import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import type {
  InterventionChangeOutput,
  InterventionIssueOutput,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { InterventionRequestChangesDrawer } from '@features/organization/features/interventions/ui/drawers';
import type { InterventionRequestChangesFormValues } from '@features/organization/features/interventions/ui/forms';
import { InterventionChangeDiff } from '../intervention-change-diff';
import {
  InterventionReadinessChecklist,
  type InterventionReadinessCheck,
} from '../intervention-readiness-checklist';
import { InterventionSubstepNav, type InterventionSubstep } from '../intervention-substep-nav';
import { InterventionTag } from '../intervention-tag';

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
  imports: [
    ButtonModule,
    CardModule,
    InterventionChangeDiff,
    InterventionReadinessChecklist,
    InterventionRequestChangesDrawer,
    InterventionSubstepNav,
    InterventionTag,
    MessageModule,
  ],
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

  /** Localized validation-findings card subtitle with the issue count. */
  protected readonly findingsDescription: Signal<string> = computed((): string => {
    const count: number = this.issues().length;
    return $localize`:@@intervention.review.findingsDesc:${count}:count: item(s) to resolve before publication`;
  });

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
   * Property canAbandon
   * @readonly
   *
   * @description
   * Whether the intervention may be abandoned from this panel (workflow-legal and
   * permitted for the current user); resolved by the parent page. Gates the
   * destructive "Abandon" affordance.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canAbandon: InputSignal<boolean> = input<boolean>(false);

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
   * Property abandonIntervention
   * @readonly
   *
   * @description
   * Emits when the user asks to abandon the intervention, so the parent page can
   * confirm the destructive action and perform the transition.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly abandonIntervention: OutputEmitterRef<void> = output<void>();

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
   * @type {Signal<readonly InterventionReadinessCheck[]>}
   */
  protected readonly publishChecks: Signal<readonly InterventionReadinessCheck[]> = computed<
    readonly InterventionReadinessCheck[]
  >(() => {
    const intervention: InterventionOutput = this.intervention();

    return [
      {
        label: $localize`:@@intervention.review.checkSubmitted:Submitted for review`,
        done: intervention.status === 'submitted',
      },
      {
        label: $localize`:@@intervention.review.checkNoIssues:No blocking issues`,
        done: (intervention.blockersCount ?? 0) === 0,
      },
      {
        label: $localize`:@@intervention.review.checkOnline:Connected to the network`,
        done: this.online(),
      },
    ];
  });

  /**
   * Property requestChangesDrawerVisible
   * @readonly
   *
   * @description
   * Controls the visibility of the request-changes drawer that captures the
   * reviewer's note before the intervention returns to execution.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly requestChangesDrawerVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property subStep
   * @readonly
   *
   * @description
   * Active review sub-step, switching the content column between the validation
   * findings and the proposed changes without leaving the review phase.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {WritableSignal<'findings' | 'changes'>}
   */
  protected readonly subStep: WritableSignal<'findings' | 'changes'> = signal<
    'findings' | 'changes'
  >('findings');

  /**
   * Property substeps
   * @readonly
   *
   * @description
   * Review sub-step segments; the findings step is marked complete once no
   * validation findings remain to resolve.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<readonly InterventionSubstep[]>}
   */
  protected readonly substeps: Signal<readonly InterventionSubstep[]> = computed<
    readonly InterventionSubstep[]
  >(() => [
    {
      key: 'findings',
      label: $localize`:@@intervention.review.stepFindings:Findings`,
      complete: this.issues().length === 0,
    },
    {
      key: 'changes',
      label: $localize`:@@intervention.review.stepChanges:Changes`,
    },
  ]);

  /**
   * Method confirmRequestChanges
   * @method confirmRequestChanges
   *
   * @description
   * Emits the reviewer's captured note via {@link requestChanges} so the parent
   * page transitions the intervention back to `changes_requested`, then closes
   * the drawer. Replaces the previous fixed, English-only note with the
   * reviewer's own specific feedback.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {InterventionRequestChangesFormValues} values - Captured review note.
   *
   * @return {void}
   */
  protected confirmRequestChanges(values: InterventionRequestChangesFormValues): void {
    this.requestChanges.emit(values.note);
    this.requestChangesDrawerVisible.set(false);
  }
}
