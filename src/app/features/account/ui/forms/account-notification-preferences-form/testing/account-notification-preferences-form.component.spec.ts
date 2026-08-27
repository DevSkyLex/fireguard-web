import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AccountNotificationPreferencesForm } from '../account-notification-preferences-form.component';
import type {
  AccountNotificationPreferenceRow,
  AccountNotificationPreferenceToggle,
} from '../models';

const ROWS: ReadonlyArray<AccountNotificationPreferenceRow> = [
  { category: 'intervention', label: 'Intervention', emailEnabled: true, mercureEnabled: true },
  {
    category: 'non_conformity',
    label: 'Non conformity',
    emailEnabled: false,
    mercureEnabled: true,
  },
];

describe('AccountNotificationPreferencesForm', () => {
  let fixture: ComponentFixture<AccountNotificationPreferencesForm>;
  let toggles: AccountNotificationPreferenceToggle[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const switchFor = (testId: string): HTMLElement =>
    root().querySelector(`[data-testid="${testId}"] [role="switch"]`) as HTMLElement;

  const click = async (element: HTMLElement): Promise<void> => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(AccountNotificationPreferencesForm);
    fixture.componentRef.setInput('rows', ROWS);
    await fixture.whenStable();

    toggles = [];
    fixture.componentInstance.toggled.subscribe((value) => toggles.push(value));
  });

  it('should render one table row per category with both channel switches', () => {
    const labels: string[] = Array.from(root().querySelectorAll('tbody th[scope="row"]')).map(
      (cell: Element): string => cell.textContent?.trim() ?? '',
    );

    expect(labels).toEqual(['Intervention', 'Non conformity']);
    expect(switchFor('notif-pref-email-intervention')).not.toBeNull();
    expect(switchFor('notif-pref-in-app-intervention')).not.toBeNull();
    expect(switchFor('notif-pref-email-non_conformity')).not.toBeNull();
    expect(switchFor('notif-pref-in-app-non_conformity')).not.toBeNull();
  });

  it('should reflect the effective flags on the switches', () => {
    expect(switchFor('notif-pref-email-non_conformity').getAttribute('data-state')).toBe(
      'unchecked',
    );
    expect(switchFor('notif-pref-in-app-non_conformity').getAttribute('data-state')).toBe(
      'checked',
    );
  });

  it('should emit the complete row values when the email switch flips', async () => {
    await click(switchFor('notif-pref-email-intervention'));

    expect(toggles).toEqual([
      { category: 'intervention', emailEnabled: false, mercureEnabled: true },
    ]);
  });

  it('should emit the complete row values when the in-app switch flips', async () => {
    await click(switchFor('notif-pref-in-app-non_conformity'));

    expect(toggles).toEqual([
      { category: 'non_conformity', emailEnabled: false, mercureEnabled: false },
    ]);
  });

  it('should not emit while a commit is already in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    await click(switchFor('notif-pref-email-intervention'));

    expect(toggles).toEqual([]);
  });

  it('should mark every switch aria-disabled while pending, never natively disabled', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const hosts: Element[] = Array.from(root().querySelectorAll('hlm-switch'));

    expect(hosts.length).toBe(4);
    for (const host of hosts) {
      expect(host.getAttribute('aria-disabled')).toBe('true');
    }
    // WCAG 2.4.3: the focused switch must survive the in-flight lock, so never natively disabled
    expect(root().querySelector('[role="switch"][data-disabled="true"]')).toBeNull();
  });

  it('should re-seed the edited model when the rows input changes', async () => {
    await click(switchFor('notif-pref-email-intervention'));
    expect(switchFor('notif-pref-email-intervention').getAttribute('data-state')).toBe('unchecked');

    fixture.componentRef.setInput('rows', [
      { category: 'intervention', label: 'Intervention', emailEnabled: true, mercureEnabled: true },
    ]);
    await fixture.whenStable();

    expect(switchFor('notif-pref-email-intervention').getAttribute('data-state')).toBe('checked');
  });
});
