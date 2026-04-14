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
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import type { NotificationOutput } from '@features/account/models';
import { InfiniteScrollDirective } from '@shared/directives';
import { NotificationBellItem } from '../notification-bell-item/notification-bell-item.component';

/**
 * Component NotificationBellList
 * @class NotificationBellList
 *
 * @description
 * Scrollable notification list inside the bell popover.
 * Shows skeleton placeholders while the store is loading, an
 * empty-state illustration when there are no notifications, and
 * the list of {@link NotificationBellItem} rows otherwise.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-notification-bell-list',
  imports: [SkeletonModule, ProgressSpinnerModule, InfiniteScrollDirective, NotificationBellItem],
  templateUrl: './notification-bell-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellList {
  //#region Inputs
  /**
   * Input notifications
   * @readonly
   *
   * @description
   * Read-only array of notifications to render. Passed down from the
   * root bell component which derives it from the signal store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<NotificationOutput>>}
   */
  public readonly notifications: InputSignal<ReadonlyArray<NotificationOutput>> = input<
    ReadonlyArray<NotificationOutput>
  >([]);

  /**
   * Input loading
   * @readonly
   *
   * @description
   * Whether the notification store is currently fetching data.
   * When true, skeleton rows are shown instead of the actual list.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input loadingMore
   * @readonly
   *
   * @description
   * Whether additional notifications are currently being fetched.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loadingMore: InputSignal<boolean> = input<boolean>(false);

  /**
   * Input hasMore
   * @readonly
   *
   * @description
   * Whether more notification pages are available.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly hasMore: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Output markAsRead
   * @readonly
   *
   * @description
   * Emitted with the notification identifier when the user clicks the
   * mark-as-read dot on an individual item. The root component
   * forwards this to the store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly markAsRead: OutputEmitterRef<string> = output<string>();

  /**
   * Output loadMore
   * @readonly
   *
   * @description
   * Emitted when the user scrolls near the bottom of the list.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly loadMore: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property skeletonItems
   * @readonly
   *
   * @description
   * Static array used to repeat skeleton rows while loading.
   * The values themselves are irrelevant — only their count matters.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {readonly number[]}
   */
  protected readonly skeletonItems: readonly number[] = [1, 2, 3, 4, 5] as const;
  //#endregion

  //#region Computed
  /**
   * Computed isEmpty
   * @readonly
   *
   * @description
   * True when loading has finished and the notification list is empty.
   * Used to conditionally display the empty-state illustration.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isEmpty: Signal<boolean> = computed<boolean>(
    () => !this.loading() && this.notifications().length === 0,
  );
  //#endregion
}
