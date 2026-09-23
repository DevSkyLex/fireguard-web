import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { errorCallState, idleCallState, toStoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  AutomationAttemptOutput,
  AutomationPolicyOutput,
} from '@features/organization/features/automations/models';
import { AutomationExecutionsStore } from '@features/organization/features/automations/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { AutomationsPage } from '../automations-page.component';

const attempt = (overrides: Partial<AutomationAttemptOutput> = {}): AutomationAttemptOutput => ({
  '@id': '/api/automation-attempts/attempt-1',
  '@type': 'AutomationAttempt',
  id: 'attempt-1',
  runId: 'run-1',
  organizationId: 'org-1',
  ruleKey: 'critical_non_conformity',
  subjectId: 'nc-1',
  attemptNumber: 1,
  status: 'failed',
  createdAt: '2026-09-23T08:00:00Z',
  finishedAt: '2026-09-23T08:01:00Z',
  requestedBy: null,
  interventionId: null,
  errorCode: 'temporarily_unavailable',
  canRetry: true,
  ...overrides,
});

describe('AutomationsPage', () => {
  let fixture: ComponentFixture<AutomationsPage>;
  const organizationId = signal<string | null>('org-1');
  const policy = signal<AutomationPolicyOutput | null>(null);
  const attempts = signal<readonly AutomationAttemptOutput[]>([]);
  const listCallState = signal(idleCallState());
  const retryCallState = signal(idleCallState());
  const loading = signal(false);
  const retrying = signal(false);
  const page = signal(1);
  const pageCount = signal(1);
  const total = signal(0);
  const load = vi.fn();
  const refresh = vi.fn();
  const retry = vi.fn();
  const hasPermission = vi.fn<(permission: string) => boolean>();

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    organizationId.set('org-1');
    policy.set(null);
    attempts.set([]);
    listCallState.set(idleCallState());
    retryCallState.set(idleCallState());
    loading.set(false);
    retrying.set(false);
    page.set(1);
    pageCount.set(1);
    total.set(0);
    load.mockReset();
    refresh.mockReset();
    retry.mockReset();
    hasPermission.mockReset();
    hasPermission.mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganizationId: organizationId },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission } },
      ],
    });
    TestBed.overrideComponent(AutomationsPage, {
      remove: { providers: [AutomationExecutionsStore] },
      add: {
        providers: [
          {
            provide: AutomationExecutionsStore,
            useValue: {
              policy,
              attemptEntities: attempts,
              listCallState,
              retryCallState,
              isLoading: loading,
              isRetrying: retrying,
              page,
              pageCount,
              total,
              load,
              refresh,
              retry,
            },
          },
        ],
      },
    });
    fixture = TestBed.createComponent(AutomationsPage);
    await fixture.whenStable();
  });

  it('loads browser history for the selected workspace and reloads after a workspace switch', async () => {
    expect(load).toHaveBeenLastCalledWith({ organizationId: 'org-1', page: 1 });

    organizationId.set('org-2');
    await fixture.whenStable();
    expect(load).toHaveBeenLastCalledWith({ organizationId: 'org-2', page: 1 });
  });

  it('shows the effective policy while gating its settings link by permission', async () => {
    const activePolicy: AutomationPolicyOutput = {
      '@id': '/api/organizations/org-1/automation-policy',
      '@type': 'AutomationPolicy',
      id: 'policy-1',
      ruleKey: 'critical_non_conformity',
      enabled: true,
      canManage: true,
    };
    policy.set(activePolicy);
    await fixture.whenStable();
    expect(root().querySelector('[data-testid="automation-policy"]')?.textContent).toContain(
      'Enabled',
    );
    expect(root().querySelector('a[href*="settings"]')).toBeNull();

    hasPermission.mockImplementation(
      (permission) => permission === ORGANIZATION_PERMISSION.SETTINGS_WRITE,
    );
    policy.set({ ...activePolicy, enabled: false });
    await fixture.whenStable();
    expect(root().querySelector('[data-testid="automation-policy"]')?.textContent).toContain(
      'Disabled',
    );
    expect(root().querySelector('a[href*="settings"]')?.getAttribute('href')).toContain(
      'tab=compliance',
    );
  });

  it('shows retryable failures and opens a created intervention only with read access', async () => {
    const failed = attempt({ interventionId: 'intervention-1' });
    attempts.set([failed, attempt({ id: 'attempt-2', status: 'running', canRetry: false })]);
    total.set(2);
    await fixture.whenStable();

    expect(root().querySelectorAll('[data-testid="automation-attempt"]')).toHaveLength(2);
    expect(root().textContent).toContain('Failed');
    expect(root().textContent).toContain('Running');
    expect(root().querySelector('a[href*="interventions"]')).toBeNull();

    const button = root().querySelector<HTMLButtonElement>('[data-testid="automation-retry"]');
    button?.click();
    expect(retry).toHaveBeenCalledExactlyOnceWith(failed);

    hasPermission.mockImplementation(
      (permission) => permission === ORGANIZATION_PERMISSION.INTERVENTIONS_READ,
    );
    attempts.set([failed]);
    await fixture.whenStable();
    expect(root().querySelector('a[href*="interventions"]')?.getAttribute('href')).toBe(
      '/organizations/org-1/interventions/intervention-1',
    );
  });

  it('keeps recovery and pagination available after a list failure', async () => {
    listCallState.set(errorCallState(toStoreError(new Error('History unavailable'))));
    total.set(30);
    pageCount.set(3);
    page.set(2);
    await fixture.whenStable();
    expect(root().querySelector('[role="alert"]')?.textContent).toContain('History unavailable');
    expect(root().textContent).not.toContain('No execution yet');

    root().querySelector<HTMLButtonElement>('[data-testid="automation-refresh"]')?.click();
    const pageButtons = Array.from(root().querySelectorAll<HTMLButtonElement>('nav button'));
    pageButtons[0]?.click();
    pageButtons[1]?.click();
    expect(refresh.mock.calls.map(([requested]) => requested)).toEqual([2, 1, 3]);

    loading.set(true);
    await fixture.whenStable();
    expect(
      root().querySelector<HTMLButtonElement>('[data-testid="automation-refresh"]')?.disabled,
    ).toBe(true);
    expect(pageButtons.every((button) => button.disabled)).toBe(true);
  });
});
