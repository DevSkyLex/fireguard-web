import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OrganizationRegionalSettings } from '@features/organization/models';
import { OrganizationRegionalForm } from '../organization-regional-form.component';

const regional = (
  overrides: Partial<OrganizationRegionalSettings> = {},
): OrganizationRegionalSettings => ({
  timezone: 'Europe/Paris',
  locale: 'fr-FR',
  dateFormat: 'dd/MM/yyyy',
  firstDayOfWeek: 'monday',
  measurementSystem: 'metric',
  ...overrides,
});

class ResizeObserverStub {
  public observe(): void {}
  public unobserve(): void {}
  public disconnect(): void {}
}

describe('OrganizationRegionalForm', () => {
  let fixture: ComponentFixture<OrganizationRegionalForm>;
  let submissions: OrganizationRegionalSettings[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const timezoneInput = (): HTMLInputElement =>
    root().querySelector('[data-testid="org-regional-timezone"]') as HTMLInputElement;
  const localeInput = (): HTMLInputElement =>
    root().querySelector('[data-testid="org-regional-locale"]') as HTMLInputElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="org-regional-submit"]') as HTMLButtonElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;

  const type = async (input: HTMLInputElement, value: string): Promise<void> => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };

  beforeAll(() => {
    globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  });

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OrganizationRegionalForm);
    fixture.componentRef.setInput('regional', regional());
    await fixture.whenStable();
    submissions = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
  });

  it('renders the saved values and does not submit an untouched draft', async () => {
    expect(timezoneInput().value).toBe('Europe/Paris');
    expect(localeInput().value).toBe('fr-FR');
    expect(submitButton().disabled).toBe(true);

    await submit();

    expect(submissions).toEqual([]);
    expect(submitButton().disabled).toBe(true);
  });

  it('requires a timezone and keeps the draft available for correction', async () => {
    await type(timezoneInput(), '');
    await submit();

    expect(submissions).toEqual([]);
    expect(timezoneInput().getAttribute('aria-invalid')).toBe('true');
    expect(root().textContent).toContain('Enter a timezone');
    expect(submitButton().disabled).toBe(true);

    await type(timezoneInput(), 'America/Toronto');
    expect(timezoneInput().getAttribute('aria-invalid')).toBeNull();
    expect(submitButton().disabled).toBe(false);
  });

  it('requires a locale before emitting the complete edited settings', async () => {
    await type(localeInput(), '');
    await submit();
    expect(submissions).toEqual([]);
    expect(localeInput().getAttribute('aria-invalid')).toBe('true');
    expect(root().textContent).toContain('Enter a locale');

    await type(localeInput(), 'en-CA');
    await type(timezoneInput(), 'America/Toronto');
    await submit();

    expect(submissions).toEqual([regional({ locale: 'en-CA', timezone: 'America/Toronto' })]);
  });

  it('blocks a second save while pending and permits submission after it settles', async () => {
    await type(timezoneInput(), 'America/Toronto');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
    expect(submitButton().getAttribute('aria-busy')).toBe('true');
    expect(submitButton().textContent).toContain('Saving…');
    await submit();
    expect(submissions).toEqual([]);

    fixture.componentRef.setInput('pending', false);
    await fixture.whenStable();
    expect(submitButton().disabled).toBe(false);
    await submit();
    expect(submissions).toEqual([regional({ timezone: 'America/Toronto' })]);
  });

  it('re-seeds from a new server value instead of submitting the previous draft', async () => {
    await type(timezoneInput(), 'America/Toronto');
    expect(submitButton().disabled).toBe(false);

    fixture.componentRef.setInput(
      'regional',
      regional({ timezone: 'Asia/Tokyo', locale: 'ja-JP', measurementSystem: 'imperial' }),
    );
    await fixture.whenStable();

    expect(timezoneInput().value).toBe('Asia/Tokyo');
    expect(localeInput().value).toBe('ja-JP');
    expect(fixture.componentInstance['model']()).toEqual(
      regional({ timezone: 'Asia/Tokyo', locale: 'ja-JP', measurementSystem: 'imperial' }),
    );
    expect(submitButton().disabled).toBe(true);
    await submit();
    expect(submissions).toEqual([]);
  });

  it('names known select values and leaves unknown values unlabeled', () => {
    expect(fixture.componentInstance['dateFormatLabel']('yyyy-MM-dd')).toContain('yyyy-MM-dd');
    expect(fixture.componentInstance['firstDayOfWeekLabel']('sunday')).toBe('Sunday');
    expect(fixture.componentInstance['measurementSystemLabel']('imperial')).toBe('Imperial');
    expect(fixture.componentInstance['dateFormatLabel']('unknown')).toBe('');
    expect(fixture.componentInstance['firstDayOfWeekLabel']('unknown')).toBe('');
    expect(fixture.componentInstance['measurementSystemLabel']('unknown')).toBe('');
  });
});
