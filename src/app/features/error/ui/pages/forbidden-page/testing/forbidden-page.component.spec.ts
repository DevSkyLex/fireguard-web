import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AUTH_LOGOUT_PORT } from '@features/auth/ports';
import { ForbiddenPage } from '../forbidden-page.component';

describe('ForbiddenPage', () => {
  let logout: ReturnType<typeof vi.fn>;
  let isLoggingOut: WritableSignal<boolean>;

  async function createPage(): Promise<ComponentFixture<ForbiddenPage>> {
    logout = vi.fn();
    isLoggingOut = signal<boolean>(false);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AUTH_LOGOUT_PORT, useValue: { isLoggingOut, logout } },
      ],
    });

    const fixture = TestBed.createComponent(ForbiddenPage);
    await fixture.whenStable();

    return fixture;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should offer signing out as the primary exit', async () => {
    const fixture = await createPage();

    // Every workspace link loops back here; only signing out cannot.
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('should busy-lock the sign-out control while the logout is in flight', async () => {
    const fixture = await createPage();

    isLoggingOut.set(true);
    await fixture.whenStable();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
  });

  it('should keep a link back to the workspace root', async () => {
    const fixture = await createPage();

    expect(fixture.nativeElement.querySelector('a[href="/"]')).not.toBeNull();
  });
});
