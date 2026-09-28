import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import type { InterventionTableSource } from '@features/organization/features/interventions/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';

/**
 * Component InterventionTableFeedback
 * @description Non-blocking provenance and retry feedback for intervention tables — a refresh
 * failure renders as `hlmAlert variant="destructive"` with its Retry inside `hlmAlertAction`,
 * the same anatomy every other failure in this feature uses. Owns no data access.
 * @since 6.3.0
 */
@Component({
  selector: 'app-intervention-table-feedback',
  imports: [NgIcon, ...HlmAlertImports, HlmButton],
  providers: [provideIcons({ lucideCircleAlert })],
  host: { class: 'contents' },
  templateUrl: './intervention-table-feedback.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionTableFeedback {
  /**
   * Property source
   * @readonly
   * @description Result provenance, independent of the current network indicator.
   * @access public
   * @since 6.2.0
   * @type {InputSignal<InterventionTableSource>}
   */
  public readonly source: InputSignal<InterventionTableSource> =
    input<InterventionTableSource>('api');
  /**
   * Property error
   * @readonly
   * @description Refresh or append failure; the owning table renders initial failures.
   * @access public
   * @since 6.2.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
  /**
   * Property hasResult
   * @readonly
   * @description Whether existing results should remain visible with non-blocking feedback.
   * @access public
   * @since 6.2.0
   * @type {InputSignal<boolean>}
   */
  public readonly hasResult: InputSignal<boolean> = input(false);
  /**
   * Property loading
   * @readonly
   * @description Disables retry while the owning request is running.
   * @access public
   * @since 6.2.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input(false);
  /**
   * Property retryRequested
   * @readonly
   * @description Requests the same criteria or failed page again.
   * @access public
   * @since 6.2.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryRequested: OutputEmitterRef<void> = output<void>();
}
