import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type {
  FacilityMoveRequest,
  FacilityMoveSubmittedEvent,
} from '@features/organization/features/facilities/models';
import { HlmCombobox } from '@shared/ui/combobox';
import { FacilityMoveDialog } from '../facility-move-dialog.component';

const options: ReadonlyArray<{ readonly value: string; readonly label: string }> = [
  { value: 'facility-b', label: 'Building B' },
  { value: 'facility-c', label: 'Building C' },
];

const request: FacilityMoveRequest = { facilityId: 'facility-a', facilityName: 'Building A' };

const content = (): HTMLElement =>
  document.querySelector('[data-testid="facility-move-dialog"]') as HTMLElement;
const inDialog = (selector: string): HTMLElement =>
  content().querySelector(selector) as HTMLElement;
const submitButton = (): HTMLButtonElement =>
  inDialog('[data-testid="facility-move-submit"]') as HTMLButtonElement;

/**
 * Minimal ResizeObserver stand-in: the combobox popover observes its anchor,
 * and the test environment provides no implementation.
 */
class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

describe('FacilityMoveDialog', () => {
  let fixture: ComponentFixture<FacilityMoveDialog>;
  let submitted: FacilityMoveSubmittedEvent[];
  let dismissed: number;

  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  const setRequest = async (value: FacilityMoveRequest | null): Promise<void> => {
    fixture.componentRef.setInput('request', value);
    await fixture.whenStable();
  };

  const pickParent = async (value: string): Promise<void> => {
    const combobox = fixture.debugElement.query(By.directive(HlmCombobox));
    combobox.triggerEventHandler('valueChange', value);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(FacilityMoveDialog);
    fixture.componentRef.setInput('options', options);
    await fixture.whenStable();

    submitted = [];
    dismissed = 0;
    fixture.componentInstance.submitted.subscribe((event) => submitted.push(event));
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
  });

  it('should stay closed while no request is pending', () => {
    expect(content()).toBeNull();
  });

  it('should carry the facility name in the description', async () => {
    await setRequest(request);

    expect(content().textContent).toContain('Building A');
  });

  it('should default to the root option and submit a null parent', async () => {
    await setRequest(request);

    submitButton().click();

    expect(submitted).toEqual([{ facilityId: 'facility-a', parentFacilityId: null }]);
  });

  it('should emit the picked target', async () => {
    await setRequest(request);
    await pickParent('facility-b');

    submitButton().click();

    expect(submitted).toEqual([{ facilityId: 'facility-a', parentFacilityId: 'facility-b' }]);
  });

  it('should disable submitting while busy', async () => {
    await setRequest(request);
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
  });

  it('should reset the selection when a new request opens', async () => {
    await setRequest(request);
    await pickParent('facility-b');

    await setRequest(null);
    await setRequest(request);

    submitButton().click();

    expect(submitted).toEqual([{ facilityId: 'facility-a', parentFacilityId: null }]);
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
