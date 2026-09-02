import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { RequiredMarker } from '../required-marker.component';

describe('RequiredMarker', () => {
  let fixture: ComponentFixture<RequiredMarker>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(RequiredMarker);
    await fixture.whenStable();
  });

  it('should show an asterisk that assistive tech skips', () => {
    const star: HTMLElement | null = fixture.nativeElement.querySelector('[aria-hidden="true"]');

    expect(star?.textContent).toContain('*');
    expect(star?.className).toContain('text-destructive');
  });

  it('should announce "required" to assistive tech instead', () => {
    const name: HTMLElement | null = fixture.nativeElement.querySelector('.sr-only');

    expect(name?.textContent).toContain('required');
  });
});
