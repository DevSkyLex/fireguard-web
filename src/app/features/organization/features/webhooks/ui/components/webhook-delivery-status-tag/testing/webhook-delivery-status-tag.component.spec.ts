import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { WebhookDeliveryStatusTag } from '../webhook-delivery-status-tag.component';

describe('WebhookDeliveryStatusTag', () => {
  let fixture: ComponentFixture<WebhookDeliveryStatusTag>;

  const render = async (value: string): Promise<HTMLElement> => {
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();

    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(WebhookDeliveryStatusTag);
  });

  it.each([
    ['pending', 'Pending'],
    ['delivered', 'Delivered'],
    ['failed', 'Failed'],
  ])(
    'should render both a glyph and a label for %s, so the value never depends on its colour',
    async (value: string, label: string) => {
      const element: HTMLElement = await render(value);

      expect(element.textContent).toContain(label);
      expect(element.querySelector('ng-icon svg')).not.toBeNull();
    },
  );

  it('should tint delivered and failed with two different severities, so they never look identical', async () => {
    const delivered: HTMLElement = await render('delivered');
    const deliveredClass: string | undefined = delivered.querySelector('ng-icon')?.className;

    fixture = TestBed.createComponent(WebhookDeliveryStatusTag);
    const failed: HTMLElement = await render('failed');
    const failedClass: string | undefined = failed.querySelector('ng-icon')?.className;

    expect(deliveredClass).toContain('text-success');
    expect(failedClass).toContain('text-destructive');
  });

  it('should humanise an unknown value rather than render an empty badge', async () => {
    const element: HTMLElement = await render('unknown_status');

    expect(element.textContent).toContain('unknown status');
    expect(element.querySelector('ng-icon')).not.toBeNull();
  });

  it('should leave the badge itself neutral, tinting only the glyph', async () => {
    const element: HTMLElement = await render('delivered');
    const badge: Element | null = element.querySelector('[data-slot="badge"]');
    const icon: Element | null = element.querySelector('ng-icon');

    expect(badge?.getAttribute('data-variant')).toBe('outline');
    expect(badge?.className).not.toMatch(/\bbg-(blue|green|amber|red)-/);
    expect(icon?.className).toContain('text-success');
  });
});
