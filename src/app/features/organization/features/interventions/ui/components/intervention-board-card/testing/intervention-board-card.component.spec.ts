import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type {
  InterventionAllowedActionsOutput,
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
import type { InterventionBoardCardViewModel } from '@features/organization/features/interventions/models';
import { InterventionBoardCard } from '../intervention-board-card.component';

const allowedActions = (
  overrides: Partial<InterventionAllowedActionsOutput> = {},
): InterventionAllowedActionsOutput => ({
  canEditDetails: false,
  canEditSite: false,
  canEditResponsible: false,
  canEditPlanning: false,
  canMutateWorkItems: false,
  canMutateChanges: false,
  canAssignTeam: false,
  canManageAttachments: false,
  canSubmit: false,
  canWithdraw: false,
  canDelete: false,
  canPublish: false,
  ...overrides,
});

const intervention = (overrides: Partial<InterventionOutput> = {}): InterventionOutput =>
  ({
    id: 'a1b2',
    organization: '/api/organizations/1',
    number: 42,
    type: 'inventory',
    name: 'Quarterly extinguisher sweep',
    description: null,
    status: 'in_progress',
    allowedTransitions: ['submitted', 'abandoned'],
    allowedActions: allowedActions(),
    site: null,
    responsible: '/api/organizations/org-1/members/member-1',
    participants: [],
    labels: [],
    priority: 'high',
    plannedStartAt: null,
    dueAt: '2020-01-01T09:00:00+00:00',
    reviewNote: null,
    revision: 3,
    facilitiesCount: 0,
    equipmentCount: 0,
    inspectionsCount: 0,
    blockersCount: 0,
    workItemsCount: 0,
    completedWorkItemsCount: 0,
    proposedChangesCount: 0,
    commentsCount: 0,
    hasSignature: false,
    createdAt: '2019-08-01T09:00:00+00:00',
    updatedAt: '2019-08-02T09:00:00+00:00',
    ...overrides,
  }) as InterventionOutput;

const item = (
  overrides: Partial<InterventionBoardCardViewModel> = {},
): InterventionBoardCardViewModel => ({
  intervention: intervention(),
  isOverdue: true,
  responsible: null,
  ...overrides,
});

describe('InterventionBoardCard', () => {
  let fixture: ComponentFixture<InterventionBoardCard>;
  let element: HTMLElement;
  const mobile = signal(false);

  const openMenu = async (): Promise<void> => {
    element
      .querySelector<HTMLButtonElement>('[data-testid="intervention-board-card-menu"]')
      ?.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    mobile.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: INTERACTION_CAPABILITIES_PORT, useValue: { isMobileInteractionMode: mobile } },
      ],
    });

    fixture = TestBed.createComponent(InterventionBoardCard);
    fixture.componentRef.setInput('item', item());
    fixture.componentRef.setInput('detailRouteBase', ['/organizations', 'org-1', 'interventions']);
    fixture.componentRef.setInput('canTransition', true);
    fixture.componentRef.setInput('currentMemberIri', '/api/organizations/org-1/members/member-1');
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('should offer the same allowed move in a mobile drawer without a drag gesture', async () => {
    fixture.componentRef.setInput(
      'item',
      item({
        intervention: intervention({
          allowedActions: allowedActions({ canSubmit: true }),
        }),
      }),
    );
    mobile.set(true);
    await fixture.whenStable();
    const moved: InterventionStatus[] = [];
    fixture.componentInstance.moveRequested.subscribe((status) => {
      expect(document.querySelector('hlm-drawer-content')?.getAttribute('data-state')).toBe('open');
      moved.push(status);
    });
    element
      .querySelector<HTMLButtonElement>('[data-testid="intervention-board-card-mobile-actions"]')
      ?.click();
    await fixture.whenStable();
    const move = document.querySelector<HTMLButtonElement>(
      '[data-testid="intervention-board-card-mobile-move"][data-status="submitted"]',
    );
    expect(document.querySelector('hlm-drawer-content')).not.toBeNull();
    expect(move?.disabled).toBe(false);
    mobile.set(false);
    await fixture.whenStable();
    expect(document.querySelector('hlm-drawer-content')).not.toBeNull();
    move?.click();
    await fixture.whenStable();
    expect(moved).toEqual(['submitted']);
    expect(element.querySelector('[data-testid="intervention-board-card-menu"]')).not.toBeNull();
  });

  it('should link the title to the intervention detail page, with a real href', () => {
    const anchor: HTMLAnchorElement | null = element.querySelector('a');

    expect(anchor?.getAttribute('href')).toBe('/organizations/org-1/interventions/a1b2');
    expect(anchor?.textContent).toContain('FG-42');
    expect(anchor?.textContent).toContain('Quarterly extinguisher sweep');
  });

  it('should mark an overdue deadline with an icon, never with colour alone', () => {
    const icon: Element | null = element.querySelector('ng-icon[name="lucideCircleAlert"]');

    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('aria-label')).toBe('Overdue');
  });

  it('should offer a server-illegal move disabled, with its reason visible and linked', async () => {
    fixture.componentRef.setInput(
      'item',
      item({
        intervention: intervention({
          status: 'submitted',
          allowedTransitions: ['in_progress', 'changes_requested'],
          allowedActions: allowedActions({ canWithdraw: false }),
        }),
      }),
    );
    await fixture.whenStable();
    await openMenu();

    const gated: HTMLButtonElement | null = document.querySelector(
      '[data-testid="intervention-board-card-move"][data-status="in_progress"]',
    );

    expect(gated?.disabled).toBe(true);
    expect(gated?.getAttribute('title'), 'a native title is invisible on touch').toBeNull();

    const reasonId: string | null = gated?.getAttribute('aria-describedby') ?? null;
    expect(reasonId).not.toBeNull();

    const reason: HTMLElement | null = document.getElementById(reasonId as string);
    expect(reason?.textContent).toContain('Only the responsible can withdraw this submission.');
    expect(reason?.classList.contains('sr-only')).toBe(false);
  });

  it('should emit moveRequested only for a legal target', async () => {
    const emitted: InterventionStatus[] = [];
    fixture.componentInstance.moveRequested.subscribe((status: InterventionStatus): void => {
      emitted.push(status);
    });
    await openMenu();

    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="intervention-board-card-move"][data-status="abandoned"]',
      )
      ?.click();

    expect(emitted).toEqual(['abandoned']);
  });

  it('explains why a member outside the intervention team cannot execute it', async () => {
    fixture.componentRef.setInput(
      'item',
      item({
        intervention: intervention({
          status: 'planned',
          allowedTransitions: ['in_progress', 'abandoned'],
          responsible: '/api/organizations/org-1/members/other',
        }),
      }),
    );
    await fixture.whenStable();
    await openMenu();
    const gated = document.querySelector<HTMLButtonElement>(
      '[data-testid="intervention-board-card-move"][data-status="in_progress"]',
    );
    expect(gated?.disabled).toBe(true);
    const reasonId = gated?.getAttribute('aria-describedby');
    expect(reasonId).toBeDefined();
    expect(document.getElementById(reasonId ?? '')?.textContent).toContain(
      'Only the responsible member or a participant can perform this transition.',
    );
  });

  it('should not emit moveRequested for a gated target even when clicked', async () => {
    fixture.componentRef.setInput(
      'item',
      item({
        intervention: intervention({
          status: 'submitted',
          allowedTransitions: ['in_progress'],
          allowedActions: allowedActions({ canWithdraw: false }),
        }),
      }),
    );
    await fixture.whenStable();

    const emitted: InterventionStatus[] = [];
    fixture.componentInstance.moveRequested.subscribe((status: InterventionStatus): void => {
      emitted.push(status);
    });
    await openMenu();

    document
      .querySelector<HTMLButtonElement>(
        '[data-testid="intervention-board-card-move"][data-status="in_progress"]',
      )
      ?.click();

    expect(emitted).toEqual([]);
  });

  it('should disable the menu trigger and announce busy while the card is locked', async () => {
    fixture.componentRef.setInput('locked', true);
    await fixture.whenStable();

    const menuTrigger: HTMLButtonElement | null = element.querySelector(
      '[data-testid="intervention-board-card-menu"]',
    );
    const card: HTMLElement | null = element.querySelector(
      '[data-testid="intervention-board-card"]',
    );

    expect(menuTrigger?.disabled).toBe(true);
    expect(menuTrigger?.getAttribute('aria-label')).toBe('This card is updating.');
    expect(menuTrigger?.getAttribute('aria-busy')).toBe('true');
    expect(menuTrigger?.querySelector('hlm-spinner')).not.toBeNull();
    expect(card?.getAttribute('aria-busy')).toBe('true');
    expect(card?.classList.contains('opacity-60')).toBe(true);
  });

  it('should offer no moves at all when canTransition is false', async () => {
    fixture.componentRef.setInput('canTransition', false);
    await fixture.whenStable();
    await openMenu();

    expect(document.querySelectorAll('[data-testid="intervention-board-card-move"]').length).toBe(
      0,
    );
  });

  it('should render the responsible member when resolved', async () => {
    fixture.componentRef.setInput(
      'item',
      item({
        responsible: {
          value: '/api/organizations/org-1/members/m1',
          label: 'Alex Dupont',
          displayName: 'Alex Dupont',
          roleLabel: 'Technician',
          avatarUrl: null,
          initials: 'AD',
        },
      }),
    );
    await fixture.whenStable();

    expect(element.textContent).toContain('Alex Dupont');
    expect(element.textContent).toContain('AD');
  });
  it('keeps a disabled mobile move open without dispatching a command', async () => {
    mobile.set(true);
    await fixture.whenStable();
    element
      .querySelector<HTMLButtonElement>('[data-testid="intervention-board-card-mobile-actions"]')
      ?.click();
    await fixture.whenStable();
    fixture.componentRef.setInput('locked', true);
    await fixture.whenStable();

    const moved = vi.fn();
    fixture.componentInstance.moveRequested.subscribe(moved);
    document
      .querySelector<HTMLButtonElement>('[data-testid="intervention-board-card-mobile-move"]')
      ?.click();
    expect(fixture.componentInstance['requestMove']('submitted')).toBe(false);
    expect(moved).not.toHaveBeenCalled();
    expect(document.querySelector('hlm-drawer-content')).not.toBeNull();
  });
});
