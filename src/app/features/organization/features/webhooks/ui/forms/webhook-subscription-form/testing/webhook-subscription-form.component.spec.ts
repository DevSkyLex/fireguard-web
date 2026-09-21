import { TestBed } from '@angular/core/testing';
import { WebhookSubscriptionForm } from '../webhook-subscription-form.component';

const initial = {
  '@id': '/webhooks/one',
  '@type': 'WebhookSubscription',
  id: 'one',
  organizationId: 'org',
  url: 'https://example.com/hook',
  description: 'Before',
  eventTypes: ['inspection.submitted'],
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

describe('WebhookSubscriptionForm', () => {
  async function setup(editing = true) {
    TestBed.configureTestingModule({ imports: [WebhookSubscriptionForm] });
    const fixture = TestBed.createComponent(WebhookSubscriptionForm);
    fixture.componentRef.setInput('initial', editing ? initial : null);
    fixture.componentRef.setInput('events', [
      {
        '@id': '/events/inspection.submitted',
        '@type': 'WebhookEvent',
        value: 'inspection.submitted',
        label: 'Inspection submitted',
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const submitted = vi.fn();
    fixture.componentInstance.submitted.subscribe(submitted);
    return { fixture, submitted };
  }
  it('submits only modified metadata without replacing the selected event structure', async () => {
    const { fixture, submitted } = await setup();
    const description = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    description.value = 'After';
    description.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    expect(submitted).toHaveBeenCalledWith({ description: 'After' });
  });
  it('refuses a new webhook without a secure destination and an event', async () => {
    const { fixture, submitted } = await setup(false);
    const url = fixture.nativeElement.querySelector('#webhook-url') as HTMLInputElement;
    url.value = 'http://example.com';
    url.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(submitted).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Use an HTTPS URL without credentials.');
    expect(fixture.nativeElement.textContent).toContain('Select at least one event.');
  });
  it('retains the entered destination after a server validation refusal', async () => {
    const { fixture } = await setup();
    const url = fixture.nativeElement.querySelector('#webhook-url') as HTMLInputElement;
    url.value = 'https://new.example.com/hook';
    url.dispatchEvent(new Event('input'));
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'url', message: 'Destination refused' }],
    });
    fixture.detectChanges();
    expect(url.value).toBe('https://new.example.com/hook');
  });
});
