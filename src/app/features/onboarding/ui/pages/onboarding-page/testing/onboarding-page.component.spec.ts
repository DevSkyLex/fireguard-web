import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { OnboardingStore } from '@features/onboarding/state';
import { OnboardingPage } from '../onboarding-page.component';

describe('OnboardingPage', () => {
  const setup = () => {
    const mockOnboardingStore = {
      isCompleted: signal(false),
      initialize: vi.fn().mockResolvedValue(undefined),
    };
    const mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };
    const mockEvents = {
      on: vi.fn(() => EMPTY),
    };
    const mockMessageService = {
      add: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: OnboardingStore, useValue: mockOnboardingStore },
        { provide: Router, useValue: mockRouter },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new OnboardingPage());
    return { component, mockOnboardingStore, mockEvents, mockRouter };
  };

  it('should initialize onboarding without resetting on construction', () => {
    const { component, mockOnboardingStore } = setup();

    expect(component).toBeTruthy();
    expect(mockOnboardingStore.initialize).toHaveBeenCalledWith({ reset: false });
    expect(mockOnboardingStore.initialize).toHaveBeenCalledTimes(1);
  });
});
