import { Component, provideZonelessChangeDetection, signal, viewChild } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FacilityPlanItemList } from '../facility-plan-item-list.component';
import type { PlanItemListOption } from '../models';

interface Row {
  readonly status: string;
}

const ITEMS: ReadonlyArray<PlanItemListOption<Row>> = [
  { id: 'row-1', label: 'Server room', data: { status: 'active' } },
  { id: 'row-2', label: 'Storage', data: { status: 'archived' } },
  { id: 'row-3', label: 'Break room', data: { status: 'active' } },
];

/** Hosts `FacilityPlanItemList` with a decorator `ng-template` — content projection needs a real host, not `TestBed.createComponent` on the list itself. */
@Component({
  selector: 'app-host',
  imports: [FacilityPlanItemList],
  template: `
    <app-facility-plan-item-list
      [items]="items()"
      [selectedId]="selectedId()"
      listLabel="Zones"
      emptyMessage="No zones yet."
      (itemActivated)="activated.push($event)"
    >
      <ng-template let-row>
        <span class="status">{{ row.status }}</span>
      </ng-template>
    </app-facility-plan-item-list>
  `,
})
class HostComponent {
  public readonly items = signal<ReadonlyArray<PlanItemListOption<Row>>>(ITEMS);
  public readonly selectedId = signal<string | null>(null);
  public readonly activated: string[] = [];
  public readonly list = viewChild.required(FacilityPlanItemList);
}

describe('FacilityPlanItemList', () => {
  let fixture: ComponentFixture<HostComponent>;

  function options(): readonly HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button[role="option"]'));
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  it('renders exactly one option per item, projecting the decorator content beside each one', () => {
    const rendered = options();

    expect(rendered).toHaveLength(3);
    expect(rendered[0].textContent).toContain('Server room');
    expect(rendered[0].querySelector('.status')?.textContent).toBe('active');
    expect(rendered[1].querySelector('.status')?.textContent).toBe('archived');
  });

  it('carries the caller-supplied accessible name and empty message', () => {
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;

    expect(listbox.getAttribute('aria-label')).toBe('Zones');
  });

  it('marks the selected row aria-selected and starts the roving tabindex there', async () => {
    fixture.componentInstance.selectedId.set('row-2');
    await fixture.whenStable();

    const rendered = options();
    expect(rendered[1].getAttribute('aria-selected')).toBe('true');
    expect(rendered[1].getAttribute('tabindex')).toBe('0');
    expect(rendered[0].getAttribute('tabindex')).toBe('-1');
    expect(rendered[2].getAttribute('tabindex')).toBe('-1');
  });

  it('moves the roving tabindex forward on ArrowDown without emitting a selection', () => {
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;

    listbox.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, bubbles: true }),
    );
    fixture.detectChanges();

    expect(options()[1].getAttribute('tabindex')).toBe('0');
    expect(fixture.componentInstance.activated).toEqual([]);
  });

  it('emits itemActivated with the id when a row is clicked', () => {
    options()[2].click();

    expect(fixture.componentInstance.activated).toEqual(['row-3']);
  });

  it('renders the caller-supplied fallback message rather than an empty listbox when there are no items', async () => {
    fixture.componentInstance.items.set([]);
    await fixture.whenStable();

    expect(options()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('No zones yet.');
  });

  it('applies default test ids preserving the original zone-list e2e hooks', () => {
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;

    expect(listbox.getAttribute('data-testid')).toBe('facility-zone-list');
    expect(options()[0].getAttribute('data-testid')).toBe('facility-zone-list-option');
  });
});
