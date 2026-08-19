import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ApprovalStatusTag } from '../approval-status-tag.component';

describe('ApprovalStatusTag', () => {
  let fixture: ComponentFixture<ApprovalStatusTag>;

  const render = async (value: string): Promise<HTMLElement> => {
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ApprovalStatusTag);
  });

  it.each([
    ['pending', 'Pending'],
    ['approved', 'Approved'],
    ['rejected', 'Rejected'],
    ['cancelled', 'Cancelled'],
    ['expired', 'Expired'],
  ])(
    'should render both a glyph and a label for %s, so the value never depends on its colour',
    async (value: string, label: string) => {
      const element: HTMLElement = await render(value);

      expect(element.textContent).toContain(label);
      expect(element.querySelector('ng-icon svg')).not.toBeNull();
    },
  );

  it('should humanise an unknown value rather than render an empty badge', async () => {
    const element: HTMLElement = await render('unknown_status');

    expect(element.textContent).toContain('unknown status');
    expect(element.querySelector('ng-icon')).not.toBeNull();
  });

  it('should leave the badge itself neutral, tinting only the glyph', async () => {
    const element: HTMLElement = await render('approved');
    const badge: Element | null = element.querySelector('[data-slot="badge"]');
    const icon: Element | null = element.querySelector('ng-icon');

    expect(badge?.getAttribute('data-variant')).toBe('outline');
    expect(badge?.className).not.toMatch(/\bbg-(blue|green|amber|red)-/);
    expect(icon?.className).toContain('text-success');
  });

  it('should render icon and label as a plain row, with no badge, when used as an option', async () => {
    fixture.componentRef.setInput('value', 'pending');
    fixture.componentRef.setInput('asOption', true);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[data-slot="badge"]')).toBeNull();
    expect(element.textContent).toContain('Pending');
  });
});
