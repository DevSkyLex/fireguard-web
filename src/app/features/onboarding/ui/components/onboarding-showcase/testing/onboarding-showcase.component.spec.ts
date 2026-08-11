import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OnboardingStore } from '@features/onboarding/state';
import { OnboardingShowcase } from '../onboarding-showcase.component';

describe('OnboardingShowcase', () => {
  let fixture: ComponentFixture<OnboardingShowcase>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: OnboardingStore,
          useValue: {
            steps: signal([]),
            nextStep: signal(null),
            progress: signal({ done: 0, total: 0 }),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(OnboardingShowcase);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('should render the brand lockup and the step rail', () => {
    expect(element.textContent).toContain('FireGuard');
    expect(element.querySelector('app-onboarding-step-rail')).not.toBeNull();
  });
});
