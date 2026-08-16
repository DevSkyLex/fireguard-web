import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OrganizationMemberOutput } from '@features/organization/models';
import { OrganizationMemberRemoveDialog } from '../organization-member-remove-dialog.component';

function member(overrides: Partial<OrganizationMemberOutput> = {}): OrganizationMemberOutput {
  return {
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-1',
    email: 'jane@example.com',
    displayName: 'Jane Doe',
    isActive: true,
    joinedAt: '2026-01-01T00:00:00+00:00',
    roleIds: [],
    ...overrides,
  } as unknown as OrganizationMemberOutput;
}

const dialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-members-remove-dialog"]');

const confirmButton = (): HTMLButtonElement | null =>
  dialog()?.querySelector('[data-testid="organization-members-remove-confirm"]') ?? null;

describe('OrganizationMemberRemoveDialog', () => {
  let fixture: ComponentFixture<OrganizationMemberRemoveDialog>;
  let emitted: void[];
  let visibilities: boolean[];

  async function open(
    inputs: Partial<{
      member: OrganizationMemberOutput | null;
      bulkCount: number | null;
      pending: boolean;
      error: string | null;
    }> = {},
  ): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationMemberRemoveDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('member', inputs.member ?? null);
    fixture.componentRef.setInput('bulkCount', inputs.bulkCount ?? null);
    fixture.componentRef.setInput('pending', inputs.pending ?? false);
    fixture.componentRef.setInput('error', inputs.error ?? null);
    await fixture.whenStable();

    emitted = [];
    visibilities = [];
    fixture.componentInstance.confirmed.subscribe(() => emitted.push(undefined));
    fixture.componentInstance.visibleChange.subscribe((next) => visibilities.push(next));
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should render nothing while closed', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OrganizationMemberRemoveDialog);
    await fixture.whenStable();

    expect(dialog()).toBeNull();
  });

  it('should name the member for a single row removal', async () => {
    await open({ member: member({ email: 'jane@example.com' }) });

    expect(dialog()?.textContent).toContain('jane@example.com');
  });

  it('should show the generic single title for a one-member bulk selection', async () => {
    await open({ bulkCount: 1 });

    expect(dialog()?.textContent).toContain('Remove member?');
  });

  it('should count a multi-member bulk selection', async () => {
    await open({ bulkCount: 3 });

    expect(dialog()?.textContent).toContain('Remove 3 members?');
  });

  it('should emit confirmed on the confirm action', async () => {
    await open({ member: member() });

    confirmButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(emitted.length).toBe(1);
  });

  it('should refuse to confirm while pending', async () => {
    await open({ member: member(), pending: true });

    expect(confirmButton()?.disabled).toBe(true);

    fixture.componentInstance['confirm']();
    await fixture.whenStable();

    expect(emitted.length).toBe(0);
  });

  it('should surface the store error', async () => {
    await open({ member: member(), error: 'cannot remove the last owner' });

    expect(
      dialog()?.querySelector('[data-testid="organization-members-remove-error"]')?.textContent,
    ).toContain('cannot remove the last owner');
  });

  it('should report a dismissal as visibleChange(false)', async () => {
    await open({ member: member() });

    fixture.componentInstance['onStateChanged']('closed');
    await fixture.whenStable();

    expect(visibilities).toEqual([false]);
  });
});
