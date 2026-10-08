import { serviceRequestDraftLeaveGuard } from '../service-request-draft-leave.guard';

describe('serviceRequestDraftLeaveGuard', () => {
  it('keeps an accepted write on its current route', () => {
    const page = { canLeaveDraft: vi.fn().mockReturnValue(false) };
    expect(serviceRequestDraftLeaveGuard(page, {} as never, {} as never, {} as never)).toBe(false);
    expect(page.canLeaveDraft).toHaveBeenCalledOnce();
  });

  it('waits for the owning native editor discard decision', async () => {
    let decide: ((allowed: boolean) => void) | undefined;
    const decision = new Promise<boolean>((resolve) => {
      decide = resolve;
    });
    const page = { canLeaveDraft: () => decision };
    const navigation = serviceRequestDraftLeaveGuard(page, {} as never, {} as never, {} as never);
    expect(navigation).toBe(decision);
    decide?.(false);
    expect(await navigation).toBe(false);
  });
});
