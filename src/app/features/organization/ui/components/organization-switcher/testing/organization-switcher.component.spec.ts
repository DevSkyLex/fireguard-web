import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import type { OrganizationOutput } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { OrganizationStore } from '@features/organization/state';
import type { OrganizationSwitcherOption } from '../models';
import { OrganizationSwitcher } from '../organization-switcher.component';

const organizationWith = (id: string, name: string): OrganizationOutput =>
  ({ id, name, logoUrl: null }) as OrganizationOutput;

const ACME = organizationWith('org-1', 'Acme Sécurité');
const NORTH = organizationWith('org-2', 'North Facilities');

const optionFor = (
  organization: OrganizationOutput,
  active: boolean,
): OrganizationSwitcherOption => ({
  id: organization.id,
  name: organization.name,
  initials: 'XX',
  logoUrl: null,
  active,
});

describe('OrganizationSwitcher', () => {
  let mockRouter: { navigate: ReturnType<typeof vi.fn>; url: string };
  let mockStore: {
    organizations: ReturnType<typeof signal<readonly OrganizationOutput[]>>;
    isLoadingOrganizations: ReturnType<typeof signal<boolean>>;
    loadOrganizations: ReturnType<typeof vi.fn>;
  };
  let mockContext: {
    selectedOrganization: ReturnType<typeof signal<OrganizationOutput | null>>;
    selectedOrganizationId: ReturnType<typeof signal<string | null>>;
  };

  function createComponent(): ReturnType<typeof TestBed.createComponent<OrganizationSwitcher>> {
    const fixture = TestBed.createComponent(OrganizationSwitcher);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    mockRouter = { navigate: vi.fn(), url: '/organizations/org-1' };
    mockStore = {
      organizations: signal<readonly OrganizationOutput[]>([ACME, NORTH]),
      isLoadingOrganizations: signal<boolean>(false),
      loadOrganizations: vi.fn(),
    };
    mockContext = {
      selectedOrganization: signal<OrganizationOutput | null>(ACME),
      selectedOrganizationId: signal<string | null>('org-1'),
    };

    TestBed.configureTestingModule({
      imports: [OrganizationSwitcher],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ORGANIZATION_CONTEXT_PORT, useValue: mockContext },
      ],
    }).overrideComponent(OrganizationSwitcher, {
      set: { providers: [{ provide: OrganizationStore, useValue: mockStore }] },
    });
  });

  it('should offer the switch when the member belongs to several organizations', () => {
    const fixture = createComponent();

    const trigger = fixture.debugElement.query(By.css('[data-testid="organization-switcher"]'));
    expect(trigger).toBeTruthy();
    expect(trigger.nativeElement.textContent).toContain('Acme Sécurité');
  });

  it('should name the organization without offering a switch when there is only one', () => {
    mockStore.organizations.set([ACME]);
    const fixture = createComponent();

    expect(fixture.debugElement.query(By.css('[data-testid="organization-switcher"]'))).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Acme Sécurité');
  });

  it('should load the organizations when nothing has fetched them yet', () => {
    mockStore.organizations.set([]);
    createComponent();

    expect(mockStore.loadOrganizations).toHaveBeenCalledTimes(1);
  });

  it('should keep the current section when switching organization', () => {
    mockRouter.url = '/organizations/org-1/interventions';
    const fixture = createComponent();

    fixture.componentInstance['select'](optionFor(NORTH, false));

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/organizations', 'org-2', 'interventions']);
  });

  it('should carry the section but never the entity id below it', () => {
    mockRouter.url = '/organizations/org-1/interventions/i-42';
    const fixture = createComponent();

    fixture.componentInstance['select'](optionFor(NORTH, false));

    // `i-42` belongs to org-1 and has no counterpart in org-2, so only the
    // section survives the switch.
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/organizations', 'org-2', 'interventions']);
  });

  it('should drop an unknown section entirely', () => {
    mockRouter.url = '/organizations/org-1/not-a-destination';
    const fixture = createComponent();

    fixture.componentInstance['select'](optionFor(NORTH, false));

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/organizations', 'org-2']);
  });

  it('should not navigate when the active organization is picked again', () => {
    const fixture = createComponent();

    fixture.componentInstance['select'](optionFor(ACME, true));

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should send organization creation to the guided setup', () => {
    const fixture = createComponent();

    fixture.componentInstance['createOrganization']();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/onboarding']);
  });
});
