import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { OrganizationPlanChangeDialog } from '../organization-plan-change-dialog.component';

const dialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-plan-confirm-dialog"]');

const confirmButton = (): HTMLButtonElement | null =>
  dialog()?.querySelector('[data-testid="organization-plan-confirm"]') ?? null;

describe('OrganizationPlanChangeDialog', () => {
  let fixture: ComponentFixture<OrganizationPlanChangeDialog>;
  let emitted: void[];
  let visibilities: boolean[];

  async function open(inputs: Partial<{ planName: string; pending: boolean }> = {}): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationPlanChangeDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('planName', inputs.planName ?? 'Growth');
    fixture.componentRef.setInput('pending', inputs.pending ?? false);
    await fixture.whenStable();

    emitted = [];
    visibilities = [];
    fixture.componentInstance.confirmed.subscribe(() => emitted.push(undefined));
    fixture.componentInstance.visibleChange.subscribe((next) => visibilities.push(next));
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should render nothing while closed', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OrganizationPlanChangeDialog);
    await fixture.whenStable();

    expect(dialog()).toBeNull();
  });

  it('should name the pending plan in the confirmation body', async () => {
    await open({ planName: 'Growth' });

    expect(dialog()?.textContent).toContain('Growth');
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

  it('should report a dismissal as visibleChange(false)', async () => {
    await open();

    fixture.componentInstance['onStateChanged']('closed');
    await fixture.whenStable();

    expect(visibilities).toEqual([false]);
  });
});
