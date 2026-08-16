import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
  signal,
  viewChildren,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBan,
  lucideChevronDown,
  lucideChevronRight,
  lucideCornerDownRight,
  lucideGripVertical,
} from '@ng-icons/lucide';
import { HlmButton } from '@shared/ui/button';
import { HlmSpinner } from '@shared/ui/spinner';
import type { TreeDropEvent } from '../../../models/tree-drop-event.interface';
import type { TreeNode } from '../../../models/tree-node.interface';
import type { TreeNodeTemplateContext } from './models/tree-node-template-context.interface';
import { isDescendantOf } from './utils/tree-drop-target/tree-drop-target.utils';
import {
  buildVisibleTreeNodes,
  type VisibleTreeNode,
} from './utils/tree-visible-nodes/tree-visible-nodes.utils';

/** How long a drag must hover a collapsed branch before it auto-expands. */
const DRAG_AUTO_EXPAND_DELAY_MS = 600;

/** Pixels scrolled per edge-hover tick while dragging near the top or bottom. */
const DRAG_EDGE_SCROLL_STEP_PX = 24;

/** How close to a scrollable ancestor's edge a drag must be to trigger auto-scroll. */
const DRAG_EDGE_THRESHOLD_PX = 32;

/**
 * Component Tree
 * @class Tree
 *
 * @description
 * A generic, lazily-expanding tree — a bare-noun shared concept
 * (ARCHITECTURE.md §2.7): no feature import, generic inputs only. It renders
 * a flattened WAI-ARIA tree (`role="tree"`/`treeitem`, `aria-level`, a single
 * roving tab stop) over whatever `TreeNode<T>` roots and per-parent children
 * the host supplies; it never fetches. Expanding a node whose children are
 * not yet in `childrenByParent` emits `expandRequested` so the host can load
 * them — collapsing and re-expanding an already-loaded branch emits nothing.
 * A per-node `nodeTemplate` lets the host project its own icon or badge
 * beside the label; the default rendering is the label alone.
 *
 * Setting `draggable` turns on optional pointer drag-drop re-parenting:
 * dragging a row onto another and releasing emits `nodeDropped` with
 * `position: 'inside'` — there is no sibling reordering, the backend has no
 * ordering to preserve. A drop onto the dragged node itself or onto one of
 * its already-loaded descendants is rejected client-side (a not-allowed cue
 * replaces the drop-target ring) and emits nothing; the consumer still owns
 * the authoritative check server-side. Hovering a collapsed branch for
 * {@link DRAG_AUTO_EXPAND_DELAY_MS} expands it without emitting
 * `expandRequested` again once already loaded.
 *
 * **Accessibility**: HTML5 drag-and-drop is pointer-only by construction —
 * no browser exposes a keyboard equivalent for it. `draggable` is therefore
 * always an *enhancement*, never the only way to re-parent a node; the
 * consumer must keep a keyboard/AT path (a menu action, a dialog) that calls
 * the same move operation. This primitive does not enforce that pairing —
 * it cannot see the consumer's other affordances — so it is a contract the
 * consumer must uphold.
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-tree
 *   [nodes]="roots()"
 *   [childrenByParent]="childrenByParent()"
 *   [loadingIds]="expandingParentIds()"
 *   [failedIds]="failedParentIds()"
 *   [selectedId]="selectedId()"
 *   (expandRequested)="onExpand($event)"
 *   (selected)="onSelect($event)"
 *   (retryRequested)="onExpand($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-tree',
  imports: [NgIcon, NgTemplateOutlet, HlmButton, HlmSpinner],
  providers: [
    provideIcons({
      lucideBan,
      lucideChevronDown,
      lucideChevronRight,
      lucideCornerDownRight,
      lucideGripVertical,
    }),
  ],
  templateUrl: './tree.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tree<T = unknown> {
  //#region Inputs
  /**
   * Property ariaLabel
   * @readonly
   * @description The accessible name announced for the tree as a whole.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly ariaLabel: InputSignal<string> = input.required<string>();

  /**
   * Property nodes
   * @readonly
   * @description The tree's top-level nodes.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly TreeNode<T>[]>}
   */
  public readonly nodes: InputSignal<readonly TreeNode<T>[]> =
    input.required<readonly TreeNode<T>[]>();

  /**
   * Property childrenByParent
   * @readonly
   * @description Already-loaded children, keyed by their parent's id.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<Readonly<Record<string, readonly TreeNode<T>[]>>>}
   */
  public readonly childrenByParent: InputSignal<Readonly<Record<string, readonly TreeNode<T>[]>>> =
    input<Readonly<Record<string, readonly TreeNode<T>[]>>>({});

  /**
   * Property loadingIds
   * @readonly
   * @description Ids of the nodes whose children are being fetched.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly loadingIds: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set(),
  );

  /**
   * Property failedIds
   * @readonly
   * @description Ids of the nodes whose last children fetch failed.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly failedIds: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set(),
  );

  /**
   * Property selectedId
   * @readonly
   * @description The id of the currently selected node, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly selectedId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property nodeTemplate
   * @readonly
   * @description Optional per-node content, replacing the default label-only rendering.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<TemplateRef<TreeNodeTemplateContext<T>> | null>}
   */
  public readonly nodeTemplate: InputSignal<TemplateRef<TreeNodeTemplateContext<T>> | null> =
    input<TemplateRef<TreeNodeTemplateContext<T>> | null>(null);

  /**
   * Property draggable
   * @readonly
   * @description Turns on optional pointer drag-drop re-parenting. See the class doc for the a11y contract.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<boolean>}
   */
  public readonly draggable: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property expandRequested
   * @readonly
   * @description Emitted when a node without loaded children is expanded.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<TreeNode<T>>}
   */
  public readonly expandRequested: OutputEmitterRef<TreeNode<T>> = output<TreeNode<T>>();

  /**
   * Property selected
   * @readonly
   * @description Emitted when a node is selected, by click or by Enter/Space.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<TreeNode<T>>}
   */
  public readonly selected: OutputEmitterRef<TreeNode<T>> = output<TreeNode<T>>();

  /**
   * Property retryRequested
   * @readonly
   * @description Emitted when the host activates a failed node's Retry action.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<TreeNode<T>>}
   */
  public readonly retryRequested: OutputEmitterRef<TreeNode<T>> = output<TreeNode<T>>();

  /**
   * Property nodeDropped
   * @readonly
   * @description Emitted when a drag ends on a valid target, with `draggable` on. See the class doc.
   * @access public
   * @since 1.1.0
   * @type {OutputEmitterRef<TreeDropEvent<T>>}
   */
  public readonly nodeDropped: OutputEmitterRef<TreeDropEvent<T>> = output<TreeDropEvent<T>>();
  //#endregion

  //#region Properties
  /** Resolves the deferred focus move after a keyboard navigation. */
  private readonly injector: Injector = inject(Injector);

  /** The ids currently expanded in the UI. */
  private readonly expandedIds: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set(),
  );

  /** The rendered row elements, in display order, for programmatic focus moves. */
  private readonly itemRefs: Signal<readonly ElementRef<HTMLElement>[]> = viewChildren('treeitem');

  /** The localized announcement for a row whose children are loading. */
  protected readonly loadingLabel: string = $localize`:@@tree.loadingChildren:Loading…`;

  /** The localized label for a collapsed node's disclosure control. */
  protected readonly expandLabel: string = $localize`:@@tree.expand:Expand`;

  /** The localized label for an expanded node's disclosure control. */
  protected readonly collapseLabel: string = $localize`:@@tree.collapse:Collapse`;

  /** The localized label for the valid-drop-target cue. */
  protected readonly dropHereLabel: string = $localize`:@@tree.dropHere:Drop here`;

  /** The localized label for the invalid-drop-target cue. */
  protected readonly dropNotAllowedLabel: string = $localize`:@@tree.dropNotAllowed:Can't drop here`;

  /** The flattened, currently-visible rows the template iterates over. */
  protected readonly visible: Signal<readonly VisibleTreeNode<T>[]> = computed(() =>
    buildVisibleTreeNodes(this.nodes(), this.childrenByParent(), this.expandedIds()),
  );

  /**
   * Property focusedId
   *
   * @description
   * The single row reachable by Tab. It follows the visible rows, keeping
   * the previously focused row whenever it is still visible and falling
   * back to the first row otherwise — e.g. after its branch collapsed.
   *
   * @readonly
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<string | null>}
   */
  protected readonly focusedId: WritableSignal<string | null> = linkedSignal<
    readonly VisibleTreeNode<T>[],
    string | null
  >({
    source: this.visible,
    computation: (rows, previous) => {
      const previousId: string | null = previous?.value ?? null;

      return previousId !== null && rows.some((row) => row.node.id === previousId)
        ? previousId
        : (rows[0]?.node.id ?? null);
    },
  });

  /** The ids currently expanded, read by the template. */
  protected readonly expanded: Signal<ReadonlySet<string>> = this.expandedIds;

  /** The id of the row currently being dragged, or `null` outside a drag. */
  private readonly draggedId: WritableSignal<string | null> = signal<string | null>(null);

  /** The id of the row currently hovered by a drag, or `null`. */
  protected readonly dragOverId: WritableSignal<string | null> = signal<string | null>(null);

  /** The pending auto-expand timer for the row under {@link dragOverId}. */
  private autoExpandTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Property isDragOverValid
   *
   * @description
   * Whether the row under {@link dragOverId} would accept the drag under
   * {@link draggedId}: not the dragged row itself, and not one of its
   * already-loaded descendants (`isDescendantOf`).
   *
   * @readonly
   * @access protected
   * @since 1.1.0
   * @type {Signal<boolean>}
   */
  protected readonly isDragOverValid: Signal<boolean> = computed<boolean>(() => {
    const draggedId: string | null = this.draggedId();
    const overId: string | null = this.dragOverId();

    if (draggedId === null || overId === null || draggedId === overId) return false;

    return !isDescendantOf(draggedId, overId, this.childrenByParent());
  });
  //#endregion

  //#region Methods
  /**
   * Method onItemClick
   * @description Selects the clicked row.
   * @access protected
   * @since 1.0.0
   * @param {TreeNode<T>} node - The clicked node.
   * @returns {void}
   */
  protected onItemClick(node: TreeNode<T>): void {
    this.select(node);
  }

  /**
   * Method onToggleClick
   * @description Toggles a node's expansion without triggering the row's own selection.
   * @access protected
   * @since 1.0.0
   * @param {MouseEvent} event - The disclosure button's click event.
   * @param {TreeNode<T>} node - The node being toggled.
   * @returns {void}
   */
  protected onToggleClick(event: MouseEvent, node: TreeNode<T>): void {
    event.stopPropagation();
    this.toggle(node);
  }

  /**
   * Method onRetryClick
   * @description Requests a retry without triggering the row's own selection.
   * @access protected
   * @since 1.0.0
   * @param {MouseEvent} event - The Retry button's click event.
   * @param {TreeNode<T>} node - The failed node.
   * @returns {void}
   */
  protected onRetryClick(event: MouseEvent, node: TreeNode<T>): void {
    event.stopPropagation();
    this.retryRequested.emit(node);
  }

  /**
   * Method onKeydown
   *
   * @description
   * Implements the WAI-ARIA tree keyboard pattern over the flattened visible
   * rows: Up/Down move the roving tab stop, Right expands or steps into the
   * first child, Left collapses or steps to the parent, Home/End jump to the
   * ends, Enter/Space select.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {KeyboardEvent} event - The row's keydown event.
   * @param {VisibleTreeNode<T>} row - The row that received the key.
   *
   * @returns {void}
   */
  protected onKeydown(event: KeyboardEvent, row: VisibleTreeNode<T>): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveFocus(this.indexOf(row.node.id) + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveFocus(this.indexOf(row.node.id) - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.onArrowRight(row);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.onArrowLeft(row);
        break;
      case 'Home':
        event.preventDefault();
        this.moveFocus(0);
        break;
      case 'End':
        event.preventDefault();
        this.moveFocus(this.visible().length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.select(row.node);
        break;
      default:
        break;
    }
  }

  /**
   * Method select
   * @description Anchors focus on a node and emits it as selected.
   * @access protected
   * @since 1.0.0
   * @param {TreeNode<T>} node - The node being selected.
   * @returns {void}
   */
  protected select(node: TreeNode<T>): void {
    this.focusedId.set(node.id);
    this.selected.emit(node);
  }

  /**
   * Method onDragStart
   * @description Anchors the drag on the row being dragged.
   * @access protected
   * @since 1.1.0
   * @param {DragEvent} event - The native `dragstart` event.
   * @param {TreeNode<T>} node - The row being dragged.
   * @returns {void}
   */
  protected onDragStart(event: DragEvent, node: TreeNode<T>): void {
    this.draggedId.set(node.id);
    event.dataTransfer?.setData('text/plain', node.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  /**
   * Method onDragOver
   *
   * @description
   * Allows the drop (`preventDefault`) so `drop` fires, marks the row
   * hovered, schedules its auto-expand, and scrolls the nearest scrollable
   * ancestor when the pointer is near its top or bottom edge.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {DragEvent} event - The native `dragover` event.
   * @param {TreeNode<T>} node - The row currently under the pointer.
   *
   * @returns {void}
   */
  protected onDragOver(event: DragEvent, node: TreeNode<T>): void {
    if (this.draggedId() === null) return;

    event.preventDefault();

    if (this.dragOverId() !== node.id) {
      this.dragOverId.set(node.id);
      this.scheduleAutoExpand(node);
    }

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = this.isDragOverValid() ? 'move' : 'none';
    }

    this.scrollNearEdge(event);
  }

  /**
   * Method onDragLeave
   * @description Clears the hover state once the pointer truly leaves the row (not into a child element).
   * @access protected
   * @since 1.1.0
   * @param {DragEvent} event - The native `dragleave` event.
   * @param {TreeNode<T>} node - The row being left.
   * @returns {void}
   */
  protected onDragLeave(event: DragEvent, node: TreeNode<T>): void {
    if (this.dragOverId() !== node.id) return;

    const related: Node | null = event.relatedTarget as Node | null;
    const current: HTMLElement = event.currentTarget as HTMLElement;
    if (related && current.contains(related)) return;

    this.dragOverId.set(null);
    this.clearAutoExpand();
  }

  /**
   * Method onDrop
   * @description Emits `nodeDropped` when the drop lands on a valid target.
   * @access protected
   * @since 1.1.0
   * @param {DragEvent} event - The native `drop` event.
   * @param {TreeNode<T>} node - The row the drag was released on.
   * @returns {void}
   */
  protected onDrop(event: DragEvent, node: TreeNode<T>): void {
    event.preventDefault();
    this.clearAutoExpand();
    this.dragOverId.set(null);

    const draggedId: string | null = this.draggedId();
    this.draggedId.set(null);

    if (draggedId === null || draggedId === node.id) return;
    if (isDescendantOf(draggedId, node.id, this.childrenByParent())) return;

    const dragged: TreeNode<T> | null = this.findVisibleNode(draggedId);
    if (!dragged) return;

    this.nodeDropped.emit({ dragged, target: node, position: 'inside' });
  }

  /**
   * Method onDragEnd
   * @description Clears all drag state — reached on drop, cancel (Escape), or a drop outside the tree.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected onDragEnd(): void {
    this.draggedId.set(null);
    this.dragOverId.set(null);
    this.clearAutoExpand();
  }
  //#endregion

  //#region Private methods
  /**
   * Method onArrowRight
   * @description Expands a collapsed branch, or steps into an already-expanded one's first child.
   * @access private
   * @since 1.0.0
   * @param {VisibleTreeNode<T>} row - The focused row.
   * @returns {void}
   */
  private onArrowRight(row: VisibleTreeNode<T>): void {
    if (!row.node.hasChildren) return;

    if (!this.expandedIds().has(row.node.id)) {
      this.expand(row.node);
    } else {
      this.moveFocus(this.indexOf(row.node.id) + 1);
    }
  }

  /**
   * Method onArrowLeft
   * @description Collapses an expanded branch, or steps up to its parent.
   * @access private
   * @since 1.0.0
   * @param {VisibleTreeNode<T>} row - The focused row.
   * @returns {void}
   */
  private onArrowLeft(row: VisibleTreeNode<T>): void {
    if (row.node.hasChildren && this.expandedIds().has(row.node.id)) {
      this.collapse(row.node);
    } else if (row.parentId !== null) {
      this.moveFocus(this.indexOf(row.parentId));
    }
  }

  /**
   * Method toggle
   * @description Expands or collapses a node, depending on its current state.
   * @access private
   * @since 1.0.0
   * @param {TreeNode<T>} node - The node being toggled.
   * @returns {void}
   */
  private toggle(node: TreeNode<T>): void {
    if (this.expandedIds().has(node.id)) {
      this.collapse(node);
    } else {
      this.expand(node);
    }
  }

  /**
   * Method expand
   *
   * @description
   * Marks a node expanded and anchors focus on it. Emits `expandRequested`
   * only when its children have not been loaded yet — an already-loaded
   * branch expands silently.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {TreeNode<T>} node - The node being expanded.
   *
   * @returns {void}
   */
  private expand(node: TreeNode<T>): void {
    const next = new Set(this.expandedIds());
    next.add(node.id);
    this.expandedIds.set(next);
    this.focusedId.set(node.id);

    if (!(node.id in this.childrenByParent())) {
      this.expandRequested.emit(node);
    }
  }

  /**
   * Method collapse
   * @description Marks a node collapsed and anchors focus on it. Emits nothing.
   * @access private
   * @since 1.0.0
   * @param {TreeNode<T>} node - The node being collapsed.
   * @returns {void}
   */
  private collapse(node: TreeNode<T>): void {
    const next = new Set(this.expandedIds());
    next.delete(node.id);
    this.expandedIds.set(next);
    this.focusedId.set(node.id);
  }

  /**
   * Method indexOf
   * @description The visible index of a node, or `-1` when it is not currently shown.
   * @access private
   * @since 1.0.0
   * @param {string} id - The node's id.
   * @returns {number} Its index among the visible rows.
   */
  private indexOf(id: string): number {
    return this.visible().findIndex((row) => row.node.id === id);
  }

  /**
   * Method moveFocus
   * @description Clamps an index to the visible rows, anchors focus on it, and moves real DOM focus there.
   * @access private
   * @since 1.0.0
   * @param {number} index - The requested index, possibly out of bounds.
   * @returns {void}
   */
  private moveFocus(index: number): void {
    const rows: readonly VisibleTreeNode<T>[] = this.visible();
    const clamped: number = Math.max(0, Math.min(index, rows.length - 1));
    const target: VisibleTreeNode<T> | undefined = rows[clamped];
    if (!target) return;

    this.focusedId.set(target.node.id);
    this.focusElement(target.node.id);
  }

  /**
   * Method focusElement
   * @description Moves real DOM focus to a row after Angular has rendered its updated tabindex.
   * @access private
   * @since 1.0.0
   * @param {string} id - The row's node id.
   * @returns {void}
   */
  private focusElement(id: string): void {
    afterNextRender(
      {
        write: (): void => {
          this.itemRefs()
            .find((ref) => ref.nativeElement.dataset['treeId'] === id)
            ?.nativeElement.focus();
        },
      },
      { injector: this.injector },
    );
  }

  /**
   * Method findVisibleNode
   * @description The full node behind an id, among the currently visible rows.
   * @access private
   * @since 1.1.0
   * @param {string} id - The node's id.
   * @returns {TreeNode<T> | null} The node, or `null` if it is not currently rendered.
   */
  private findVisibleNode(id: string): TreeNode<T> | null {
    return this.visible().find((row) => row.node.id === id)?.node ?? null;
  }

  /**
   * Method scheduleAutoExpand
   * @description Arms a timer that expands a collapsed, unhovered-until-now branch after {@link DRAG_AUTO_EXPAND_DELAY_MS}.
   * @access private
   * @since 1.1.0
   * @param {TreeNode<T>} node - The row currently hovered by the drag.
   * @returns {void}
   */
  private scheduleAutoExpand(node: TreeNode<T>): void {
    this.clearAutoExpand();

    if (!node.hasChildren || this.expandedIds().has(node.id)) return;

    this.autoExpandTimer = setTimeout((): void => {
      this.expand(node);
    }, DRAG_AUTO_EXPAND_DELAY_MS);
  }

  /**
   * Method clearAutoExpand
   * @description Cancels a pending auto-expand timer, if any.
   * @access private
   * @since 1.1.0
   * @returns {void}
   */
  private clearAutoExpand(): void {
    if (this.autoExpandTimer === null) return;

    clearTimeout(this.autoExpandTimer);
    this.autoExpandTimer = null;
  }

  /**
   * Method scrollNearEdge
   * @description Scrolls the nearest scrollable ancestor when the drag is within {@link DRAG_EDGE_THRESHOLD_PX} of its top or bottom edge.
   * @access private
   * @since 1.1.0
   * @param {DragEvent} event - The `dragover` event carrying the pointer position.
   * @returns {void}
   */
  private scrollNearEdge(event: DragEvent): void {
    const container: HTMLElement | null = this.findScrollableAncestor(
      event.currentTarget as HTMLElement | null,
    );
    if (!container) return;

    const rect: DOMRect = container.getBoundingClientRect();

    if (event.clientY - rect.top < DRAG_EDGE_THRESHOLD_PX) {
      container.scrollBy({ top: -DRAG_EDGE_SCROLL_STEP_PX });
    } else if (rect.bottom - event.clientY < DRAG_EDGE_THRESHOLD_PX) {
      container.scrollBy({ top: DRAG_EDGE_SCROLL_STEP_PX });
    }
  }

  /**
   * Method findScrollableAncestor
   * @description Walks up from an element to the nearest ancestor that actually overflows and scrolls vertically.
   * @access private
   * @since 1.1.0
   * @param {HTMLElement | null} element - The element to walk up from.
   * @returns {HTMLElement | null} The scrollable ancestor, or `null` if none is found.
   */
  private findScrollableAncestor(element: HTMLElement | null): HTMLElement | null {
    let current: HTMLElement | null = element?.parentElement ?? null;

    while (current) {
      const overflowY: string = getComputedStyle(current).overflowY;
      if (/(auto|scroll)/.test(overflowY) && current.scrollHeight > current.clientHeight) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }
  //#endregion
}
