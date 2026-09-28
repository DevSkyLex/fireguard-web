import { PLATFORM_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { StateIllustration } from '../state-illustration.component';

describe('StateIllustration', () => {
  let fixture: ComponentFixture<StateIllustration>;
  let resolvedTheme: WritableSignal<'light' | 'dark'>;

  beforeEach(() => {
    resolvedTheme = signal<'light' | 'dark'>('light');
    const themePort: ThemePort = {
      theme: signal('system'),
      resolvedTheme,
      setTheme: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: THEME_PORT, useValue: themePort }],
    });
  });

  it('renders one decorative image from the generic state catalogue', async () => {
    fixture = TestBed.createComponent(StateIllustration);
    fixture.componentRef.setInput('state', 'no-results');
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const images = root.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe(
      '/assets/illustrations/empty-states/light/no-results.svg',
    );
    expect(images[0].getAttribute('alt')).toBe('');
    expect(images[0].getAttribute('width')).toBe('400');
    expect(images[0].getAttribute('height')).toBe('320');
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.getAttribute('data-testid')).toBe('state-illustration');
  });

  it('follows the applied theme and the selected state without mounting another image', async () => {
    fixture = TestBed.createComponent(StateIllustration);
    fixture.componentRef.setInput('state', 'access-denied');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const image = root.querySelector('img');

    resolvedTheme.set('dark');
    await fixture.whenStable();
    expect(image?.getAttribute('src')).toBe(
      '/assets/illustrations/empty-states/dark/access-denied.svg',
    );

    fixture.componentRef.setInput('state', 'all-clear');
    await fixture.whenStable();
    expect(root.querySelector('img')).toBe(image);
    expect(image?.getAttribute('src')).toBe(
      '/assets/illustrations/empty-states/dark/all-clear.svg',
    );
  });

  it('keeps the 160/192 px media by default and narrows it for compact regions', async () => {
    fixture = TestBed.createComponent(StateIllustration);
    fixture.componentRef.setInput('state', 'no-matches');
    await fixture.whenStable();
    const image = (fixture.nativeElement as HTMLElement).querySelector('img');
    expect([...(image?.classList ?? [])].toSorted()).toEqual([
      'block',
      'h-auto',
      'max-w-full',
      'sm:w-48',
      'w-40',
    ]);

    fixture.componentRef.setInput('size', 'sm');
    await fixture.whenStable();
    expect([...(image?.classList ?? [])].toSorted()).toEqual([
      'block',
      'h-auto',
      'max-w-full',
      'sm:w-32',
      'w-28',
    ]);
  });

  it('renders from the theme port in a server platform without browser theme APIs', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    resolvedTheme.set('dark');
    fixture = TestBed.createComponent(StateIllustration);
    fixture.componentRef.setInput('state', 'no-selection');
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/illustrations/empty-states/dark/no-selection.svg',
    );
  });
});
