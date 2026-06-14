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
  MissionChangeOutput,
  MissionIssueOutput,
  MissionOutput,
  MissionWorkItemOutput,
} from '@features/organization/features/missions/models';

/**
 * Component MissionReviewPanel
 * @class MissionReviewPanel
 *
 * @description
 * Renders the mission review workflow panel.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-mission-review-panel',
  imports: [ButtonModule, JsonPipe, MessageModule, TagModule],
  templateUrl: './mission-review-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionReviewPanel {
  /**
   * Property mission
   * @readonly
   *
   * @description
   * Provides the mission value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MissionOutput>}
   */
  public readonly mission: InputSignal<MissionOutput> = input.required<MissionOutput>();

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
   * @type {InputSignal<readonly MissionIssueOutput[]>}
   */
  public readonly issues: InputSignal<readonly MissionIssueOutput[]> =
    input.required<readonly MissionIssueOutput[]>();

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
   * @type {InputSignal<readonly MissionChangeOutput[]>}
   */
  public readonly changes: InputSignal<readonly MissionChangeOutput[]> =
    input.required<readonly MissionChangeOutput[]>();

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
   * @type {InputSignal<readonly MissionWorkItemOutput[]>}
   */
  public readonly skippedItems: InputSignal<readonly MissionWorkItemOutput[]> =
    input.required<readonly MissionWorkItemOutput[]>();

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
   * @type {InputSignal<readonly MissionWorkItemOutput[]>}
   */
  public readonly discoveredItems: InputSignal<readonly MissionWorkItemOutput[]> =
    input.required<readonly MissionWorkItemOutput[]>();

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
   * Property publishMission
   * @readonly
   *
   * @description
   * Provides the publish mission value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly publishMission: OutputEmitterRef<void> = output<void>();

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
