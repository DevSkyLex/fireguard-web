import type { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BoardCardDirective } from '../board-card.directive';
import { BoardColumnHeaderDirective } from '../board-column-header.directive';
import { Board } from '../board.component';
import type { BoardColumn, BoardItemDropped } from '../models';

interface Task {
  readonly id: string;
  readonly title: string;
}

type BoardHarness = Board<Task> & {
  onDropped(event: CdkDragDrop<string>, toColumnId: string): void;
  enterPredicate(drag: CdkDrag<Task>, drop: CdkDropList<string>): boolean;
};

const COLUMNS: readonly BoardColumn<Task>[] = [
  { id: 'todo', items: [{ id: 't1', title: 'Inspect valve' }] },
  { id: 'done', items: [] },
];

@Component({
  imports: [Board, BoardCardDirective, BoardColumnHeaderDirective],
  template: `
    <app-board
      [columns]="columns"
      [itemId]="itemId"
      [canDrop]="canDrop"
      (itemDropped)="dropped.push($event)"
    >
      <ng-template appBoardColumnHeader let-column let-count="count"
        >{{ column.id }} custom ({{ count }})</ng-template
      >
      <ng-template appBoardCard let-item>{{ item.title }}</ng-template>
    </app-board>
  `,
})
class BoardHost {
  public columns: readonly BoardColumn<Task>[] = COLUMNS;
  public readonly itemId = (item: Task): string => item.id;
  public canDrop: (item: Task, fromColumnId: string, toColumnId: string) => boolean = (): boolean =>
    true;
  public readonly dropped: BoardItemDropped<Task>[] = [];
}

describe('Board', () => {
  it('renders the projected column header and card templates', () => {
    const fixture = TestBed.createComponent(BoardHost);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('todo custom (1)');
    expect(text).toContain('Inspect valve');
  });

  it('does not mutate columns and emits itemDropped on a cross-column drop', () => {
    const fixture = TestBed.createComponent(BoardHost);
    fixture.detectChanges();

    const board = fixture.debugElement.children[0].componentInstance as BoardHarness;
    const item: Task = COLUMNS[0].items[0];
    board.onDropped(
      {
        previousContainer: { data: 'todo' },
        item: { data: item },
      } as CdkDragDrop<string>,
      'done',
    );

    expect(fixture.componentInstance.dropped).toEqual([
      { item, fromColumnId: 'todo', toColumnId: 'done' },
    ]);
    expect(COLUMNS[0].items).toEqual([item]);
    expect(COLUMNS[1].items).toEqual([]);
  });

  it('does not emit for a same-column drop', () => {
    const fixture = TestBed.createComponent(BoardHost);
    fixture.detectChanges();

    const board = fixture.debugElement.children[0].componentInstance as BoardHarness;
    board.onDropped(
      {
        previousContainer: { data: 'todo' },
        item: { data: COLUMNS[0].items[0] },
      } as CdkDragDrop<string>,
      'todo',
    );

    expect(fixture.componentInstance.dropped).toEqual([]);
  });

  it('wires the enter predicate to the canDrop input', () => {
    const fixture = TestBed.createComponent(BoardHost);
    const calls: Array<[Task, string, string]> = [];
    fixture.componentInstance.canDrop = (item: Task, from: string, to: string): boolean => {
      calls.push([item, from, to]);
      return false;
    };
    fixture.detectChanges();

    const board = fixture.debugElement.children[0].componentInstance as BoardHarness;
    const item: Task = COLUMNS[0].items[0];
    const allowed: boolean = board.enterPredicate(
      { dropContainer: { data: 'todo' }, data: item } as unknown as CdkDrag<Task>,
      { data: 'done' } as CdkDropList<string>,
    );

    expect(allowed).toBe(false);
    expect(calls).toEqual([[item, 'todo', 'done']]);
  });
});
