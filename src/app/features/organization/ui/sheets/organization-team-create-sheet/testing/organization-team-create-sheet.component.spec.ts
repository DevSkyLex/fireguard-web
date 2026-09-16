import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { CreateTeamInput } from '@features/organization/models';
import { OrganizationTeamCreateSheet } from '../organization-team-create-sheet.component';

const dialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-team-create-sheet"]');
const nameInput = (): HTMLInputElement | null =>
  dialog()?.querySelector('[data-testid="organization-team-create-name"]') ?? null;

describe('OrganizationTeamCreateSheet', () => {
  const mobileInteractionMode = signal(false);
  beforeEach(() => mobileInteractionMode.set(false));
  let fixture: ComponentFixture<OrganizationTeamCreateSheet>;
  let submissions: CreateTeamInput[];
  let visibilities: boolean[];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            isMobileInteractionMode: mobileInteractionMode,
            interactionMode: () => (mobileInteractionMode() ? 'mobile' : 'desktop'),
          },
        },
        provideZonelessChangeDetection(),
      ],
    });
    fixture = TestBed.createComponent(OrganizationTeamCreateSheet);

    submissions = [];
    visibilities = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    fixture.componentInstance.visibleChange.subscribe((value) => visibilities.push(value));
  });

  it('preserves one mounted Signal Form and its dirty draft when the interaction mode changes', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    const input = nameInput() as HTMLInputElement;
    const form = dialog()?.querySelector('form');
    input.value = 'Field team draft';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance['side']()).toBe('right');
    mobileInteractionMode.set(true);
    await fixture.whenStable();
    expect(fixture.componentInstance['side']()).toBe('bottom');
    expect(nameInput()).toBe(input);
    expect(dialog()?.querySelector('form')).toBe(form);
    expect(nameInput()?.value).toBe('Field team draft');
    expect(fixture.componentInstance['dirty']()).toBe(true);
    mobileInteractionMode.set(false);
    await fixture.whenStable();
    expect(nameInput()).toBe(input);
    expect(dialog()?.querySelectorAll('form')).toHaveLength(1);
    expect(visibilities).toEqual([]);
  });

  it('should render nothing while closed', async () => {
    await fixture.whenStable();

    expect(dialog()).toBeNull();
  });

  it('should render its content once visible', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(dialog()).not.toBeNull();
  });

  it('should forward the hosted form’s submitted payload untouched', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    (nameInput() as HTMLInputElement).value = 'Response team';
    nameInput()?.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    dialog()?.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(submissions).toEqual([{ name: 'Response team', description: undefined }]);
  });

  it('should relay the hosted form’s cancel as visibleChange(false)', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    const cancel: HTMLButtonElement | null | undefined = dialog()?.querySelector(
      '[data-testid="organization-team-create-cancel"]',
    );
    cancel?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(visibilities).toEqual([false]);
  });

  it('should relay a dismissal — escape or the backdrop — as visibleChange(false)', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    fixture.componentInstance['onStateChanged']('closed');

    expect(visibilities).toEqual([false]);
  });

  it('should ignore the echo of a state the page already applied', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    fixture.componentInstance['onStateChanged']('open');

    expect(visibilities).toEqual([]);
  });

  it('should forward pending and serverError to the hosted form', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('pending', true);
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'name', message: 'This team name is already used.' }],
    });
    await fixture.whenStable();

    const submit: HTMLButtonElement | null | undefined = dialog()?.querySelector(
      '[data-testid="organization-team-create-submit"]',
    );

    expect(dialog()?.textContent).toContain('This team name is already used.');
    expect(submit?.disabled).toBe(true);
  });

  it('should disable dismissal while pending', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(fixture.componentInstance['pending']()).toBe(true);
  });

  it('should close right away on cancel while nothing was typed', () => {
    fixture.componentInstance['requestClose']();

    expect(visibilities).toEqual([false]);
  });

  it('should ask before discarding a dirty draft, and close only once confirmed', () => {
    fixture.componentInstance['dirty'].set(true);

    fixture.componentInstance['requestClose']();
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('open');
    expect(visibilities).toEqual([]);

    fixture.componentInstance['onUnsavedChangesDismissed']();
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('closed');
    expect(visibilities).toEqual([]);

    fixture.componentInstance['requestClose']();
    fixture.componentInstance['onUnsavedChangesConfirmed']();
    expect(visibilities).toEqual([false]);
  });

  it('should treat an Escape on a dirty draft as a close request, not a close', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    fixture.componentInstance['dirty'].set(true);

    fixture.componentInstance['onStateChanged']('closed');

    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('open');
    expect(visibilities).toEqual([]);
  });

  it('should forget the dirty flag once the panel closes', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    fixture.componentInstance['dirty'].set(true);

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(fixture.componentInstance['dirty']()).toBe(false);
  });
});
