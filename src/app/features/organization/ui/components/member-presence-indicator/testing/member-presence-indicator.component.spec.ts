import { TestBed } from '@angular/core/testing';
import { MemberPresenceIndicator } from '../member-presence-indicator.component';

describe('MemberPresenceIndicator', () => {
  it('does not label unknown presence as offline', async () => {
    const fixture = TestBed.createComponent(MemberPresenceIndicator);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-slot="avatar-badge"]')).toBeNull();
  });

  it.each([
    ['active', 'Active', 'bg-success'],
    ['do_not_disturb', 'Do not disturb', 'bg-destructive'],
    ['offline', 'Offline', 'bg-muted-foreground'],
    ['invisible', 'Invisible', 'bg-muted-foreground'],
  ])('renders %s with a semantic color and accessible status', async (status, label, color) => {
    const fixture = TestBed.createComponent(MemberPresenceIndicator);
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
    const badge = fixture.nativeElement.querySelector('[data-slot="avatar-badge"]') as HTMLElement;
    expect(badge.getAttribute('aria-label')).toBe(label);
    expect(badge.getAttribute('title')).toBe(label);
    expect(badge.classList.contains(color)).toBe(true);
  });

  it('can render a visible text status independently of an avatar', async () => {
    const fixture = TestBed.createComponent(MemberPresenceIndicator);
    fixture.componentRef.setInput('status', 'do_not_disturb');
    fixture.componentRef.setInput('showLabel', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Do not disturb');
    expect(
      fixture.nativeElement
        .querySelector('[data-slot="avatar-badge"]')
        .classList.contains('static'),
    ).toBe(true);
  });
});
