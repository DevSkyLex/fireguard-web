import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OrganizationOutput } from '@features/organization/models';
import { OrganizationDangerZone } from '../organization-danger-zone.component';

const organization = (status: string): OrganizationOutput =>
  ({
    id: 'org-1',
    name: 'Fireguard Paris',
    slug: 'fireguard-paris',
    status,
    isActive: status === 'active',
  }) as OrganizationOutput;

const createComponent = (
  value: OrganizationOutput | null,
): ComponentFixture<OrganizationDangerZone> => {
  TestBed.configureTestingModule({ imports: [OrganizationDangerZone] });

  const fixture = TestBed.createComponent(OrganizationDangerZone);
  fixture.componentRef.setInput('organization', value);
  fixture.detectChanges();
  return fixture;
};

const testId = (
  fixture: ComponentFixture<OrganizationDangerZone>,
  id: string,
): HTMLElement | null => fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

describe('OrganizationDangerZone', () => {
  describe('suspension card', () => {
    it('should offer suspension for an active organization', () => {
      const fixture = createComponent(organization('active'));

      expect(testId(fixture, 'organization-suspend-button')).not.toBeNull();
      expect(testId(fixture, 'organization-reactivate-button')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Suspend this organization');
    });

    it('should offer reactivation for a suspended organization', () => {
      const fixture = createComponent(organization('suspended'));

      expect(testId(fixture, 'organization-reactivate-button')).not.toBeNull();
      expect(testId(fixture, 'organization-suspend-button')).toBeNull();
    });

    // The backend rejects suspending an archived organization, so offering the
    // button would be offering a call that fails.
    it('should offer restoration, not suspension, for an archived organization', () => {
      const fixture = createComponent(organization('archived'));

      expect(testId(fixture, 'organization-suspend-button')).toBeNull();
      expect(testId(fixture, 'organization-reactivate-button')).not.toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Restore this organization');
    });

    it('should emit the requested activity state rather than a status string', () => {
      const fixture = createComponent(organization('active'));
      const emitted: boolean[] = [];
      fixture.componentInstance.activeChange.subscribe((value: boolean) => emitted.push(value));

      testId(fixture, 'organization-suspend-button')?.querySelector('button')?.click();

      expect(emitted).toEqual([false]);
    });

    it('should emit true from the reactivate action', () => {
      const fixture = createComponent(organization('suspended'));
      const emitted: boolean[] = [];
      fixture.componentInstance.activeChange.subscribe((value: boolean) => emitted.push(value));

      testId(fixture, 'organization-reactivate-button')?.querySelector('button')?.click();

      expect(emitted).toEqual([true]);
    });
  });

  describe('archive card', () => {
    // The endpoint archives reversibly — facilities, equipment, inspections and
    // interventions are preserved. The copy used to promise the opposite, which
    // deters people from a safe action.
    it('should describe the destructive action as reversible archival', () => {
      const text: string = createComponent(organization('active')).nativeElement.textContent ?? '';

      expect(text).toContain('Archive this organization');
      expect(text).toContain('Its data is kept');
      expect(text).not.toContain('cannot be undone');
      expect(text).not.toContain('Permanently delete');
    });

    it('should name the organization it is about to archive', () => {
      expect(createComponent(organization('active')).nativeElement.textContent).toContain(
        'Fireguard Paris',
      );
    });
  });

  it('should disable both actions until an organization is resolved', () => {
    const fixture = createComponent(null);

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    );
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((button: HTMLButtonElement) => button.disabled)).toBe(true);
  });
});
