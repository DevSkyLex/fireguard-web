import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { BoardColumn } from '../../board';
import { GroupedListHeaderDirective } from '../grouped-list-header.directive';
import { GroupedListRowDirective } from '../grouped-list-row.directive';
import { GroupedList } from '../grouped-list.component';

interface Task {
  readonly id: string;
  readonly title: string;
}

const GROUPS: readonly BoardColumn<Task>[] = [
  { id: 'open', items: [{ id: 't1', title: 'Inspect valve' }] },
  { id: 'closed', items: [{ id: 't2', title: 'Replace hose' }] },
];

@Component({
  imports: [GroupedList, GroupedListHeaderDirective, GroupedListRowDirective],
  template: `
    <app-grouped-list
      [groups]="groups"
      [itemId]="itemId"
      [initiallyCollapsed]="initiallyCollapsed"
      (rowClicked)="clicked.push($event)"
    >
      <ng-template appGroupedListHeader let-group let-count="count"
        >{{ group.id }} custom ({{ count }})</ng-template
      >
      <ng-template appGroupedListRow let-item>{{ item.title }}</ng-template>
    </app-grouped-list>
  `,
})
class GroupedListHost {
  public groups: readonly BoardColumn<Task>[] = GROUPS;
  public readonly itemId = (item: Task): string => item.id;
  public initiallyCollapsed?: (columnId: string) => boolean;
  public readonly clicked: Task[] = [];
}

describe('GroupedList', () => {
  it('renders projected section headers and rows expanded by default', () => {
    const fixture = TestBed.createComponent(GroupedListHost);
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('open custom (1)');
    expect(text).toContain('Inspect valve');
    expect(text).toContain('Replace hose');
  });

  it('starts a section collapsed when initiallyCollapsed says so', () => {
    const fixture = TestBed.createComponent(GroupedListHost);
    fixture.componentInstance.initiallyCollapsed = (id: string): boolean => id === 'closed';
    fixture.detectChanges();

    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Inspect valve');
    expect(text).not.toContain('Replace hose');
  });

  it('toggles a section open/closed on header click', () => {
    const fixture = TestBed.createComponent(GroupedListHost);
    fixture.componentInstance.initiallyCollapsed = (id: string): boolean => id === 'closed';
    fixture.detectChanges();

    const toggles: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('header button');
    toggles[1].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Replace hose');
  });

  it('emits rowClicked when a row is activated', () => {
    const fixture = TestBed.createComponent(GroupedListHost);
    fixture.detectChanges();

    const row: HTMLElement | null = fixture.nativeElement.querySelector('[role="button"]');
    row?.click();

    expect(fixture.componentInstance.clicked).toEqual([GROUPS[0].items[0]]);
  });
});
