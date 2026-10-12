import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgIcon } from '@ng-icons/core';
import type { OnboardingStepOutput } from '@features/onboarding/models';
import { OnboardingStepRail } from '../onboarding-step-rail.component';

const stepOf = (
  key: OnboardingStepOutput['key'],
  status: OnboardingStepOutput['status'],
): OnboardingStepOutput =>
  ({
    key,
    label: key,
    status,
    required: true,
    available: true,
    reason: null,
    actionMethod: null,
    actionPath: null,
    rollbackAvailable: false,
    rollbackMethod: null,
    rollbackPath: null,
    skippable: false,
    skipAvailable: false,
    skipMethod: null,
    skipPath: null,
    completedAt: null,
  }) as OnboardingStepOutput;

describe('OnboardingStepRail', () => {
  let fixture: ComponentFixture<OnboardingStepRail>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OnboardingStepRail);
    element = fixture.nativeElement as HTMLElement;
  });

  it('should render one row per step, in order', async () => {
    fixture.componentRef.setInput('steps', [
      stepOf('create_organization', 'completed'),
      stepOf('select_plan', 'pending'),
    ]);
    await fixture.whenStable();

    const rows: NodeListOf<HTMLLIElement> = element.querySelectorAll('li');

    expect(rows).toHaveLength(2);
    expect(element.textContent).toContain('Create organization');
    expect(element.textContent).toContain('Choose a plan');
  });

  it('renders contributed and historical steps with server labels without changing their order', async () => {
    fixture.componentRef.setInput('steps', [
      { ...stepOf('additional_review', 'pending'), label: 'Additional review' },
      { ...stepOf('constructor', 'completed'), label: '<b>Historical step</b>' },
      stepOf('create_organization', 'pending'),
    ]);
    fixture.componentRef.setInput('activeStepKey', 'additional_review');
    await fixture.whenStable();

    const rows = element.querySelectorAll('li');
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('Additional review');
    expect(rows[0].getAttribute('aria-current')).toBe('step');
    const activeIcon = fixture.debugElement.query(By.css('li')).query(By.directive(NgIcon))
      .componentInstance as NgIcon;
    expect(activeIcon.name()).toBe('lucideCircle');
    expect(rows[0].querySelector('ng-icon svg')).not.toBeNull();
    expect(rows[1].textContent).toContain('<b>Historical step</b>');
    expect(rows[1].querySelector('b')).toBeNull();
    expect(rows[2].textContent).toContain('Create organization');
  });

  it('should mark the active step with aria-current="step"', async () => {
    fixture.componentRef.setInput('steps', [
      stepOf('create_organization', 'completed'),
      stepOf('select_plan', 'pending'),
    ]);
    fixture.componentRef.setInput('activeStepKey', 'select_plan');
    await fixture.whenStable();

    const rows: HTMLLIElement[] = Array.from(element.querySelectorAll('li'));

    expect(rows[0].getAttribute('aria-current')).toBeNull();
    expect(rows[1].getAttribute('aria-current')).toBe('step');
  });

  it('should render the completed-of-total readout from the progress input', async () => {
    fixture.componentRef.setInput('progress', { done: 1, total: 5 });
    await fixture.whenStable();

    expect(element.textContent).toContain('1');
    expect(element.textContent).toContain('5');
    expect(element.textContent).toContain('completed');
  });

  it('should omit the duplicate progress summary in the compact mobile disclosure', async () => {
    fixture.componentRef.setInput('progress', { done: 1, total: 5 });
    fixture.componentRef.setInput('compact', true);
    await fixture.whenStable();

    expect(element.textContent).not.toContain('1 of 5 completed');
    expect(element.querySelector('hlm-progress')).toBeNull();
  });

  it('should label every step status so it never depends on colour alone', async () => {
    fixture.componentRef.setInput('steps', [stepOf('create_organization', 'blocked')]);
    await fixture.whenStable();

    expect(element.textContent).toContain('Blocked');
  });

  it('should read a step blocked only by its order as not started', async () => {
    // The backend reports every step after the active one as `blocked` until
    // the active one is done; that is the normal shape of the flow, not a
    // failure, so the rail must not paint four red rows on first render.
    fixture.componentRef.setInput('steps', [
      stepOf('create_organization', 'pending'),
      stepOf('select_plan', 'blocked'),
    ]);
    fixture.componentRef.setInput('activeStepKey', 'create_organization');
    await fixture.whenStable();

    const rows: HTMLLIElement[] = Array.from(element.querySelectorAll('li'));

    expect(rows[1].textContent).toContain('Not started');
    expect(rows[1].textContent).not.toContain('Blocked');
  });

  it('should describe the active step while keeping ordinary statuses accessible', async () => {
    fixture.componentRef.setInput('steps', [
      stepOf('create_organization', 'completed'),
      stepOf('select_plan', 'pending'),
    ]);
    fixture.componentRef.setInput('activeStepKey', 'select_plan');
    await fixture.whenStable();

    const rows: HTMLLIElement[] = Array.from(element.querySelectorAll('li'));

    expect(rows[0].textContent).not.toContain('Your structure');
    expect(rows[0].querySelector('.sr-only')?.textContent).toContain('Completed');
    expect(rows[1].textContent).toContain('Your subscription');
    expect(rows[1].querySelector('.sr-only')?.textContent).toContain('Not started');
    expect(rows[1].getAttribute('data-variant')).toBe('muted');
  });
});
