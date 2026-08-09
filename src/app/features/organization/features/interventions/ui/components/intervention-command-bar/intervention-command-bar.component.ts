import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLock } from '@ng-icons/lucide';
import type {
  InterventionCommandAction,
  InterventionIssueOutput,
} from '@features/organization/features/interventions/models';
import { InterventionCommandButton } from '../intervention-command-button';

/**
 * Component InterventionCommandBar
 * @class InterventionCommandBar
 *
 * @description
 * The forward action pinned to the bottom of the viewport, below `lg` only.
 *
 * It exists because the two-column grid collapses to normal flow under 1024px,
 * which puts the second column — properties card and action box — *after* the
 * whole content flow: on a phone the action a field agent came to take sat
 * roughly three viewports below the comment box. The action box keeps the
 * blocker list and the publication recap at their fixed address; this bar
 * carries only the button and the one line explaining why it is disabled.
 *
 * When a blocker is what disables it, the reason is a button rather than text:
 * the detail the operator needs is in the action box further down, and the bar
 * is the only thing on screen that can point at it.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-command-bar
 *   [action]="commandAction()"
 *   [blockers]="blockerIssues()"
 *   [busy]="store.saving()"
 *   (invoked)="invokeCommandAction()"
 *   (detailsRequested)="revealActionBox()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-command-bar',
  imports: [NgIcon, InterventionCommandButton],
  providers: [provideIcons({ lucideLock })],
  host: {
    class:
      'sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-col gap-1.5 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur md:-mx-6 md:-mb-6 lg:hidden',
    '[class.hidden]': '!action()',
    'data-testid': 'intervention-detail-command-bar',
  },
  templateUrl: './intervention-command-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCommandBar {
  //#region Inputs
  /**
   * Property action
   * @readonly
   * @description The forward action to render, or null when there is nothing to do.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<InterventionCommandAction | null>}
   */
  public readonly action: InputSignal<InterventionCommandAction | null> =
    input<InterventionCommandAction | null>(null);

  /**
   * Property blockers
   * @readonly
   * @description The blocking compliance issues, which turn the reason line into a pointer.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionIssueOutput[]>}
   */
  public readonly blockers: InputSignal<readonly InterventionIssueOutput[]> = input<
    readonly InterventionIssueOutput[]
  >([]);

  /**
   * Property busy
   * @readonly
   * @description Whether a write is already in flight, disabling the action.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly busy: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property invoked
   * @readonly
   * @description The operator activated the forward action.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly invoked: OutputEmitterRef<void> = output<void>();

  /**
   * Property detailsRequested
   * @readonly
   * @description The operator asked to see what is blocking, which lives in the action box.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly detailsRequested: OutputEmitterRef<void> = output<void>();
  //#endregion
}
