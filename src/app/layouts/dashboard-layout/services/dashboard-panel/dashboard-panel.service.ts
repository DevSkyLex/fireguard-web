import {
  computed,
  inject,
  Injectable,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { ShellPanelPort } from '@core/shell-panel';
import { PANEL_SLOT, type PanelContribution } from '@layouts/dashboard-layout/slots/panel';

/**
 * Service DashboardPanelService
 * @class DashboardPanelService
 *
 * @description
 * Owns which contextual right-hand panels are registered and which are open,
 * and implements {@link ShellPanelPort} so routed pages can drive the shell
 * without importing `@layouts`.
 *
 * The registered list is read once — a multi-provider array is immutable per
 * injector — while `panels` filters it reactively on each contribution's
 * `available` signal. That split is the whole design: registration is static,
 * visibility is not.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable()
export class DashboardPanelService implements ShellPanelPort {
  //#region Properties
  /**
   * Property registered
   * @readonly
   *
   * @description
   * Every contribution, sorted by `order`. Resolved once at construction.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {readonly PanelContribution[]}
   */
  private readonly registered: readonly PanelContribution[] = (
    inject(PANEL_SLOT, { optional: true }) ?? []
  ).toSorted((a: PanelContribution, b: PanelContribution): number => a.order - b.order);

  /**
   * Property openIds
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly string[]>}
   */
  private readonly openIds: WritableSignal<readonly string[]> = signal<readonly string[]>([]);

  /**
   * Property panels
   * @readonly
   *
   * @description
   * The contributions that currently apply, in order.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<readonly PanelContribution[]>}
   */
  public readonly panels: Signal<readonly PanelContribution[]> = computed(
    (): readonly PanelContribution[] =>
      this.registered.filter(
        (contribution: PanelContribution): boolean => contribution.available?.() ?? true,
      ),
  );

  /**
   * Property openPanelIds
   * @readonly
   *
   * @description
   * Open panels, pruned of any that stopped being available while open.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  public readonly openPanelIds: Signal<readonly string[]> = computed((): readonly string[] => {
    const available: ReadonlySet<string> = new Set(
      this.panels().map((contribution: PanelContribution): string => contribution.id),
    );

    return this.openIds().filter((id: string): boolean => available.has(id));
  });

  /**
   * Property openPanels
   * @readonly
   *
   * @description
   * The contributions to render, in registration order.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<readonly PanelContribution[]>}
   */
  public readonly openPanels: Signal<readonly PanelContribution[]> = computed(
    (): readonly PanelContribution[] => {
      const open: readonly string[] = this.openPanelIds();

      return this.panels().filter((contribution: PanelContribution): boolean =>
        open.includes(contribution.id),
      );
    },
  );
  //#endregion

  //#region Methods
  /**
   * Method open.
   *
   * @since 1.0.0
   *
   * @param {string} panelId the panel identifier
   *
   * @returns {void}
   */
  public open(panelId: string): void {
    if (this.openIds().includes(panelId)) return;

    const exists: boolean = this.panels().some(
      (contribution: PanelContribution): boolean => contribution.id === panelId,
    );
    if (!exists) return;

    this.openIds.update((ids: readonly string[]): readonly string[] => [...ids, panelId]);
  }

  /**
   * Method close.
   *
   * @since 1.0.0
   *
   * @param {string} [panelId] the panel identifier; every panel when omitted
   *
   * @returns {void}
   */
  public close(panelId?: string): void {
    if (panelId === undefined) {
      this.openIds.set([]);

      return;
    }

    this.openIds.update((ids: readonly string[]): readonly string[] =>
      ids.filter((id: string): boolean => id !== panelId),
    );
  }

  /**
   * Method toggle.
   *
   * @since 1.0.0
   *
   * @param {string} panelId the panel identifier
   *
   * @returns {void}
   */
  public toggle(panelId: string): void {
    if (this.openIds().includes(panelId)) {
      this.close(panelId);

      return;
    }

    this.open(panelId);
  }
  //#endregion
}
