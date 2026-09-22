import { PLATFORM_ID, computed, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import {
  ActiveChecklistStore,
  ChecklistStore,
} from '@features/organization/features/checklists/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ChecklistDetailPage } from '../checklist-detail-page.component';

const checklist = (overrides: Partial<ChecklistOutput> = {}): ChecklistOutput =>
  ({
    '@id': '/api/organizations/org-1/checklists/checklist-1',
    '@type': 'Checklist',
    id: 'checklist-1',
    organizationId: 'org-1',
    name: 'Fire safety',
    version: '1.0',
    status: 'active',
    items: [],
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    ...overrides,
  }) as ChecklistOutput;

describe('ChecklistDetailPage', () => {
  let fixture: ComponentFixture<ChecklistDetailPage>;
  const selectedChecklist = signal<ChecklistOutput | null>(null);
  const writeAllowed = signal(true);
  const createCallState = signal<CallState<ChecklistOutput | null>>(idleCallState());
  const updateCallState = signal<CallState<ChecklistOutput | null>>(idleCallState());
  const active = { selectedChecklist, clear: vi.fn(), resolveChecklist: vi.fn() };
  const store = {
    createCallState,
    updateCallState,
    isCreating: computed(() => createCallState().status === 'pending'),
    isUpdating: computed(() => updateCallState().status === 'pending'),
    create: vi.fn(),
    update: vi.fn(),
  };
  const permissions = { hasPermission: vi.fn() };
  const router = { navigate: vi.fn() };

  const createPage = async (
    id: string | null = 'checklist-1',
    platform: 'browser' | 'server' = 'browser',
  ): Promise<ChecklistDetailPage> => {
    if (platform === 'server') vi.stubGlobal('ngServerMode', true);
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: OrganizationPermissionService, useValue: permissions },
        { provide: Router, useValue: router },
      ],
    }).overrideComponent(ChecklistDetailPage, {
      set: {
        template: '',
        imports: [],
        providers: [
          { provide: ActiveChecklistStore, useValue: active },
          { provide: ChecklistStore, useValue: store },
        ],
      },
    });
    fixture = TestBed.createComponent(ChecklistDetailPage);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('checklistId', id ?? undefined);
    await fixture.whenStable();
    return fixture.componentInstance;
  };

  beforeEach(() => {
    vi.resetAllMocks();
    selectedChecklist.set(null);
    writeAllowed.set(true);
    createCallState.set(idleCallState());
    updateCallState.set(idleCallState());
    permissions.hasPermission.mockImplementation(() => writeAllowed());
    active.resolveChecklist.mockReturnValue(of(checklist()));
    router.navigate.mockResolvedValue(true);
  });

  afterEach(() => {
    fixture?.destroy();
    vi.unstubAllGlobals();
  });

  it('resolves only the route checklist in the browser and clears the old selection first', async () => {
    await createPage();
    expect(active.clear).toHaveBeenCalledOnce();
    expect(active.resolveChecklist).toHaveBeenCalledExactlyOnceWith('org-1', 'checklist-1');
    expect(active.clear.mock.invocationCallOrder[0]).toBeLessThan(
      active.resolveChecklist.mock.invocationCallOrder[0],
    );
  });

  it('does not read or clear authenticated checklist state during SSR', async () => {
    await createPage('checklist-1', 'server');
    expect(active.resolveChecklist).not.toHaveBeenCalled();
    expect(active.clear).not.toHaveBeenCalled();
  });

  it('cancels the previous read and resets dirty state when the route scope changes', async () => {
    const cancelRead = vi.fn();
    active.resolveChecklist.mockReturnValue(new Observable<ChecklistOutput>(() => cancelRead));
    const page = await createPage();
    page['dirty'].set(true);
    fixture.componentRef.setInput('organizationId', 'org-2');
    fixture.componentRef.setInput('checklistId', 'checklist-2');
    await fixture.whenStable();
    expect(cancelRead).toHaveBeenCalledOnce();
    expect(active.resolveChecklist).toHaveBeenLastCalledWith('org-2', 'checklist-2');
    expect(page['dirty']()).toBe(false);
    fixture.destroy();
    expect(cancelRead).toHaveBeenCalledTimes(2);
  });

  it('handles a failed read and lets the operator retry the same resource', async () => {
    active.resolveChecklist.mockReturnValue(throwError(() => new Error('Unavailable')));
    const page = await createPage();
    page['reload']();
    expect(active.resolveChecklist).toHaveBeenCalledTimes(2);
    expect(active.resolveChecklist).toHaveBeenLastCalledWith('org-1', 'checklist-1');
  });

  it('does not resolve or retry a nonexistent item on the creation route', async () => {
    const page = await createPage(null);
    expect(active.resolveChecklist).not.toHaveBeenCalled();
    page['reload']();
    expect(active.resolveChecklist).not.toHaveBeenCalled();
  });

  it('submits an existing checklist through the scoped update command', async () => {
    const page = await createPage();
    selectedChecklist.set(checklist());
    page['save']({ name: 'Updated fire safety', items: [] });
    expect(permissions.hasPermission).toHaveBeenCalledWith(
      ORGANIZATION_PERMISSION.INSPECTION_WRITE,
    );
    expect(store.update).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-1',
      checklistId: 'checklist-1',
      input: { name: 'Updated fire safety', items: [] },
    });
    expect(store.create).not.toHaveBeenCalled();
  });

  it('creates a checklist with stable defaults when optional values are absent', async () => {
    const page = await createPage(null);
    page['save']({});
    expect(store.create).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-1',
      input: { name: '', version: '1.0', items: [] },
    });
    expect(store.update).not.toHaveBeenCalled();
  });

  it.each(['permission', 'archive', 'pending-create', 'pending-update'] as const)(
    'refuses a write blocked by %s',
    async (reason) => {
      const page = await createPage();
      selectedChecklist.set(checklist());
      if (reason === 'permission') writeAllowed.set(false);
      if (reason === 'archive') selectedChecklist.set(checklist({ status: 'archived' }));
      if (reason === 'pending-create') createCallState.set(pendingCallState());
      if (reason === 'pending-update') updateCallState.set(pendingCallState());
      page['save']({ name: 'Unauthorized change' });
      expect(store.update).not.toHaveBeenCalled();
      expect(store.create).not.toHaveBeenCalled();
    },
  );

  it('keeps a failed draft and clears it only after successful update', async () => {
    const page = await createPage();
    page['dirty'].set(true);
    updateCallState.set(errorCallState(toStoreError(new Error('Conflict'))));
    await fixture.whenStable();
    expect(page.hasUnsavedChanges()).toBe(true);
    updateCallState.set(successCallState(checklist()));
    await fixture.whenStable();
    expect(page.hasUnsavedChanges()).toBe(false);
  });

  it('replaces the creation URL only after successful persistence', async () => {
    const page = await createPage(null);
    page['dirty'].set(true);
    createCallState.set(errorCallState(toStoreError(new Error('Duplicate'))));
    await fixture.whenStable();
    expect(router.navigate).not.toHaveBeenCalled();
    createCallState.set(successCallState(checklist({ id: 'new-checklist' })));
    await fixture.whenStable();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(
      ['/organizations', 'org-1', 'checklists', 'new-checklist'],
      { replaceUrl: true },
    );
    expect(page.hasUnsavedChanges()).toBe(false);
  });

  it('uses the owning collection route when returning to the library', async () => {
    const page = await createPage();
    page['back']();
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith([
      '/organizations',
      'org-1',
      'checklists',
    ]);
  });

  it('refuses deactivation while saving and resolves one explicit discard decision', async () => {
    const page = await createPage();
    createCallState.set(pendingCallState());
    expect(page.hasUnsavedChanges()).toBe(true);
    await expect(page.confirmDeactivation()).resolves.toBe(false);
    expect(page['discardOpen']()).toBe(false);
    createCallState.set(idleCallState());
    page['dirty'].set(true);
    const decision = page.confirmDeactivation();
    expect(page['discardOpen']()).toBe(true);
    page['resolveLeave'](false);
    page['resolveLeave'](true);
    await expect(decision).resolves.toBe(false);
    expect(page['discardOpen']()).toBe(false);
  });

  it('protects browser unload for dirty work but permits a clean page to leave', async () => {
    const page = await createPage();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    page['dirty'].set(true);
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});
