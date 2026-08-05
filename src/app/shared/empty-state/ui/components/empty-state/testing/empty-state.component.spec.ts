import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { EmptyState } from '../empty-state.component';

describe('EmptyState', () => {
  let fixture: ComponentFixture<EmptyState>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(EmptyState);
    fixture.componentRef.setInput('title', 'Nothing is blocking');
    await fixture.whenStable();
  });

  it('should render the title', () => {
    expect(fixture.nativeElement.textContent).toContain('Nothing is blocking');
  });

  it('should omit the description when none is given', () => {
    const paragraphs = fixture.nativeElement.querySelectorAll('p');

    expect(paragraphs.length).toBe(1);
  });

  it('should render the description when given', async () => {
    fixture.componentRef.setInput('description', 'Everything on this device is synced.');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Everything on this device is synced.');
  });

  it('should omit the icon when none is given', () => {
    expect(fixture.nativeElement.querySelector('ng-icon')).toBeNull();
  });

  it('should not announce itself as an alert', () => {
    // An empty list is not a failure; only ErrorState carries `role="alert"`.
    expect(fixture.nativeElement.getAttribute('role')).toBeNull();
  });
});
