import { provideZonelessChangeDetection, type DebugElement } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrnCombobox } from '@spartan-ng/brain/combobox';
import type {
  InterventionAssignRequest,
  InterventionAssignSubmittedEvent,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';
import { HlmCombobox } from '@shared/ui/combobox';
import { InterventionAssignDialog } from '../intervention-assign-dialog.component';

const members: readonly MemberSelectOption[] = [
  {
    value: '/api/organizations/org-1/members/member-1',
    label: 'Alice Martin',
    displayName: 'Alice Martin',
    roleLabel: 'Technician',
    avatarUrl: null,
    initials: 'AM',
  },
  {
    value: '/api/organizations/org-1/members/member-2',
    label: 'Bruno Costa',
    displayName: 'Bruno Costa',
    roleLabel: 'Supervisor',
    avatarUrl: null,
    initials: 'BC',
  },
];

const request: InterventionAssignRequest = {
  interventionId: 'intervention-1',
  interventionName: 'Autumn extinguisher round',
  currentResponsible: null,
};

const content = (): HTMLElement =>
  document.querySelector('[data-testid="intervention-assign-dialog"]') as HTMLElement;
const inDialog = (selector: string): HTMLElement =>
  content().querySelector(selector) as HTMLElement;
const submitButton = (): HTMLButtonElement =>
  inDialog('[data-testid="intervention-assign-submit"]') as HTMLButtonElement;

/**
 * Minimal ResizeObserver stand-in: the combobox popover observes its anchor,
 * and the test environment provides no implementation.
 */
class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

describe('InterventionAssignDialog', () => {
  let fixture: ComponentFixture<InterventionAssignDialog>;
  let submitted: InterventionAssignSubmittedEvent[];
  let dismissed: number;

  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  const setRequest = async (value: InterventionAssignRequest | null): Promise<void> => {
    fixture.componentRef.setInput('request', value);
    await fixture.whenStable();
  };

  const pickMember = async (value: string): Promise<void> => {
    const combobox: DebugElement = fixture.debugElement.query(By.directive(HlmCombobox));
    combobox.injector.get(BrnCombobox).select(value);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionAssignDialog);
    fixture.componentRef.setInput('members', members);
    await fixture.whenStable();

    submitted = [];
    dismissed = 0;
    fixture.componentInstance.submitted.subscribe((event) => submitted.push(event));
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
  });

  it('should stay closed while no request is pending', () => {
    expect(content()).toBeNull();
  });

  it('should carry the intervention name in the description', async () => {
    await setRequest(request);

    expect(content().textContent).toContain('Autumn extinguisher round');
  });

  it('should offer the candidate members once the combobox opens', async () => {
    await setRequest(request);

    const input: HTMLInputElement = inDialog(
      '[data-testid="intervention-assign-member-input"] input, input#intervention-assign-member',
    ) as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    input.click();
    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(document.body.textContent).toContain('Alice Martin');
  });

  it('should preselect the current responsible', async () => {
    await setRequest({ ...request, currentResponsible: members[1].value });

    expect(submitButton().disabled).toBe(false);

    submitButton().click();

    expect(submitted).toEqual([
      { interventionId: 'intervention-1', responsible: members[1].value },
    ]);
  });

  it('should disable submitting until a member is picked', async () => {
    await setRequest(request);

    expect(submitButton().disabled).toBe(true);

    await pickMember(members[0].value);

    expect(submitButton().disabled).toBe(false);
  });

  it('should disable submitting while busy', async () => {
    await setRequest(request);
    await pickMember(members[0].value);
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
  });

  it('should emit the submitted payload for the picked member', async () => {
    await setRequest(request);
    await pickMember(members[0].value);

    submitButton().click();

    expect(submitted).toEqual([
      { interventionId: 'intervention-1', responsible: members[0].value },
    ]);
  });

  it('keeps the picked responsible and displays server errors for retry', async () => {
    await setRequest(request);
    await pickMember(members[0].value);
    fixture.componentRef.setInput('errors', ['Roof round: access denied']);
    await fixture.whenStable();
    expect(content().textContent).toContain('Roof round: access denied');
    submitButton().click();
    expect(submitted).toEqual([
      { interventionId: 'intervention-1', responsible: members[0].value },
    ]);
  });

  it('blocks Cancel and the picker during an assignment', async () => {
    await setRequest({ ...request, currentResponsible: members[0].value });
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();
    const cancel = Array.from(content().querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Cancel'),
    );
    if (!cancel) throw new Error('Cancel button missing');
    expect(cancel.disabled).toBe(true);
    cancel.click();
    fixture.componentInstance['onStateChanged']('closed');
    fixture.componentInstance['submit']();
    expect(dismissed).toBe(0);
    expect(submitted).toEqual([]);
  });

  it('should reset the selection when a new request opens', async () => {
    await setRequest(request);
    await pickMember(members[0].value);

    await setRequest(null);
    await setRequest(request);

    expect(submitButton().disabled).toBe(true);
  });

  it('should emit dismissed on Cancel without emitting submitted', async () => {
    await setRequest(request);

    const cancelButton: HTMLButtonElement | undefined = Array.from(
      content().querySelectorAll('button'),
    ).find((button: HTMLButtonElement): boolean => button.textContent?.includes('Cancel') ?? false);
    cancelButton?.click();
    await fixture.whenStable();

    expect(dismissed).toBe(1);
    expect(submitted).toEqual([]);
  });
});
