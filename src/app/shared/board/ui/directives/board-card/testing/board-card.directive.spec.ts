import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BoardCardDirective } from '../board-card.directive';

interface Task {
  readonly id: string;
  readonly title: string;
}

const TASK: Task = { id: 't1', title: 'Vérifier extincteur 3' };

/**
 * Mirrors what `Board` does with the directive: capture the projected template,
 * then render it with a context. Asserting on `templateRef` alone would prove
 * the injection compiled, not that the `let-` bindings actually resolve.
 */
@Component({
  template: `
    <ng-template appBoardCard let-item>
      <span data-testid="card">{{ item.title }}</span>
    </ng-template>

    @if (template(); as captured) {
      <ng-container [ngTemplateOutlet]="captured" [ngTemplateOutletContext]="context" />
    }
  `,
  imports: [BoardCardDirective, NgTemplateOutlet],
})
class HostComponent {
  public readonly directive = viewChild(BoardCardDirective);
  public readonly template = computed(() => this.directive()?.templateRef ?? null);
  public readonly context = { $implicit: TASK };
}

describe('BoardCardDirective', () => {
  it('captures the template it marks', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.template()).not.toBeNull();
  });

  it('renders the marked template with the item bound to $implicit', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="card"]')?.textContent).toContain(
      'Vérifier extincteur 3',
    );
  });

  it('narrows the template context', () => {
    // A type-level assertion with a runtime signature: the guard exists so
    // consumers get typed `let-` bindings, and it must never reject.
    expect(BoardCardDirective.ngTemplateContextGuard({} as BoardCardDirective<Task>, {})).toBe(
      true,
    );
  });
});
