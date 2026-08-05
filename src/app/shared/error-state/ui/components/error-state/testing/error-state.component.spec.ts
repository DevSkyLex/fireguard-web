import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ErrorState } from '../error-state.component';

describe('ErrorState', () => {
  let fixture: ComponentFixture<ErrorState>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(ErrorState);
    fixture.componentRef.setInput('title', "Couldn't load your work queues");
    await fixture.whenStable();
  });

  it('should render the title', () => {
    expect(fixture.nativeElement.textContent).toContain("Couldn't load your work queues");
  });

  it('should render the description when given', async () => {
    fixture.componentRef.setInput('description', 'The interventions could not be fetched.');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('The interventions could not be fetched.');
  });

  it('should announce itself as an alert', () => {
    // This is the difference that matters against EmptyState: a failure has to
    // reach assistive technology without the user hunting for it.
    expect(fixture.nativeElement.getAttribute('role')).toBe('alert');
  });
});
