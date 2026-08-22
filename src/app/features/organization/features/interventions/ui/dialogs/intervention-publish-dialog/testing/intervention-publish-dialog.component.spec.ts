import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionPublishDialog } from '../intervention-publish-dialog.component';

const intervention: InterventionOutput = {
  '@id': '/api/interventions/intervention-1',
  '@type': 'Intervention',
  id: 'intervention-1',
  name: 'Annual inspection',
  status: 'submitted',
  revision: 4,
  inspectionsCount: 3,
  hasSignature: true,
} as InterventionOutput;

const content = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-detail-publish-dialog"]');
const confirmButton = (): HTMLButtonElement =>
  content()?.querySelector(
    '[data-testid="intervention-detail-publish-confirm"]',
  ) as HTMLButtonElement;
const recheckButton = (): HTMLButtonElement | null =>
  content()?.querySelector('[data-testid="intervention-detail-publish-recheck"]') ?? null;

describe('InterventionPublishDialog', () => {
  let fixture: ComponentFixture<InterventionPublishDialog>;
  let confirmed: number;
  let dismissed: number;
  let recheckRequested: number;

  const setVisible = async (visible: boolean): Promise<void> => {
    fixture.componentRef.setInput('visible', visible);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionPublishDialog);
    fixture.componentRef.setInput('intervention', intervention);
    fixture.componentRef.setInput('pendingChangesCount', 2);
    await fixture.whenStable();

    confirmed = 0;
    dismissed = 0;
    recheckRequested = 0;
    fixture.componentInstance.confirmed.subscribe(() => confirmed++);
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);
    fixture.componentInstance.recheckRequested.subscribe(() => recheckRequested++);
  });

  it('should stay closed until visible is set', () => {
    expect(content()).toBeNull();
  });

  it('should render the recap fed by the same signals as the rail', async () => {
    await setVisible(true);

    expect(content()?.querySelector('app-intervention-publication-summary')).not.toBeNull();
  });

  it('should show the destructive alert when publicationError is set', async () => {
    fixture.componentRef.setInput('publicationError', 'A facility was locked.');
    await setVisible(true);

    expect(
      content()?.querySelector('[data-testid="intervention-detail-publish-error"]')?.textContent,
    ).toContain('A facility was locked.');
  });

  it('should offer "Check again" only once the publication timed out, hiding the confirm button', async () => {
    fixture.componentRef.setInput('publicationTimedOut', true);
    await setVisible(true);

    expect(recheckButton()).not.toBeNull();
    expect(
      content()?.querySelector('[data-testid="intervention-detail-publish-confirm"]'),
    ).toBeNull();

    recheckButton()?.click();

    expect(recheckRequested).toBe(1);
  });

  it('should emit confirmed on Publish', async () => {
    await setVisible(true);

    confirmButton().click();

    expect(confirmed).toBe(1);
  });

  it('should disable Publish while a request is already running', async () => {
    fixture.componentRef.setInput('publishing', true);
    await setVisible(true);

    expect((confirmButton() as HTMLButtonElement).disabled).toBe(true);

    confirmButton().click();

    expect(confirmed).toBe(0);
  });

  it('should relay a dismissal from the overlay', async () => {
    await setVisible(true);

    fixture.componentInstance['onStateChanged']('closed');

    expect(dismissed).toBe(1);
  });
});
