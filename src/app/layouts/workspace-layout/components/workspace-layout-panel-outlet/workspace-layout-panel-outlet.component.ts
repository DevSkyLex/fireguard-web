import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { PANEL_SLOT, type PanelContribution } from '@layouts/workspace-layout/slots/panel';

/**
 * Component WorkspaceLayoutPanelOutlet
 * @class WorkspaceLayoutPanelOutlet
 *
 * @description
 * Mono-active slot host for the workspace right-hand panel. Resolves the
 * highest-priority contribution whose `active` signal is currently `true` and
 * renders its component class dynamically via `NgComponentOutlet`.
 *
 * The component owns the panel frame (column, border, scroll containment, and
 * the mobile full-screen overlay) but has no knowledge of what it renders.
 * Content ownership stays with the contributing feature, registered through:
 * ```typescript
 * provideWorkspaceLayoutSlots({ panel: [withCollaborationInfoPanel()] })
 * ```
 *
 * Each contribution declares its own desktop `widthClass` — the source
 * prototype's four panels are 330/344/360/340px wide, so no shared width is
 * imposed here.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-workspace-layout-panel-outlet />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-workspace-layout-panel-outlet',
  imports: [NgComponentOutlet],
  templateUrl: './workspace-layout-panel-outlet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceLayoutPanelOutlet {
  //#region Properties
  /**
   * Property contributions
   * @readonly
   *
   * @description
   * All registered panel contributions, injected as a multi-provider array.
   * Optional: defaults to an empty array when no feature has registered one.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {PanelContribution[]}
   */
  private readonly contributions: PanelContribution[] =
    inject<PanelContribution[]>(PANEL_SLOT, { optional: true }) ?? [];

  /**
   * Property activePanel
   * @readonly
   *
   * @description
   * The highest-priority contribution currently claiming the slot, or `null`
   * when none is active.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<PanelContribution | null>}
   */
  protected readonly activePanel: Signal<PanelContribution | null> = computed(
    (): PanelContribution | null =>
      this.contributions
        .toSorted((a: PanelContribution, b: PanelContribution): number => b.priority - a.priority)
        .find((contribution: PanelContribution): boolean => contribution.active()) ?? null,
  );
  //#endregion
}
