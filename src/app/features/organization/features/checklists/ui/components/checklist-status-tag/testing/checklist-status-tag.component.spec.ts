import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ChecklistStatus } from '@features/organization/features/checklists/models';
import { ChecklistStatusTag } from '../checklist-status-tag.component';

describe('ChecklistStatusTag', () => {
  let fixture: ComponentFixture<ChecklistStatusTag>;

  const render = async (value: ChecklistStatus): Promise<HTMLElement> => {
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ChecklistStatusTag);
  });

  it.each([
    ['active', 'Active'],
    ['archived', 'Archived'],
  ] as ReadonlyArray<[ChecklistStatus, string]>)(
    'should render both a glyph and a label for %s, so the value never depends on its colour',
    async (value: ChecklistStatus, label: string) => {
      const element: HTMLElement = await render(value);

      expect(element.textContent).toContain(label);
      expect(element.querySelector('ng-icon svg')).not.toBeNull();
    },
  );

  it('should leave the badge itself neutral, tinting only the glyph', async () => {
    const element: HTMLElement = await render('active');
    const badge: Element | null = element.querySelector('[data-slot="badge"]');
    const icon: Element | null = element.querySelector('ng-icon');

    expect(badge?.getAttribute('data-variant')).toBe('outline');
    expect(badge?.className).not.toMatch(/\bbg-(green|neutral)-/);
    expect(icon?.className).toContain('text-success');
  });

  it('should tint archived neutral, as a reversible state rather than a failure', async () => {
    const element: HTMLElement = await render('archived');
    const icon: Element | null = element.querySelector('ng-icon');

    expect(icon?.className).toContain('text-neutral-500');
    expect(icon?.className).toContain('dark:text-neutral-400');
  });

  it('should render icon and label as a plain row, with no badge, when used as an option', async () => {
    fixture.componentRef.setInput('value', 'active');
    fixture.componentRef.setInput('asOption', true);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-slot="badge"]')).toBeNull();
    expect(element.textContent).toContain('Active');
  });
});
