import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FacilityStatusTag } from '../facility-status-tag.component';

describe('FacilityStatusTag', () => {
  let fixture: ComponentFixture<FacilityStatusTag>;

  const render = async (value: string): Promise<HTMLElement> => {
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(FacilityStatusTag);
  });

  it.each([
    ['active', 'Active'],
    ['archived', 'Archived'],
  ])(
    'should render both a glyph and a label for %s, so the value never depends on its colour',
    async (value: string, label: string) => {
      const element: HTMLElement = await render(value);

      expect(element.textContent).toContain(label);
      expect(element.querySelector('ng-icon svg')).not.toBeNull();
    },
  );

  it('should humanise an unknown value rather than render an empty badge', async () => {
    const element: HTMLElement = await render('under_review');

    expect(element.textContent).toContain('under review');
    expect(element.querySelector('ng-icon')).not.toBeNull();
  });

  it('should leave the badge itself neutral, tinting only the glyph', async () => {
    const element: HTMLElement = await render('active');
    const badge: Element | null = element.querySelector('[data-slot="badge"]');
    const icon: Element | null = element.querySelector('ng-icon');

    expect(badge?.getAttribute('data-variant')).toBe('outline');
    expect(badge?.className).not.toMatch(/\bbg-(blue|green|amber|red|neutral)-/);
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
