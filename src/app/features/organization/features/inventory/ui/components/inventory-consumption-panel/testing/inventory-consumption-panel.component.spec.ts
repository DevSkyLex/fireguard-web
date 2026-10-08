import { TestBed } from '@angular/core/testing';
import type {
  DeclareInventoryConsumptionInput,
  InventoryConsumptionIntent,
  InventoryConsumptionOutput,
} from '@features/organization/features/inventory/models';
import { InventoryConsumptionPanel } from '../inventory-consumption-panel.component';

describe('InventoryConsumptionPanel', () => {
  const draft = { partId: 'part', warehouseId: 'warehouse', quantity: '1.000000' };
  type Panel = {
    declare: (input: typeof draft) => void;
    retry: () => void;
    retryIntent: (intent: InventoryConsumptionIntent) => void;
    retainedCommand: () => DeclareInventoryConsumptionInput | null;
    resetKey: () => number;
    formLocked: () => boolean;
  };
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  async function setup() {
    TestBed.configureTestingModule({ imports: [InventoryConsumptionPanel] });
    const fixture = TestBed.createComponent(InventoryConsumptionPanel);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('interventionId', 'intervention');
    await fixture.whenStable();
    const emitted = vi.fn();
    fixture.componentInstance.declared.subscribe(emitted);
    return { fixture, panel: fixture.componentInstance as unknown as Panel, emitted };
  }

  it('generates one command and retains exact UUID, time and facts on failed retry', async () => {
    const { fixture, panel, emitted } = await setup();
    panel.declare(draft);
    panel.declare(draft);
    expect(emitted).toHaveBeenCalledTimes(1);
    const command = panel.retainedCommand();
    expect(command?.clientOperationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(command?.occurredAt).toMatch(/\.\d{3}Z$/);
    expect(Object.isFrozen(command)).toBe(true);
    expect(panel.formLocked()).toBe(true);
    fixture.componentRef.setInput('error', 'Local storage unavailable');
    await fixture.whenStable();
    panel.retry();
    panel.retry();
    expect(emitted).toHaveBeenCalledTimes(2);
    expect(emitted.mock.calls[1]?.[0]).toBe(command);
    expect(panel.resetKey()).toBe(0);
  });

  it('resets only after a matching durable acknowledgment, never an unrelated server ID', async () => {
    const { fixture, panel } = await setup();
    panel.declare(draft);
    const command = panel.retainedCommand();
    fixture.componentRef.setInput('acceptedOperationId', 'unrelated-server-uuid');
    await fixture.whenStable();
    expect(panel.retainedCommand()).toBe(command);
    fixture.componentRef.setInput('acceptedOperationId', command?.clientOperationId ?? 'missing');
    await fixture.whenStable();
    expect(panel.retainedCommand()).toBeNull();
    expect(panel.resetKey()).toBe(1);
    fixture.componentRef.setInput('acceptedOperationId', null);
    await fixture.whenStable();
    expect(panel.resetKey()).toBe(1);
  });

  it('accepts matching persisted local intent and does not retry an old scope command', async () => {
    const { fixture, panel, emitted } = await setup();
    panel.declare(draft);
    const command = panel.retainedCommand();
    if (!command) throw new Error('Expected retained command');
    fixture.componentRef.setInput('error', 'Failed');
    fixture.componentRef.setInput('organizationId', 'new-org');
    await fixture.whenStable();
    panel.retry();
    expect(emitted).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('localIntents', [{ input: command, status: 'queued' }]);
    await fixture.whenStable();
    expect(panel.retainedCommand()).toBeNull();
    expect(panel.resetKey()).toBe(1);
  });

  it('separates queued facts, received-pending reconciliation, confirmed debit and late corrections', async () => {
    const { fixture } = await setup();
    const input: DeclareInventoryConsumptionInput = {
      ...draft,
      clientOperationId: 'local',
      interventionId: 'intervention',
      occurredAt: '2026-10-06T10:00:00.000Z',
    };
    const fact: InventoryConsumptionOutput = {
      '@id': '/fact',
      '@type': 'Consumption',
      id: 'server',
      ...draft,
      interventionId: 'intervention',
      actorId: 'actor',
      occurredAt: input.occurredAt,
      status: 'received_pending',
      reason: 'insufficient_stock',
      late: false,
      replayed: false,
    };
    fixture.componentRef.setInput('canDeclare', false);
    fixture.componentRef.setInput('localIntents', [{ input, status: 'queued' }]);
    fixture.componentRef.setInput('declarations', [
      fact,
      { ...fact, id: 'confirmed', status: 'confirmed', reason: null, late: true },
      { ...fact, id: 'other', interventionId: 'other-intervention' },
    ]);
    await fixture.whenStable();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Queued locally — awaiting synchronization');
    expect(text).toContain('Received — reconciliation needed');
    expect(text).toContain('Stock debit confirmed');
    expect(text).toContain('Recorded stock is insufficient');
    expect(text).toContain('published dossier remains unchanged');
    expect(text.match(/Received — reconciliation needed/g)).toHaveLength(1);
  });

  it('requests one replay of a failed durable intent, then permits retry after a new failed attempt', async () => {
    const { fixture, panel, emitted } = await setup();
    const input: DeclareInventoryConsumptionInput = {
      ...draft,
      clientOperationId: 'stable-operation',
      interventionId: 'intervention',
      occurredAt: '2026-10-06T10:00:00.000Z',
    };
    const intent: InventoryConsumptionIntent = { input, status: 'failed', error: 'Network error' };
    fixture.componentRef.setInput('localIntents', [intent]);
    await fixture.whenStable();
    panel.retryIntent(intent);
    panel.retryIntent(intent);
    expect(emitted).toHaveBeenCalledTimes(1);
    expect(emitted).toHaveBeenCalledWith(input);
    fixture.componentRef.setInput('localIntents', [{ ...intent, status: 'sending' }]);
    await fixture.whenStable();
    fixture.componentRef.setInput('localIntents', [{ ...intent, error: 'Still offline' }]);
    await fixture.whenStable();
    panel.retryIntent(intent);
    expect(emitted).toHaveBeenCalledTimes(2);
    expect(emitted.mock.calls[1]?.[0]).toBe(input);
  });
});
