import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OrganizationNotificationSettings } from '@features/organization/models';
import { OrganizationNotificationsForm } from '../organization-notifications-form.component';

const settings = (
  overrides: Partial<OrganizationNotificationSettings> = {},
): OrganizationNotificationSettings => ({
  emailEnabled: true,
  inAppEnabled: true,
  interventionPublished: true,
  interventionAssigned: true,
  inspectionDue: true,
  nonConformityOpened: true,
  nonConformitySlaBreached: true,
  weeklyDigest: true,
  memberInvited: true,
  ...overrides,
});

describe('OrganizationNotificationsForm', () => {
  let fixture: ComponentFixture<OrganizationNotificationsForm>;
  let submissions: OrganizationNotificationSettings[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const weeklyDigestToggle = (): HTMLElement =>
    root().querySelector(
      '[id="org-notif-weekly-digest"][role="switch"], #org-notif-weekly-digest [role="switch"]',
    ) as HTMLElement;

  const click = async (element: HTMLElement): Promise<void> => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationNotificationsForm);
    fixture.componentRef.setInput('notifications', settings());
    await fixture.whenStable();

    submissions = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
  });

  it('should render the weekly digest switch checked from a seed of true', () => {
    expect(weeklyDigestToggle()).not.toBeNull();
    expect(weeklyDigestToggle().getAttribute('data-state')).toBe('checked');
  });

  it('should render the weekly digest switch unchecked from a seed of false', async () => {
    fixture.componentRef.setInput('notifications', settings({ weeklyDigest: false }));
    await fixture.whenStable();

    expect(weeklyDigestToggle().getAttribute('data-state')).toBe('unchecked');
  });

  it('should emit the full policy with weeklyDigest toggled off', async () => {
    await click(weeklyDigestToggle());

    expect(submissions).toEqual([settings({ weeklyDigest: false })]);
  });

  it('should lock the switch while a save is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(weeklyDigestToggle().getAttribute('data-disabled')).toBe('true');
  });
});
