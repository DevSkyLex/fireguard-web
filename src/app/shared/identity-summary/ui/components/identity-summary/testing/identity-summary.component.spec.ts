import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { IdentitySummary } from '../identity-summary.component';

describe('IdentitySummary', () => {
  let fixture: ComponentFixture<IdentitySummary>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(IdentitySummary);
    fixture.componentRef.setInput('name', 'Ada Lovelace');
    await fixture.whenStable();
  });

  it('should show the name', () => {
    expect(fixture.nativeElement.textContent).toContain('Ada Lovelace');
  });

  it('should fall back to the initials when there is no picture', async () => {
    fixture.componentRef.setInput('initials', 'AL');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('AL');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('should omit the secondary line rather than reserve blank space for it', async () => {
    const withoutLine: number = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'span',
    ).length;

    fixture.componentRef.setInput('secondary', 'ada@example.com');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('ada@example.com');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('span').length).toBeGreaterThan(
      withoutLine,
    );
  });

  it('should keep the initials showing until a picture actually loads', async () => {
    fixture.componentRef.setInput('initials', 'AL');
    fixture.componentRef.setInput('avatarUrl', 'https://api.test/avatar.webp');
    await fixture.whenStable();

    // The spartan avatar swaps the fallback out only once the image resolves,
    // so a broken or slow picture leaves a name rather than a hole. That is
    // also why the `alt=""` intent is asserted nowhere: under jsdom the image
    // never loads, so there is no `<img>` to inspect.
    expect(fixture.nativeElement.textContent).toContain('AL');
  });
});
