import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  type CallState,
} from '@core/request-state';
import type { OrganizationOutput } from '@features/organization/models';
import { MY_ORGANIZATIONS_PORT, type MyOrganizationsPort } from '@features/organization/ports';
import { AccountOrganizationsPage } from '../account-organizations-page.component';

function organization(overrides: Partial<OrganizationOutput> = {}): OrganizationOutput {
  return {
    '@id': '/api/organizations/org-1',
    '@type': 'Organization',
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    ownerUserId: 'user-1',
    createdByUserId: 'user-1',
    status: 'active',
    isActive: true,
    isOwner: false,
    memberCount: 1,
    planName: null,
    logoUrl: null,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  } as unknown as OrganizationOutput;
}

describe('AccountOrganizationsPage', () => {
  let fixture: ComponentFixture<AccountOrganizationsPage>;
  let organizations: WritableSignal<ReadonlyArray<OrganizationOutput>>;
  let isLoadingOrganizations: WritableSignal<boolean>;
  let leaveCallState: WritableSignal<CallState<void>>;
  let activeOrganizationId: WritableSignal<string | null>;
  let loadOrganizations: ReturnType<typeof vi.fn>;
  let leave: ReturnType<typeof vi.fn>;
  let resetLeaveOperation: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  const byTestId = (id: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${id}"]`);

  async function createPage(): Promise<void> {
    const port: MyOrganizationsPort = {
      organizations,
      isLoadingOrganizations,
      isLeaving: () => leaveCallState().status === 'pending',
      leaveError: () => leaveCallState().error,
      leaveCallState,
      activeOrganizationId,
      loadOrganizations,
      leave,
      resetLeaveOperation,
    } as unknown as MyOrganizationsPort;

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: MY_ORGANIZATIONS_PORT, useValue: port },
      ],
    });

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as never;

    fixture = TestBed.createComponent(AccountOrganizationsPage);
    await fixture.whenStable();
  }

  beforeEach(() => {
    organizations = signal<ReadonlyArray<OrganizationOutput>>([
      organization({ id: 'org-1', name: 'Acme Corp' }),
      organization({ id: 'org-2', name: 'Globex' }),
    ]);
    isLoadingOrganizations = signal<boolean>(false);
    leaveCallState = signal<CallState<void>>(idleCallState());
    activeOrganizationId = signal<string | null>('org-1');
    loadOrganizations = vi.fn();
    leave = vi.fn();
    resetLeaveOperation = vi.fn();
  });

  it('should load the caller organization list on init', async () => {
    await createPage();

    expect(loadOrganizations).toHaveBeenCalledTimes(1);
  });

  it('should render a loading skeleton while the list is loading and still empty', async () => {
    organizations.set([]);
    isLoadingOrganizations.set(true);
    await createPage();

    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
  });

  it('should render an empty state once loading settles with no memberships', async () => {
    organizations.set([]);
    isLoadingOrganizations.set(false);
    await createPage();

    expect(
      fixture.nativeElement.querySelector('[data-slot="empty"]:not([role="alert"])'),
    ).not.toBeNull();
  });

  it('should open the leave dialog for the picked organization, resetting the leave operation', async () => {
    await createPage();

    byTestId('account-organizations-leave-open')?.click();
    await fixture.whenStable();

    expect(resetLeaveOperation).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance['confirmingLeaveId']()).toBe('org-1');
  });

  it('should leave the active organization and navigate back to /organizations once it succeeds', async () => {
    await createPage();
    fixture.componentInstance['openLeaveDialog']('org-1');
    fixture.componentInstance['confirmLeave']();

    expect(leave).toHaveBeenCalledWith('org-1');

    leaveCallState.set(pendingCallState());
    await fixture.whenStable();
    leaveCallState.set(successCallState(undefined));
    await fixture.whenStable();

    expect(fixture.componentInstance['confirmingLeaveId']()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/organizations']);
  });

  it('should leave a non-active organization without navigating away', async () => {
    await createPage();
    fixture.componentInstance['openLeaveDialog']('org-2');
    fixture.componentInstance['confirmLeave']();

    expect(leave).toHaveBeenCalledWith('org-2');

    leaveCallState.set(pendingCallState());
    await fixture.whenStable();
    leaveCallState.set(successCallState(undefined));
    await fixture.whenStable();

    expect(fixture.componentInstance['confirmingLeaveId']()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should close the dialog on a dismissal without leaving', async () => {
    await createPage();
    fixture.componentInstance['openLeaveDialog']('org-1');

    fixture.componentInstance['onLeaveDialogVisibleChange'](false);

    expect(fixture.componentInstance['confirmingLeaveId']()).toBeNull();
    expect(leave).not.toHaveBeenCalled();
  });

  it('should mark the row matching activeOrganizationId as active', async () => {
    await createPage();

    expect(fixture.componentInstance['isActive'](organization({ id: 'org-1' }))).toBe(true);
    expect(fixture.componentInstance['isActive'](organization({ id: 'org-2' }))).toBe(false);
  });
});
