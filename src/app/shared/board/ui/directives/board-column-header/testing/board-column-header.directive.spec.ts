import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { BoardColumn } from '../../../../models';
import { BoardColumnHeaderDirective } from '../board-column-header.directive';

interface Task {
  readonly id: string;
}

const COLUMN: BoardColumn<Task> = { id: 'in_progress', items: [{ id: 't1' }, { id: 't2' }] };

/**
 * The header context carries two aliases beside `$implicit` (`columnId`,
 * `count`), so the useful assertion is that all three reach the template —
 * a consumer writing `let-count="count"` depends on the alias, not on
 * `$implicit.items.length`.
 */
@Component({
  template: `
    <ng-template appBoardColumnHeader let-column let-columnId="columnId" let-count="count">
      <span data-testid="header">{{ columnId }} · {{ count }} · {{ column.items.length }}</span>
    </ng-template>

    @if (template(); as captured) {
      <ng-container [ngTemplateOutlet]="captured" [ngTemplateOutletContext]="context" />
    }
  `,
  imports: [BoardColumnHeaderDirective, NgTemplateOutlet],
})
class HostComponent {
  public readonly directive = viewChild(BoardColumnHeaderDirective);
  public readonly template = computed(() => this.directive()?.templateRef ?? null);
  public readonly context = {
    $implicit: COLUMN,
    columnId: COLUMN.id,
    count: COLUMN.items.length,
  };
}

describe('BoardColumnHeaderDirective', () => {
  it('captures the template it marks', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.template()).not.toBeNull();
  });

  it('binds the column and both of its aliases', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="header"]')?.textContent).toContain(
      'in_progress · 2 · 2',
    );
  });

  it('narrows the template context', () => {
    expect(
      BoardColumnHeaderDirective.ngTemplateContextGuard({} as BoardColumnHeaderDirective<Task>, {}),
    ).toBe(true);
  });
});
