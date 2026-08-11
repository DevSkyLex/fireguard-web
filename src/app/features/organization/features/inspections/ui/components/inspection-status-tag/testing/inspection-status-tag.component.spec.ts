import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InspectionStatusTagKind } from '@features/organization/features/inspections/models';
import { InspectionStatusTag } from '../inspection-status-tag.component';

describe('InspectionStatusTag', () => {
  let fixture: ComponentFixture<InspectionStatusTag>;

  const render = async (kind: InspectionStatusTagKind, value: string): Promise<HTMLElement> => {
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InspectionStatusTag);
  });

  it.each([
    ['status', 'draft', 'Draft'],
    ['status', 'closed', 'Closed'],
    ['status', 'cancelled', 'Cancelled'],
    ['result', 'pass', 'Pass'],
    ['result', 'fail', 'Fail'],
  ] as ReadonlyArray<[InspectionStatusTagKind, string, string]>)(
    'should render both a glyph and a label for %s/%s, so the value never depends on its colour',
    async (kind: InspectionStatusTagKind, value: string, label: string) => {
      const element: HTMLElement = await render(kind, value);

      expect(element.textContent).toContain(label);
      expect(element.querySelector('ng-icon svg')).not.toBeNull();
    },
  );

  it('should humanise an unknown value rather than render an empty badge', async () => {
    const element: HTMLElement = await render('status', 'awaiting_review');

    expect(element.textContent).toContain('awaiting review');
    expect(element.querySelector('ng-icon')).not.toBeNull();
  });

  it('should leave the badge itself neutral, tinting only the glyph', async () => {
    const element: HTMLElement = await render('result', 'pass');
    const badge: Element | null = element.querySelector('[data-slot="badge"]');
    const icon: Element | null = element.querySelector('ng-icon');

    expect(badge?.getAttribute('data-variant')).toBe('outline');
    expect(badge?.className).not.toMatch(/\bbg-(blue|green|amber|red)-/);
    expect(icon?.className).toContain('text-green-500');
    expect(icon?.className).toContain('dark:text-green-400');
  });

  it('should render icon and label as a plain row, with no badge, when used as an option', async () => {
    fixture.componentRef.setInput('kind', 'result');
    fixture.componentRef.setInput('value', 'pass');
    fixture.componentRef.setInput('asOption', true);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-slot="badge"]')).toBeNull();
    expect(element.textContent).toContain('Pass');
  });
});
