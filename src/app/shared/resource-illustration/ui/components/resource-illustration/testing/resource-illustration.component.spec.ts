import { PLATFORM_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { THEME_PORT, type ThemePort } from '@core/theme';
import { ResourceIllustration } from '../resource-illustration.component';

describe('ResourceIllustration', () => {
  let fixture: ComponentFixture<ResourceIllustration>;
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

  it('renders one decorative image with reserved intrinsic dimensions', async () => {
    fixture = TestBed.createComponent(ResourceIllustration);
    fixture.componentRef.setInput('resource', 'equipment');
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const images = root.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe(
      '/assets/illustrations/resources/light/equipment.svg',
    );
    expect(images[0].getAttribute('alt')).toBe('');
    expect(images[0].getAttribute('width')).toBe('400');
    expect(images[0].getAttribute('height')).toBe('320');
    expect(root.getAttribute('aria-hidden')).toBe('true');
  });

  it('reacts to the applied theme and selected resource without mounting another image', async () => {
    fixture = TestBed.createComponent(ResourceIllustration);
    fixture.componentRef.setInput('resource', 'inspection');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const image = root.querySelector('img');

    resolvedTheme.set('dark');
    await fixture.whenStable();
    expect(image?.getAttribute('src')).toBe('/assets/illustrations/resources/dark/inspection.svg');

    fixture.componentRef.setInput('resource', 'site');
    await fixture.whenStable();
    expect(root.querySelector('img')).toBe(image);
    expect(image?.getAttribute('src')).toBe('/assets/illustrations/resources/dark/site.svg');
  });

  it('renders from the theme port in a server platform without browser theme APIs', async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    resolvedTheme.set('dark');
    fixture = TestBed.createComponent(ResourceIllustration);
    fixture.componentRef.setInput('resource', 'team');
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('img')?.getAttribute('src')).toBe(
      '/assets/illustrations/resources/dark/team.svg',
    );
  });
});
