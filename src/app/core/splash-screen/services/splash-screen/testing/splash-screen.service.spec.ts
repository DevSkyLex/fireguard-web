import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BOOT_READINESS_PORT } from '@core/boot-readiness';
import { SplashScreenService } from '../splash-screen.service';

describe('SplashScreenService', () => {
  let service: SplashScreenService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: BOOT_READINESS_PORT, useValue: { initialized: signal(true) } },
      ],
    });
    service = TestBed.inject(SplashScreenService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });
});
