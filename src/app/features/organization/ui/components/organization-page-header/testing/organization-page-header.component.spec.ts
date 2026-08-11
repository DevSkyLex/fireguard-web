import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OrganizationPageHeaderOrganization } from '../models';
import { OrganizationPageHeader } from '../organization-page-header.component';

/**
 * Drives real projected content through `<ng-content>` rather than asserting
 * on `OrganizationPageHeader`'s own template structure.
 */
@Component({
  selector: 'app-organization-page-header-projection-host',
  imports: [OrganizationPageHeader],
  template: `<app-organization-page-header title="Statistics"
    ><button>Export</button></app-organization-page-header
  >`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ProjectionHost {}

function organization(
  overrides: Partial<OrganizationPageHeaderOrganization> = {},
): OrganizationPageHeaderOrganization {
  return { name: 'Acme Corp', ...overrides };
}

describe('OrganizationPageHeader', () => {
  let fixture: ComponentFixture<OrganizationPageHeader>;

  async function render(): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationPageHeader);
    fixture.componentRef.setInput('title', 'Statistics');
    await fixture.whenStable();
  }

  it('renders the page title even before the organization resolves', async () => {
    await render();

    expect(fixture.nativeElement.textContent).toContain('Statistics');
  });

  it('renders skeletons in place of the identity row while organization is null', async () => {
    await render();

    expect(fixture.nativeElement.querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('hlm-avatar')).toBeNull();
  });

  it('renders the organization name and its initials fallback once resolved', async () => {
    await render();
    fixture.componentRef.setInput('organization', organization());
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Acme Corp');
    expect(fixture.nativeElement.textContent).toContain('AC');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('keeps the initials fallback showing until the logo actually loads', async () => {
    await render();
    fixture.componentRef.setInput(
      'organization',
      organization({ logoUrl: 'https://api.test/logo.webp' }),
    );
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('AC');
  });

  it('renders no plan badge when planName is absent', async () => {
    await render();
    fixture.componentRef.setInput('organization', organization());
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('undefined');
  });

  it('renders a plan badge when planName is present', async () => {
    await render();
    fixture.componentRef.setInput('organization', organization({ planName: 'Pro' }));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Pro');
  });

  it('omits the status badge for an active organization', async () => {
    await render();
    fixture.componentRef.setInput('organization', organization({ status: 'active' }));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('active');
  });

  it('renders a status badge with underscores replaced by spaces for a non-active status', async () => {
    await render();
    fixture.componentRef.setInput('organization', organization({ status: 'past_due' }));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('past due');
  });

  it('renders the singular member count line for exactly one member', async () => {
    await render();
    fixture.componentRef.setInput('organization', organization({ memberCount: 1 }));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('1 member');
    expect(fixture.nativeElement.textContent).not.toContain('1 members');
  });

  it('renders the plural member count line for more than one member', async () => {
    await render();
    fixture.componentRef.setInput('organization', organization({ memberCount: 5 }));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('5');
    expect(fixture.nativeElement.textContent).toContain('members');
  });

  it('renders no member count line when the count is absent', async () => {
    await render();
    fixture.componentRef.setInput('organization', organization());
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('member');
  });

  it('renders the subtitle when given', async () => {
    await render();
    fixture.componentRef.setInput('subtitle', 'Trends across the last 30 days');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Trends across the last 30 days');
  });

  it('projects actions content into the actions slot', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    const projectingFixture: ComponentFixture<ProjectionHost> =
      TestBed.createComponent(ProjectionHost);
    await projectingFixture.whenStable();

    expect(projectingFixture.nativeElement.textContent).toContain('Export');
  });
});
