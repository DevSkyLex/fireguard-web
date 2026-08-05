import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { NotFoundPage } from '../not-found-page.component';

describe('NotFoundPage', () => {
  let navigate: MockInstance;

  /**
   * Builds the page with a given `from` query parameter, which is what the
   * redirect guard attaches.
   */
  async function createPage(from: string | null): Promise<ComponentFixture<NotFoundPage>> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(from === null ? {} : { from }) },
          },
        },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(NotFoundPage);
    await fixture.whenStable();

    return fixture;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should name the address that failed', async () => {
    const fixture = await createPage('/organizations/org-1/nowhere');

    // Without it the page could only offer "back to home", the one exit a
    // member who mistyped a deep link does not want.
    expect(fixture.nativeElement.textContent).toContain('/organizations/org-1/nowhere');
  });

  it('should omit the address when the page was reached directly', async () => {
    const fixture = await createPage(null);

    expect(fixture.nativeElement.querySelector('[title]')).toBeNull();
  });

  it('should offer both a way back and a way to the workspace', async () => {
    const fixture = await createPage('/nowhere');

    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/"]')).not.toBeNull();
  });

  it('should step back through history when there is one', async () => {
    const fixture = await createPage('/nowhere');
    const back = vi.spyOn(globalThis.history, 'back').mockImplementation(() => undefined);
    vi.spyOn(globalThis.history, 'length', 'get').mockReturnValue(3);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(back).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should fall back to the root when the page was opened from a pasted link', async () => {
    const fixture = await createPage('/nowhere');
    vi.spyOn(globalThis.history, 'length', 'get').mockReturnValue(1);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(navigate).toHaveBeenCalledWith(['/']);
  });
});
