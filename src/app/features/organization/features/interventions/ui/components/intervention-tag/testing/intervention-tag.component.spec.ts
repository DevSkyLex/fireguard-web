import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionTagKind } from '@features/organization/features/interventions/models';
import { InterventionTag } from '../intervention-tag.component';

describe('InterventionTag', () => {
  let fixture: ComponentFixture<InterventionTag>;

  const render = async (kind: InterventionTagKind, value: string): Promise<HTMLElement> => {
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionTag);
  });

  it.each([
    ['priority', 'urgent', 'Urgent'],
    ['status', 'in_progress', 'In progress'],
    ['type', 'inventory', 'Inventory'],
    ['workItemAction', 'inspection', 'Inspection'],
    ['workItemStatus', 'skipped', 'Skipped'],
    ['issueSeverity', 'blocker', 'Blocker'],
    ['changeStatus', 'applied', 'Applied'],
    ['inspectionResult', 'fail', 'Fail'],
  ] as ReadonlyArray<[InterventionTagKind, string, string]>)(
    'should render both a glyph and a label for %s/%s, so the value never depends on its colour',
    async (kind: InterventionTagKind, value: string, label: string) => {
      const element: HTMLElement = await render(kind, value);

      expect(element.textContent).toContain(label);
      expect(element.querySelector('ng-icon')).not.toBeNull();
    },
  );

  it('should register every icon it can resolve, since an unregistered name renders an empty glyph', async () => {
    const element: HTMLElement = await render('status', 'published');

    expect(element.querySelector('ng-icon svg')).not.toBeNull();
  });

  it('should humanise an unknown value rather than render an empty badge', async () => {
    const element: HTMLElement = await render('status', 'awaiting_parts');

    expect(element.textContent).toContain('awaiting parts');
    expect(element.querySelector('ng-icon')).not.toBeNull();
  });

  it.each(['draft', 'planned', 'published', 'abandoned'])(
    'should leave the badge itself neutral for %s',
    async (status: string) => {
      const badge: Element | null = (await render('status', status)).querySelector(
        '[data-slot="badge"]',
      );

      expect(badge?.getAttribute('data-variant')).toBe('outline');
      expect(badge?.className).toContain('text-muted-foreground');
      expect(badge?.className).not.toMatch(/\bbg-(blue|green|amber|red)-/);
    },
  );

  it('should put the published tone on the glyph alone, via the success token', async () => {
    const icon: Element | null = (await render('status', 'published')).querySelector('ng-icon');

    expect(icon?.className).toContain('text-success');
  });

  it('should put the abandoned tone on the glyph alone, in red', async () => {
    const icon: Element | null = (await render('status', 'abandoned')).querySelector('ng-icon');

    expect(icon?.className).toContain('text-red-500');
    expect(icon?.className).toContain('dark:text-red-400');
  });

  it.each(['draft', 'planned', 'in_progress', 'submitted', 'changes_requested'])(
    'should put a neutral grey on the %s glyph, never a status colour',
    async (status: string) => {
      const icon: Element | null = (await render('status', status)).querySelector('ng-icon');

      expect(icon?.className).toContain('text-neutral-500');
      expect(icon?.className).toContain('dark:text-neutral-400');
      expect(icon?.className).not.toMatch(/text-(blue|green|amber|red)-/);
    },
  );

  it('should give each priority level its own glyph, not one shared shape', async () => {
    fixture.componentRef.setInput('kind', 'priority'); // satisfies the shared fixture's required input before any global tick touches it
    fixture.componentRef.setInput('value', 'normal');

    const priorities: readonly string[] = ['low', 'normal', 'high', 'urgent'];
    const fixtures: readonly ComponentFixture<InterventionTag>[] = priorities.map(
      (priority: string): ComponentFixture<InterventionTag> => {
        const separate: ComponentFixture<InterventionTag> =
          TestBed.createComponent(InterventionTag);
        separate.componentRef.setInput('kind', 'priority');
        separate.componentRef.setInput('value', priority);
        return separate;
      },
    );

    await Promise.all(
      fixtures.map((separate: ComponentFixture<InterventionTag>): Promise<void> =>
        separate.whenStable(),
      ),
    );

    const svgMarkup: readonly string[] = fixtures.map(
      (separate: ComponentFixture<InterventionTag>): string =>
        (separate.nativeElement as HTMLElement).querySelector('ng-icon svg')?.innerHTML ?? '',
    );

    expect(new Set(svgMarkup).size).toBe(priorities.length);
    expect(svgMarkup.every((markup: string): boolean => markup.length > 0)).toBe(true);
  });

  it('should render icon and label as a plain row, with no badge, when used as an option', async () => {
    fixture.componentRef.setInput('kind', 'priority');
    fixture.componentRef.setInput('value', 'urgent');
    fixture.componentRef.setInput('asOption', true);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-slot="badge"]')).toBeNull();
    expect(element.querySelector('ng-icon')).not.toBeNull();
    expect(element.textContent).toContain('Urgent');
  });

  it('should render the badge by default, when asOption is not set', async () => {
    const element: HTMLElement = await render('priority', 'urgent');

    expect(element.querySelector('[data-slot="badge"]')).not.toBeNull();
  });
});
