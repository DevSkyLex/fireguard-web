import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionView } from '@features/organization/features/interventions/models';
import { InterventionViewSwitcher } from '../intervention-view-switcher.component';

const view = (overrides: Partial<InterventionView> = {}): InterventionView => ({
  id: 'all',
  label: 'All',
  builtin: true,
  filters: {
    status: null,
    type: null,
    priority: null,
    site: null,
    responsible: null,
    dueWindow: null,
  },
  sort: { field: 'dueAt', direction: 'asc' },
  grouping: 'status',
  render: 'list',
  ...overrides,
});

describe('InterventionViewSwitcher', () => {
  let fixture: ComponentFixture<InterventionViewSwitcher>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const create = async (
    views: readonly InterventionView[],
    activeViewId: string | null = null,
  ): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(InterventionViewSwitcher);
    fixture.componentRef.setInput('views', views);
    fixture.componentRef.setInput('activeViewId', activeViewId);
    await fixture.whenStable();
  };

  it('should render one button per view and press only the active one', async () => {
    await create([view(), view({ id: 'mine', label: 'Mine' })], 'mine');

    const buttons = root().querySelectorAll<HTMLButtonElement>(
      '[data-testid="interventions-view"]',
    );
    expect(buttons.length).toBe(2);
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1]?.getAttribute('aria-pressed')).toBe('true');
  });

  it('should emit the picked view id', async () => {
    const picked: string[] = [];
    await create([view()]);
    fixture.componentInstance.selected.subscribe((id: string) => picked.push(id));

    root().querySelector<HTMLButtonElement>('[data-testid="interventions-view"]')?.click();

    expect(picked).toEqual(['all']);
  });

  it('should offer removal on custom views only', async () => {
    const removed: string[] = [];
    await create([view(), view({ id: 'custom-1', label: 'My site', builtin: false })]);
    fixture.componentInstance.removed.subscribe((id: string) => removed.push(id));

    const removeButtons = root().querySelectorAll<HTMLButtonElement>(
      '[data-testid="interventions-view-remove"]',
    );
    expect(removeButtons.length).toBe(1);

    removeButtons[0]?.click();
    expect(removed).toEqual(['custom-1']);
  });
});
