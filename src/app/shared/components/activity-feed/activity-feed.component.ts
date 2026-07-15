import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  type InputSignal,
  type Signal,
  type TemplateRef,
} from '@angular/core';
import { EmptyState } from '../empty-state';
import { ActivityFeedItemDirective } from './activity-feed-item.directive';
import type { ActivityFeedItem, ActivityFeedItemContext } from './models';

/**
 * Component ActivityFeed
 * @class ActivityFeed
 *
 * @description
 * Generic, domain-agnostic timeline of {@link ActivityFeedItem}s. Renders
 * `event` entries as compact lines and `comment` entries as cards, in the
 * order given. A consumer may override the whole entry rendering by
 * projecting an `[appActivityFeedItem]` template; otherwise the feed falls
 * back to its own built-in rendering.
 *
 * @example ```html
 * <app-activity-feed [items]="activity()" />
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-activity-feed',
  imports: [DatePipe, NgTemplateOutlet, EmptyState],
  templateUrl: './activity-feed.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityFeed {
  //#region Inputs
  /**
   * Property items
   * @readonly
   *
   * @description
   * Entries to render, in display order (typically newest first).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly ActivityFeedItem[]>}
   */
  public readonly items: InputSignal<readonly ActivityFeedItem[]> =
    input.required<readonly ActivityFeedItem[]>();

  /**
   * Property emptyLabel
   * @readonly
   *
   * @description
   * Message shown when {@link items} is empty. Defaults to a localized
   * "No activity yet".
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly emptyLabel: InputSignal<string | undefined> = input<string>();
  //#endregion

  //#region Content template
  /**
   * Property itemDirective
   * @readonly
   *
   * @description
   * Projected `[appActivityFeedItem]` directive instance, read to reach its
   * captured `TemplateRef`.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ActivityFeedItemDirective | undefined>}
   */
  private readonly itemDirective: Signal<ActivityFeedItemDirective | undefined> =
    contentChild(ActivityFeedItemDirective);

  /**
   * Property itemTemplate
   * @readonly
   *
   * @description
   * Entry template overriding the feed's default rendering, when projected.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<ActivityFeedItemContext> | undefined>}
   */
  protected readonly itemTemplate: Signal<TemplateRef<ActivityFeedItemContext> | undefined> =
    computed(() => this.itemDirective()?.templateRef);
  //#endregion

  //#region Properties
  /**
   * Property effectiveEmptyLabel
   * @readonly
   *
   * @description
   * {@link emptyLabel}, falling back to a localized default.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly effectiveEmptyLabel: Signal<string> = computed(
    () => this.emptyLabel() ?? $localize`:@@shared.activityFeed.emptyLabel:No activity yet`,
  );
  //#endregion

  //#region Methods
  /**
   * Method initialsFor
   *
   * @description
   * Derives up to two uppercase initials from a display label, for the
   * default event/comment author avatar when no icon is given.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} label - Display name to derive initials from.
   * @returns {string} The derived initials, or an empty string for a blank label.
   */
  protected initialsFor(label: string): string {
    const parts: string[] = label.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  //#endregion
}
