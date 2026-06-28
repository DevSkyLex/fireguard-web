import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Kanban } from '../kanban.component';
import type { KanbanColumn } from '../models';

/**
 * Host exercising the generic board with a projected card template.
 */
@Component({
  imports: [Kanban],
  template: `
    <app-kanban [columns]="columns" emptyColumnLabel="No cards">
      <ng-template #card let-card>
        <span class="card-name">{{ card.data }}</span>
      </ng-template>
    </app-kanban>
  `,
})
class KanbanHost {
  public columns: readonly KanbanColumn[] = [
    { id: 'a', label: 'Lane A', count: 5, cards: [{ id: 'c1', data: 'Card one' }] },
    { id: 'b', label: 'Lane B', cards: [] },
  ];
}

describe('Kanban', () => {
  function setup(): HTMLElement {
    TestBed.configureTestingModule({ imports: [KanbanHost] });
    const fixture = TestBed.createComponent(KanbanHost);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders one lane per column with its label', () => {
    const host = setup();
    const labels = [...host.querySelectorAll('h3')].map((node) => node.textContent?.trim());

    expect(labels).toEqual(['Lane A', 'Lane B']);
  });

  it('shows the explicit count when provided, otherwise the card count', () => {
    const host = setup();
    const badges = [...host.querySelectorAll('header span')].map((node) =>
      node.textContent?.trim(),
    );

    expect(badges).toEqual(['5', '0']);
  });

  it('projects the card template with the card as context', () => {
    const host = setup();

    expect(host.querySelector('.card-name')?.textContent?.trim()).toBe('Card one');
  });

  it('renders the empty label in a lane with no cards', () => {
    const host = setup();

    expect(host.textContent).toContain('No cards');
  });
});
