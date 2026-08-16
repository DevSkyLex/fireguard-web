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
    } = {},
  ): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(Tree<null>);
    fixture.componentRef.setInput('nodes', roots);
    fixture.componentRef.setInput('childrenByParent', overrides.childrenByParent ?? {});
    fixture.componentRef.setInput('loadingIds', overrides.loadingIds ?? new Set());
    fixture.componentRef.setInput('failedIds', overrides.failedIds ?? new Set());
    fixture.componentRef.setInput('selectedId', overrides.selectedId ?? null);
    await fixture.whenStable();
  };

  it('should render every root and expose the tree pattern', async () => {
    await create([node('a', true), node('b')]);

    expect(root().querySelector('[role="tree"]')).not.toBeNull();
    expect(item('a')?.getAttribute('role')).toBe('treeitem');
    expect(item('a')?.getAttribute('aria-level')).toBe('1');
    expect(item('a')?.getAttribute('aria-expanded')).toBe('false');
    expect(item('b')?.getAttribute('aria-expanded')).toBeNull();
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
});
