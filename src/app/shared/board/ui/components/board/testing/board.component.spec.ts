import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  Board,
  BoardCardDirective,
  BoardColumnHeaderDirective,
  type BoardColumn,
  type BoardMove,
} from '@shared/board';

/**
 * Type Ticket
 * @type Ticket
 *
 * @description
 * Generic fixture data deliberately carrying no feature model or route.
 *
 * @since 1.0.0
 */
type Ticket = { readonly title: string };

/**
 * Component BoardHost
 * @class BoardHost
 *
 * @description
 * Exercises the public typed card slot and caller-driven column changes.
 *
 * @since 1.0.0
 */
@Component({
  imports: [Board, BoardCardDirective, BoardColumnHeaderDirective],
  template: `
    <app-board
      boardId="tickets"
      [columns]="columns()"
      [canMove]="canMove"
      (moveRequested)="moves.push($event)"
    >
      <ng-template [appBoardColumnHeader]="columns()" let-column>
        <span data-testid="custom-column-heading">{{ column.label }}</span>
      </ng-template>
      <ng-template [appBoardCard]="columns()" let-card let-move="move">
        <a href="#ticket">{{ card.data.title }}</a>
        <button (click)="move('done')">Complete {{ card.data.title }}</button>
      </ng-template>
    </app-board>
    <app-board boardId="other" [columns]="columns()" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class BoardHost {
  public readonly columns = signal<readonly BoardColumn<Ticket>[]>([
    {
      id: 'todo',
      label: 'To do',
      items: [{ id: 'one', label: 'First ticket', data: { title: 'First ticket' } }],
    },
    { id: 'done', label: 'Done', items: [] },
  ]);
  public readonly canMove = (_item: Ticket, target: string): boolean => target === 'done';
  public readonly moves: BoardMove<Ticket>[] = [];
}

describe('Board', () => {
  let fixture: ComponentFixture<BoardHost>;
  let board: Board<Ticket>;
  let root: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(BoardHost);
    await fixture.whenStable();
    const element = fixture.debugElement.query(By.directive(Board));
    board = element.componentInstance as Board<Ticket>;
    root = element.nativeElement as HTMLElement;
  });

  it('renders caller-ordered columns, typed card content, counts and empty states', () => {
    expect(
      Array.from(root.querySelectorAll('[data-column-id]')).map((node) =>
        node.getAttribute('data-column-id'),
      ),
    ).toEqual(['todo', 'done']);
    expect(root.querySelector('a')?.textContent).toBe('First ticket');
    expect(root.querySelector('[data-testid="custom-column-heading"]')?.textContent).toBe('To do');
    expect(root.querySelector('[data-testid="board-column-count"]')?.textContent?.trim()).toBe('1');
    expect(root.querySelector('[data-testid="board-column-empty"]')?.textContent?.trim()).toBe(
      'No items.',
    );
  });

  it('scopes DOM and drop-zone identifiers to each board instance', () => {
    const ids = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[id]')).map(
      (node) => node.id,
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(board['dropListIds']()).toEqual(['tickets-column-todo', 'tickets-column-done']);
  });

  it('emits a typed menu move request without mutating caller data and announces a request', async () => {
    root.querySelector('button')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.moves).toEqual([
      { item: { title: 'First ticket' }, columnId: 'done' },
    ]);
    expect(fixture.componentInstance.columns()[0].items).toHaveLength(1);
    expect(board['liveMessage']()).toContain('Move requested for First ticket to Done');
  });

  it('revalidates a previously rendered callback against the current pending state', async () => {
    const columns = fixture.componentInstance.columns();
    const context = board['cardContext'](columns[0].items[0], columns[0]);
    fixture.componentInstance.columns.set([
      { ...columns[0], items: [{ ...columns[0].items[0], disabled: true }] },
      columns[1],
    ]);
    await fixture.whenStable();
    context.move('done');
    expect(fixture.componentInstance.moves).toEqual([]);
  });

  it('rejects unknown columns and same-column moves', () => {
    const column = fixture.componentInstance.columns()[0];
    const context = board['cardContext'](column.items[0], column);
    context.move('missing');
    context.move('todo');
    expect(fixture.componentInstance.moves).toEqual([]);
  });

  it('disables dragging when there is no legal destination', () => {
    const column = fixture.componentInstance.columns()[1];
    const item = fixture.componentInstance.columns()[0].items[0];
    expect(board['dragDisabled'](item, column)).toBe(true);
    expect(board['dragDisabled'](item, fixture.componentInstance.columns()[0])).toBe(false);
  });

  it('restores focus to the recreated card after the caller moves it to another column', async () => {
    const columns = fixture.componentInstance.columns();
    const item = columns[0].items[0];
    board.moveRequested.subscribe(() =>
      fixture.componentInstance.columns.set([
        { ...columns[0], items: [] },
        { ...columns[1], items: [item] },
      ]),
    );
    root.querySelector('button')?.click();
    await fixture.whenStable();
    expect(document.activeElement).toBe(root.querySelector('[data-column-id="done"] a'));
  });

  it('updates connections when the caller adds a column', async () => {
    fixture.componentInstance.columns.update((columns) => [
      ...columns,
      { id: 'later', label: 'Later', items: [] },
    ]);
    await fixture.whenStable();
    expect(board['dropListIds']()).toContain('tickets-column-later');
    expect(root.querySelectorAll('[data-column-id]')).toHaveLength(3);
  });

  it('shows allowed and forbidden destinations during a drag and clears feedback when it ends', async () => {
    fixture.componentInstance.columns.update((columns) => [
      ...columns,
      { id: 'later', label: 'Later', items: [] },
    ]);
    await fixture.whenStable();
    const drag = fixture.debugElement.query(By.directive(CdkDrag)).injector.get(CdkDrag);
    expect(root.querySelectorAll('[data-testid="board-drop-hint"]')).toHaveLength(0);
    drag.started.emit({ source: drag, event: new MouseEvent('mousedown') });
    await fixture.whenStable();
    expect(root.querySelector('[data-column-id="todo"]')?.getAttribute('data-drop-state')).toBe(
      'source',
    );
    expect(
      root.querySelector('[data-column-id="todo"] [data-testid="board-drop-hint"]'),
    ).toBeNull();
    expect(
      root.querySelector('[data-column-id="done"] [data-testid="board-drop-hint"]')?.textContent,
    ).toContain('Drop here');
    expect(
      root.querySelector('[data-column-id="later"] [data-testid="board-drop-hint"]')?.textContent,
    ).toContain('Cannot move here');
    expect(root.querySelector('[data-testid="board-live-region"]')?.textContent).toContain(
      'Available destinations: Done',
    );
    drag.ended.emit({
      source: drag,
      distance: { x: 0, y: 0 },
      dropPoint: { x: 0, y: 0 },
      event: new MouseEvent('mouseup'),
    });
    await fixture.whenStable();
    expect(root.querySelectorAll('[data-drop-state]')).toHaveLength(0);
    expect(root.querySelectorAll('[data-testid="board-drop-hint"]')).toHaveLength(0);
    expect(fixture.componentInstance.moves).toEqual([]);
  });

  it('updates destination feedback if a dragged card becomes pending', async () => {
    const drag = fixture.debugElement.query(By.directive(CdkDrag)).injector.get(CdkDrag);
    drag.started.emit({ source: drag, event: new MouseEvent('mousedown') });
    await fixture.whenStable();
    fixture.componentInstance.columns.update((columns) => [
      { ...columns[0], items: [{ ...columns[0].items[0], disabled: true }] },
      columns[1],
    ]);
    await fixture.whenStable();
    expect(root.querySelector('[data-column-id="done"]')?.getAttribute('data-drop-state')).toBe(
      'blocked',
    );
  });

  it('does not move to the last accepted column when released outside its bounds', () => {
    const lists = fixture.debugElement.queryAll(By.directive(CdkDropList));
    const source = lists[0].injector.get(CdkDropList);
    const target = lists[1].injector.get(CdkDropList);
    const drag = fixture.debugElement.query(By.directive(CdkDrag)).injector.get(CdkDrag);
    const drop = {
      previousIndex: 0,
      currentIndex: 0,
      item: drag,
      container: target,
      previousContainer: source,
      isPointerOverContainer: false,
      distance: { x: 500, y: 0 },
      dropPoint: { x: 700, y: 50 },
      event: new MouseEvent('mouseup'),
    };
    target.dropped.emit(drop);
    expect(fixture.componentInstance.moves).toEqual([]);
    target.dropped.emit({ ...drop, isPointerOverContainer: true });
    expect(fixture.componentInstance.moves).toEqual([
      { item: { title: 'First ticket' }, columnId: 'done' },
    ]);
  });
});
