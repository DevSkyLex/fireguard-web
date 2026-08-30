import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ORGANIZATION_AVATAR_TONE_CLASSES } from '../constants';
import { OrganizationAvatar } from '../organization-avatar.component';

const classesOf = (element: HTMLElement): ReadonlySet<string> =>
  new Set(element.className.split(' ').filter(Boolean));

describe('OrganizationAvatar', () => {
  let fixture: ComponentFixture<OrganizationAvatar>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const avatar = (): HTMLElement => root().querySelector('hlm-avatar') as HTMLElement;
  const fallback = (): HTMLElement => root().querySelector('[hlmAvatarFallback]') as HTMLElement;
  const render = async (inputs: Readonly<Record<string, unknown>> = {}): Promise<void> => {
    fixture.componentRef.setInput('name', 'Acme Fire Services');
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationAvatar);
  });

  it('should derive the initials from the name', async () => {
    await render();

    expect(fallback().textContent?.trim()).toBe('AF');
  });

  it('should let a caller override the initials it already holds', async () => {
    await render({ initials: 'ZZ' });

    expect(fallback().textContent?.trim()).toBe('ZZ');
  });

  it('should fall back to the derived initials on an empty override', async () => {
    await render({ initials: '' });

    expect(fallback().textContent?.trim()).toBe('AF');
  });

  // The image element itself is not asserted here: `hlmAvatarImage` only
  // reveals it once the browser reports the load, which never happens under
  // jsdom. Its radius is proven in the browser pass instead.
  it('should carry the same radius on the root and on the ring it draws', async () => {
    await render({ size: 'lg' });

    expect(classesOf(avatar())).toContain('rounded-lg');
    expect(classesOf(avatar())).toContain('after:rounded-lg');
    expect(classesOf(fallback())).toContain('rounded-lg');
  });

  it('should step the radius down on the smallest rung', async () => {
    await render({ size: 'xs' });

    expect(classesOf(avatar())).toContain('rounded-md');
    expect(classesOf(avatar())).toContain('after:rounded-md');
    expect(classesOf(fallback())).toContain('rounded-md');
  });

  it('should tint a logo-less avatar from the name, always the same way', async () => {
    await render();

    const first: ReadonlySet<string> = classesOf(fallback());

    expect(
      ORGANIZATION_AVATAR_TONE_CLASSES.some((tone: string): boolean =>
        tone.split(' ').every((cls: string): boolean => first.has(cls)),
      ),
    ).toBe(true);

    await render({ name: 'Other Org' });
    await render({ name: 'Acme Fire Services' });

    expect(classesOf(fallback())).toEqual(first);
  });

  it('should give two differently named organizations their own tone', async () => {
    await render({ name: 'Alpha' });

    const alpha: ReadonlySet<string> = classesOf(fallback());

    await render({ name: 'Beta' });

    expect(classesOf(fallback())).not.toEqual(alpha);
  });
});
