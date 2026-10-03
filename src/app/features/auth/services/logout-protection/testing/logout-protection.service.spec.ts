import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toast } from '@spartan-ng/brain/sonner';
import { Subject } from 'rxjs';
import type { LogoutPendingWork } from '@features/auth/ports';
import type { LogoutPendingWorkContext } from '@features/auth/ui/dialogs/logout-pending-work-dialog/logout-pending-work-dialog.component';
import { HlmDialogService } from '@shared/ui/dialog';
import { LogoutProtectionService } from '../logout-protection.service';

describe('LogoutProtectionService', () => {
  let service: LogoutProtectionService;
  let closed: Subject<'discard' | 'synchronized' | undefined>;
  let context: LogoutPendingWorkContext;
  let open: ReturnType<typeof vi.fn>;
  let logout: ReturnType<typeof vi.fn<() => void>>;
  let queue: LogoutPendingWork;
  let revision: number;

  beforeEach(() => {
    closed = new Subject();
    revision = 0;
    logout = vi.fn<() => void>();
    queue = {
      hasUnsyncedWork: signal(true),
      count: vi.fn().mockResolvedValue(2),
      synchronize: vi.fn().mockResolvedValue(undefined),
    };
    open = vi.fn((_component: unknown, options: { context: LogoutPendingWorkContext }) => {
      context = options.context;
      return { closed$: closed.asObservable() };
    });
    TestBed.configureTestingModule({
      providers: [LogoutProtectionService, { provide: HlmDialogService, useValue: { open } }],
    });
    service = TestBed.inject(LogoutProtectionService);
    vi.spyOn(toast, 'error').mockImplementation(() => 'test-toast');
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('signs out without a dialog when no durable work exists', async () => {
    await service.requestLogout(logout, () => true);
    expect(logout).toHaveBeenCalledOnce();
    expect(open).not.toHaveBeenCalled();
    expect(service.checking()).toBe(false);
  });

  it('retains the session and all local work after cancellation', async () => {
    service.register(queue);
    const request = service.requestLogout(logout, () => true);
    await vi.waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(context.count).toBe(2);
    closed.next(undefined);
    await request;
    expect(logout).not.toHaveBeenCalled();
    expect(queue.synchronize).not.toHaveBeenCalled();
  });

  it('permits the normal logout lifecycle only after explicit discard', async () => {
    service.register(queue);
    const request = service.requestLogout(logout, () => true);
    await vi.waitFor(() => expect(open).toHaveBeenCalledOnce());
    closed.next('discard');
    await request;
    expect(logout).toHaveBeenCalledOnce();
    expect(queue.synchronize).not.toHaveBeenCalled();
  });

  it('counts failed and conflicted work after replay instead of trusting a successful sync promise', async () => {
    service.register(queue);
    const request = service.requestLogout(logout, () => true);
    await vi.waitFor(() => expect(open).toHaveBeenCalledOnce());
    expect(await context.synchronize()).toBe(2);
    expect(queue.synchronize).toHaveBeenCalledOnce();
    closed.next('synchronized');
    await request;
    expect(logout).not.toHaveBeenCalled();
  });

  it('permits logout after synchronization has durably emptied the queue', async () => {
    service.register(queue);
    const request = service.requestLogout(logout, () => true);
    await vi.waitFor(() => expect(open).toHaveBeenCalledOnce());
    vi.mocked(queue.count).mockResolvedValue(0);
    expect(await context.synchronize()).toBe(0);
    closed.next('synchronized');
    await request;
    expect(logout).toHaveBeenCalledOnce();
  });

  it('fails closed when local storage cannot be inspected', async () => {
    vi.mocked(queue.count).mockRejectedValue(
      new DOMException('Quota exhausted', 'QuotaExceededError'),
    );
    service.register(queue);
    await service.requestLogout(logout, () => true);
    expect(logout).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledOnce();
    expect(service.checking()).toBe(false);
  });

  it('ignores confirmation after a session change including A-B-A', async () => {
    service.register(queue);
    const request = service.requestLogout(logout, () => revision === 0);
    await vi.waitFor(() => expect(open).toHaveBeenCalledOnce());
    revision += 2;
    closed.next('discard');
    await request;
    expect(logout).not.toHaveBeenCalled();
    await expect(context.synchronize()).rejects.toThrow('session changed');
    expect(queue.synchronize).not.toHaveBeenCalled();
  });

  it('does not open a second review while the first remains pending', async () => {
    service.register(queue);
    const request = service.requestLogout(logout, () => true);
    await vi.waitFor(() => expect(open).toHaveBeenCalledOnce());
    await service.requestLogout(logout, () => true);
    expect(open).toHaveBeenCalledOnce();
    closed.next(undefined);
    await request;
  });

  it('removes queue registrations when their owner is destroyed', async () => {
    const unregister = service.register(queue);
    unregister();
    await service.requestLogout(logout, () => true);
    expect(queue.count).not.toHaveBeenCalled();
    expect(logout).toHaveBeenCalledOnce();
  });

  it('combines intervention and messaging indicators including blocked work', async () => {
    const intervention = signal(false);
    const messaging = signal(true);
    service.register({
      ...queue,
      hasUnsyncedWork: intervention,
      count: vi.fn().mockResolvedValue(0),
    });
    const unregister = service.register({ ...queue, hasUnsyncedWork: messaging });
    expect(service.hasUnsyncedWork()).toBe(true);
    expect(await service.countPendingWork()).toBe(2);
    messaging.set(false);
    expect(service.hasUnsyncedWork()).toBe(false);
    intervention.set(true);
    expect(service.hasUnsyncedWork()).toBe(true);
    unregister();
    expect(await service.countPendingWork()).toBe(0);
  });

  it('rejects persisted inspection when any registered queue cannot be read', async () => {
    service.register({
      ...queue,
      count: vi.fn().mockRejectedValue(new Error('Storage unavailable')),
    });
    await expect(service.countPendingWork()).rejects.toThrow('Storage unavailable');
  });
});
