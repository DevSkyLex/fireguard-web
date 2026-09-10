import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(ThemeService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should switch marked logos and the favicon with the resolved theme', () => {
    const logo: HTMLImageElement = document.createElement('img');
    logo.setAttribute('data-theme-logo', '');
    document.body.appendChild(logo);

    const onboardingLogo: HTMLImageElement = document.createElement('img');
    onboardingLogo.setAttribute('data-theme-logo', 'onboarding');
    document.body.appendChild(onboardingLogo);

    const icon: HTMLLinkElement = document.createElement('link');
    icon.setAttribute('data-theme-icon', '');
    document.head.appendChild(icon);

    service.setTheme('dark');
    TestBed.tick();

    expect(logo.getAttribute('src')).toBe('fireguard-logo-white.svg');
    expect(onboardingLogo.getAttribute('src')).toBe('fireguard-logo-white.svg');
    expect(icon.getAttribute('href')).toBe('fireguard-logo-white.svg');

    service.setTheme('light');
    TestBed.tick();

    expect(logo.getAttribute('src')).toBe('fireguard-logo-dark.svg');
    expect(onboardingLogo.getAttribute('src')).toBe('fireguard-logo-primary.svg');
    expect(icon.getAttribute('href')).toBe('fireguard-logo-dark.svg');

    logo.remove();
    onboardingLogo.remove();
    icon.remove();
  });
});
