import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { TreeNode } from '../../../../models/tree-node.interface';
import { Tree } from '../tree.component';

const node = (id: string, hasChildren = false): TreeNode<null> => ({
  id,
  label: id,
  hasChildren,
  data: null,
});

describe('Tree', () => {
  let fixture: ComponentFixture<Tree<null>>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const item = (id: string): HTMLElement | null =>
    root().querySelector<HTMLElement>(`[data-tree-id="${id}"]`);

  const press = async (id: string, key: string): Promise<void> => {
    item(id)?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    await fixture.whenStable();
  };

  const create = async (
    roots: readonly TreeNode<null>[],
    overrides: {
      childrenByParent?: Readonly<Record<string, readonly TreeNode<null>[]>>;
      loadingIds?: ReadonlySet<string>;
      failedIds?: ReadonlySet<string>;
      selectedId?: string | null;
      draggable?: boolean;
    } = {},
  ): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(Tree<null>);
    fixture.componentRef.setInput('ariaLabel', 'Test tree');
    fixture.componentRef.setInput('nodes', roots);
    fixture.componentRef.setInput('childrenByParent', overrides.childrenByParent ?? {});
    fixture.componentRef.setInput('loadingIds', overrides.loadingIds ?? new Set());
    fixture.componentRef.setInput('failedIds', overrides.failedIds ?? new Set());
    fixture.componentRef.setInput('selectedId', overrides.selectedId ?? null);
    fixture.componentRef.setInput('draggable', overrides.draggable ?? false);
    await fixture.whenStable();
  };

  const dragEventOn = (id: string, type: string): DragEvent => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'currentTarget', { value: item(id), configurable: true });
    Object.defineProperty(event, 'dataTransfer', { value: null, configurable: true });
    Object.defineProperty(event, 'clientY', { value: 0, configurable: true });
    Object.defineProperty(event, 'relatedTarget', { value: null, configurable: true });
    return event as unknown as DragEvent;
  };

  const drag = async (fromId: string, toId: string): Promise<void> => {
    item(fromId)?.dispatchEvent(dragEventOn(fromId, 'dragstart'));
    item(toId)?.dispatchEvent(dragEventOn(toId, 'dragover'));
    item(toId)?.dispatchEvent(dragEventOn(toId, 'drop'));
    await fixture.whenStable();
  };

  it('should render every root and expose the tree pattern', async () => {
    await create([node('a', true), node('b')]);

    expect(root().querySelector('[role="tree"]')).not.toBeNull();
    expect(root().querySelector('[role="tree"]')?.getAttribute('aria-label')).toBe('Test tree');
    expect(item('a')?.getAttribute('role')).toBe('treeitem');
    expect(item('a')?.getAttribute('aria-level')).toBe('1');
    expect(item('a')?.getAttribute('aria-expanded')).toBe('false');
    expect(item('b')?.getAttribute('aria-expanded')).toBeNull();
  });

  it('should expose each row position with aria-setsize and aria-posinset', async () => {
    await create([node('a', true), node('b')], { childrenByParent: { a: [node('a1')] } });

    await press('a', 'ArrowRight');

    expect(item('a')?.getAttribute('aria-setsize')).toBe('2');
    expect(item('a')?.getAttribute('aria-posinset')).toBe('1');
    expect(item('b')?.getAttribute('aria-setsize')).toBe('2');
    expect(item('b')?.getAttribute('aria-posinset')).toBe('2');
    expect(item('a1')?.getAttribute('aria-setsize')).toBe('1');
    expect(item('a1')?.getAttribute('aria-posinset')).toBe('1');
  });

  it('should keep a single tab stop and move it with the arrow keys', async () => {
    await create([node('a'), node('b'), node('c')]);

    const focusable = (): readonly string[] =>
      Array.from(root().querySelectorAll('[data-tree-id][tabindex="0"]')).map(
        (el) => el.getAttribute('data-tree-id') ?? '',
      );

    expect(focusable()).toEqual(['a']);

    await press('a', 'ArrowDown');
    expect(focusable()).toEqual(['b']);

    await press('b', 'ArrowDown');
    expect(focusable()).toEqual(['c']);

    await press('c', 'ArrowUp');
    expect(focusable()).toEqual(['b']);

    await press('b', 'Home');
    expect(focusable()).toEqual(['a']);

    await press('a', 'End');
    expect(focusable()).toEqual(['c']);
  });

  it('should emit expandRequested only when a node without loaded children is expanded', async () => {
    await create([node('a', true)]);
    const emitted: TreeNode<null>[] = [];
    fixture.componentInstance.expandRequested.subscribe((n: TreeNode<null>) => emitted.push(n));

    await press('a', 'ArrowRight');

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.id).toBe('a');
    expect(item('a')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('should not re-emit expandRequested when collapsing and re-expanding an already-loaded branch', async () => {
    await create([node('a', true)], { childrenByParent: { a: [node('a1')] } });
    const emitted: TreeNode<null>[] = [];
    fixture.componentInstance.expandRequested.subscribe((n: TreeNode<null>) => emitted.push(n));

    await press('a', 'ArrowRight');
    expect(item('a1')).not.toBeNull();
    expect(emitted).toHaveLength(0);

    await press('a', 'ArrowLeft');
    expect(item('a1')).toBeNull();

    await press('a', 'ArrowRight');
    expect(item('a1')).not.toBeNull();
    expect(emitted).toHaveLength(0);
  });

  it('should step into the first child on ArrowRight when already expanded, and up to the parent on ArrowLeft', async () => {
    await create([node('a', true)], { childrenByParent: { a: [node('a1')] } });

    await press('a', 'ArrowRight');

    const focusable = (): readonly string[] =>
      Array.from(root().querySelectorAll('[data-tree-id][tabindex="0"]')).map(
        (el) => el.getAttribute('data-tree-id') ?? '',
      );

    await press('a', 'ArrowRight');
    expect(focusable()).toEqual(['a1']);

    await press('a1', 'ArrowLeft');
    expect(focusable()).toEqual(['a']);
  });

  it('should select a node on click and on Enter/Space', async () => {
    await create([node('a'), node('b')]);
    const emitted: TreeNode<null>[] = [];
    fixture.componentInstance.selected.subscribe((n: TreeNode<null>) => emitted.push(n));

    item('a')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    await press('a', 'Enter');
    await press('a', ' ');

    expect(emitted.map((n) => n.id)).toEqual(['a', 'a', 'a']);
  });

  it('should render a loading state on a node the host reports as expanding', async () => {
    await create([node('a', true)], { loadingIds: new Set(['a']) });

    expect(item('a')?.getAttribute('aria-busy')).toBe('true');
    expect(root().querySelector('hlm-spinner')).not.toBeNull();
  });

  it('should render a failed row with a Retry action that emits retryRequested', async () => {
    await create([node('a', true)], { failedIds: new Set(['a']) });
    const emitted: TreeNode<null>[] = [];
    fixture.componentInstance.retryRequested.subscribe((n: TreeNode<null>) => emitted.push(n));

    const alert = root().querySelector<HTMLElement>('[role="alert"]');
    expect(alert).not.toBeNull();

    const retry = root().querySelector<HTMLButtonElement>('[data-testid="tree-retry"]');
    expect(retry).not.toBeNull();

    retry?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.id).toBe('a');
  });

  it('should mark the selected node with aria-selected', async () => {
    await create([node('a'), node('b')], { selectedId: 'b' });

    expect(item('a')?.getAttribute('aria-selected')).toBe('false');
    expect(item('b')?.getAttribute('aria-selected')).toBe('true');
  });

  describe('drag-drop', () => {
    it('should render no draggable rows when draggable() is false', async () => {
      await create([node('a'), node('b')]);

      expect(item('a')?.getAttribute('draggable')).toBeNull();
    });

    it('should render draggable rows when draggable() is true', async () => {
      await create([node('a'), node('b')], { draggable: true });

      expect(item('a')?.getAttribute('draggable')).toBe('true');
    });

    it('should emit nodeDropped with the dragged node, the target and position "inside" on a valid drop', async () => {
      await create([node('a'), node('b')], { draggable: true });
      const emitted: Array<{
        dragged: TreeNode<null>;
        target: TreeNode<null>;
        position: 'inside';
      }> = [];
      fixture.componentInstance.nodeDropped.subscribe((e) => emitted.push(e));

      await drag('a', 'b');

      expect(emitted).toHaveLength(1);
      expect(emitted[0]?.dragged.id).toBe('a');
      expect(emitted[0]?.target.id).toBe('b');
      expect(emitted[0]?.position).toBe('inside');
    });

    it('should not emit when dropping a node onto itself', async () => {
      await create([node('a'), node('b')], { draggable: true });
      const emitted: unknown[] = [];
      fixture.componentInstance.nodeDropped.subscribe((e) => emitted.push(e));

      await drag('a', 'a');

      expect(emitted).toHaveLength(0);
    });

    it('should not emit and should show the not-allowed cue when dropping onto an already-loaded descendant', async () => {
      await create([node('a', true)], {
        childrenByParent: { a: [node('a1')] },
        draggable: true,
      });
      await press('a', 'ArrowRight');
      const emitted: unknown[] = [];
      fixture.componentInstance.nodeDropped.subscribe((e) => emitted.push(e));

      item('a')?.dispatchEvent(dragEventOn('a', 'dragstart'));
      item('a1')?.dispatchEvent(dragEventOn('a1', 'dragover'));
      await fixture.whenStable();

      expect(item('a1')?.getAttribute('data-drag-over')).toBe('invalid');

      item('a1')?.dispatchEvent(dragEventOn('a1', 'drop'));
      await fixture.whenStable();

      expect(emitted).toHaveLength(0);
    });

    it('should mark a valid hovered row with the valid drop cue', async () => {
      await create([node('a'), node('b')], { draggable: true });

      item('a')?.dispatchEvent(dragEventOn('a', 'dragstart'));
      item('b')?.dispatchEvent(dragEventOn('b', 'dragover'));
      await fixture.whenStable();

      expect(item('b')?.getAttribute('data-drag-over')).toBe('valid');
    });

    it('should auto-expand a collapsed branch hovered long enough, without re-emitting on an already-loaded one', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      try {
        await create([node('a', true), node('b', true)], {
          childrenByParent: { b: [node('b1')] },
          draggable: true,
        });
        const emitted: TreeNode<null>[] = [];
        fixture.componentInstance.expandRequested.subscribe((n) => emitted.push(n));

        item('a')?.dispatchEvent(dragEventOn('a', 'dragstart'));
        item('b')?.dispatchEvent(dragEventOn('b', 'dragover'));
        await vi.advanceTimersByTimeAsync(600);
        await fixture.whenStable();

        expect(item('b')?.getAttribute('aria-expanded')).toBe('true');
        expect(item('b1')).not.toBeNull();
        expect(emitted).toHaveLength(0);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should clear drag state on dragend', async () => {
      await create([node('a'), node('b')], { draggable: true });

      item('a')?.dispatchEvent(dragEventOn('a', 'dragstart'));
      item('b')?.dispatchEvent(dragEventOn('b', 'dragover'));
      await fixture.whenStable();
      expect(item('b')?.getAttribute('data-drag-over')).toBe('valid');

      item('a')?.dispatchEvent(dragEventOn('a', 'dragend'));
      await fixture.whenStable();

      expect(item('b')?.getAttribute('data-drag-over')).toBeNull();
    });
  });
});
