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
});
