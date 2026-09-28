import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AutomationStatusTag } from '../automation-status-tag.component';

describe('AutomationStatusTag', () => {
  let fixture: ComponentFixture<AutomationStatusTag>;

  const render = async (value: string): Promise<HTMLElement> => {
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(AutomationStatusTag);
  });

  it.each([
    ['pending', 'Queued'],
    ['running', 'Running'],
    ['failed', 'Failed'],
    ['succeeded', 'Completed'],
    ['skipped', 'Skipped'],
  ])(
    'should render both a glyph and a label for %s, so the value never depends on its colour',
    async (value: string, label: string) => {
      const element: HTMLElement = await render(value);

      expect(element.textContent).toContain(label);
      expect(element.querySelector('ng-icon svg')).not.toBeNull();
    },
  );

  it('should tint succeeded and skipped with two different severities, so they never look identical', async () => {
    const succeeded: HTMLElement = await render('succeeded');
    const succeededClass: string | undefined = succeeded.querySelector('ng-icon')?.className;

    fixture = TestBed.createComponent(AutomationStatusTag);
    const skipped: HTMLElement = await render('skipped');
    const skippedClass: string | undefined = skipped.querySelector('ng-icon')?.className;

    expect(succeededClass).toContain('text-success');
    expect(skippedClass).toContain('text-muted-foreground');
  });

  it('should humanise an unknown value rather than render an empty badge', async () => {
    const element: HTMLElement = await render('unknown_status');

    expect(element.textContent).toContain('unknown status');
    expect(element.querySelector('ng-icon')).not.toBeNull();
  });

  it('should leave the badge itself neutral, tinting only the glyph', async () => {
    const element: HTMLElement = await render('succeeded');
    const badge: Element | null = element.querySelector('[data-slot="badge"]');
    const icon: Element | null = element.querySelector('ng-icon');

    expect(badge?.getAttribute('data-variant')).toBe('outline');
    expect(badge?.className).not.toMatch(/\bbg-(blue|green|amber|red)-/);
    expect(icon?.className).toContain('text-success');
  });
});
