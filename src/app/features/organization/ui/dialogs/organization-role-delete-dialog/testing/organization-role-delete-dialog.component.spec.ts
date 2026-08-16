import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OrganizationRoleDeleteDialog } from '../organization-role-delete-dialog.component';

const dialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-team-delete-dialog"]');

const confirmButton = (): HTMLButtonElement | null =>
  dialog()?.querySelector('[data-testid="organization-team-delete-confirm"]') ?? null;

describe('OrganizationRoleDeleteDialog', () => {
  let fixture: ComponentFixture<OrganizationRoleDeleteDialog>;
  let emitted: void[];
  let visibilities: boolean[];

  async function open(
    inputs: Partial<{ pending: boolean; error: string | null }> = {},
  ): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationRoleDeleteDialog);
    fixture.componentRef.setInput('visible', true);
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
    fixture = TestBed.createComponent(OrganizationRoleDeleteDialog);
    await fixture.whenStable();

    expect(dialog()).toBeNull();
  });

  it('should emit confirmed on the confirm action', async () => {
    await open();

    confirmButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(emitted.length).toBe(1);
  });

  it('should refuse to confirm while pending', async () => {
    await open({ pending: true });

    expect(confirmButton()?.disabled).toBe(true);

    fixture.componentInstance['confirm']();
    await fixture.whenStable();

    expect(emitted.length).toBe(0);
  });

  it('should surface the store error', async () => {
    await open({ error: 'role still assigned' });

    expect(
      dialog()?.querySelector('[data-testid="organization-team-delete-error"]')?.textContent,
    ).toContain('role still assigned');
  });

  it('should report a dismissal as visibleChange(false)', async () => {
    await open();

    fixture.componentInstance['onStateChanged']('closed');
    await fixture.whenStable();

    expect(visibilities).toEqual([false]);
  });
});
