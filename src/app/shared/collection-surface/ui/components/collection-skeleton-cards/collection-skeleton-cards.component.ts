import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';

/**
 * Component CollectionSkeletonCards
 * @class CollectionSkeletonCards
 * @description Shared mobile collection placeholder using the installed Spartan item and skeleton
 * primitives. It renders structure only; the parent announces request state and owns the real data.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collection-skeleton-cards',
  imports: [...HlmItemImports, HlmSkeleton],
  templateUrl: './collection-skeleton-cards.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionSkeletonCards {
  /**
   * Property rows
   * @readonly
   * @description Number of placeholder items to render during the initial collection request.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<number>}
   */
  public readonly rows: InputSignal<number> = input<number>(5);

  /**
   * Property rowIndexes
   * @readonly
   * @description Trackable indexes derived from the requested placeholder count.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly number[]>}
   */
  protected readonly rowIndexes: Signal<readonly number[]> = computed<readonly number[]>(() =>
    Array.from({ length: this.rows() }, (_value: unknown, index: number): number => index),
  );
}
