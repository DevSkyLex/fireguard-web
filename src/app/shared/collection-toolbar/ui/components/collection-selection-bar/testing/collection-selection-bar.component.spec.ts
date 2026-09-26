import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideFlag, lucideTrash2 } from '@ng-icons/lucide';
import type { CollectionSelectionAction } from '../../../../models/collection-selection-action.interface';
import { CollectionSelectionBar } from '../collection-selection-bar.component';

const actions: readonly CollectionSelectionAction[] = [
  {
    kind: 'group',
    id: 'move',
    label: 'Move to',
    icon: 'lucideFlag',
    actions: [
      { kind: 'command', id: 'planned', label: 'Planned (2)', icon: 'lucideFlag' },
      {
        kind: 'command',
        id: 'published',
        label: 'Published (0)',
        icon: 'lucideFlag',
        disabled: true,
        disabledReason: 'No eligible row',
      },
    ],
  },
  {
    kind: 'group',
    id: 'locked',
    label: 'Locked group',
    icon: 'lucideFlag',
    disabled: true,
    disabledReason: 'No access',
    actions: [{ kind: 'command', id: 'locked-child', label: 'Locked command', icon: 'lucideFlag' }],
  },
  { kind: 'command', id: 'remove', label: 'Remove (2)', icon: 'lucideTrash2', destructive: true },
];

describe('CollectionSelectionBar', () => {
  let fixture: ComponentFixture<CollectionSelectionBar>;

  async function render(mobileMode = false, selectedCount = 2): Promise<void> {
    TestBed.configureTestingModule({
      imports: [CollectionSelectionBar],
      providers: [provideZonelessChangeDetection(), provideIcons({ lucideFlag, lucideTrash2 })],
    });
    fixture = TestBed.createComponent(CollectionSelectionBar);
    fixture.componentRef.setInput('selectedCount', selectedCount);
    fixture.componentRef.setInput('totalResults', 98);
    fixture.componentRef.setInput('mobileMode', mobileMode);
    fixture.componentRef.setInput('actions', actions);
    fixture.componentRef.setInput('testIdPrefix', 'example');
    await fixture.whenStable();
  }

  it('renders no floating region without selected rows', async () => {
    await render(false, 0);
    expect(fixture.nativeElement.querySelector('[data-testid="example-selection-bar"]')).toBeNull();
  });

  it('labels the selected count separately from all query results', async () => {
    await render();
    const bar = fixture.nativeElement.querySelector('[data-testid="example-selection-bar"]');
    expect(bar?.textContent).toContain('Selected: 2');
    expect(bar?.textContent).toContain('Results: 98');
  });

  it('emits an enabled desktop command and rejects a disabled grouped command', async () => {
    await render();
    const requested = vi.fn();
    fixture.componentInstance.actionRequested.subscribe(requested);

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="example-selection-action-remove"]')
      ?.click();
    expect(requested).toHaveBeenCalledExactlyOnceWith('remove');

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-testid="example-selection-group-move"]')
      ?.click();
    await fixture.whenStable();
    const disabled = document.querySelector<HTMLButtonElement>(
      '[data-testid="example-selection-action-published"]',
    );
    expect(disabled?.disabled).toBe(true);
    disabled?.click();
    expect(requested).toHaveBeenCalledTimes(1);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '[data-testid="example-selection-group-locked"]',
      )?.disabled,
    ).toBe(true);
  });

  it('waits for the mobile drawer to close before emitting its command', async () => {
    await render(true);
    const requested = vi.fn();
    fixture.componentInstance.actionRequested.subscribe(requested);
    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[data-testid="example-selection-actions-trigger"]',
    );
    trigger?.focus();
    trigger?.click();
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="example-selection-drawer"]')).not.toBeNull();
    expect(
      document.querySelector<HTMLButtonElement>(
        '[data-testid="example-selection-action-locked-child"]',
      )?.disabled,
    ).toBe(true);

    document
      .querySelector<HTMLButtonElement>('[data-testid="example-selection-action-remove"]')
      ?.click();
    expect(requested).not.toHaveBeenCalled();
    await fixture.whenStable();
    expect(requested).toHaveBeenCalledExactlyOnceWith('remove');
    expect(document.querySelector('[data-testid="example-selection-drawer"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
