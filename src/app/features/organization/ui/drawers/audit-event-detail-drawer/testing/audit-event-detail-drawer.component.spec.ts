import { TestBed } from '@angular/core/testing';
import type { AuditEventOutput } from '@features/organization/models';
import { AuditEventDetailDrawer } from '../audit-event-detail-drawer.component';

const BASE_EVENT: AuditEventOutput = {
  '@id': '/audit-events/audit-1',
  '@type': 'AuditEvent',
  id: 'audit-1',
  action: 'organization.updated',
  actorType: 'user',
  actorId: 'user-1',
  actorEmail: 'alice@example.com',
  occurredAt: '2026-07-01T12:00:00Z',
  recordedAt: '2026-07-01T12:00:01Z',
  chainId: 'chain-1',
  sequence: 1,
  eventHash: 'hash-abc123',
} as unknown as AuditEventOutput;

describe('AuditEventDetailDrawer', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  function createComponent(): {
    readonly component: AuditEventDetailDrawer;
    readonly fixture: import('@angular/core/testing').ComponentFixture<AuditEventDetailDrawer>;
  } {
    const fixture = TestBed.createComponent(AuditEventDetailDrawer);
    fixture.detectChanges();
    return { component: fixture.componentInstance, fixture };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuditEventDetailDrawer],
    });
  });

  it('should create', () => {
    const { component } = createComponent();
    expect(component).toBeTruthy();
  });

  it('is hidden by default', () => {
    const { component } = createComponent();
    expect(component.visible()).toBe(false);
  });

  it('sizes the drawer responsively (full width on mobile)', () => {
    const { component } = createComponent();
    const rootClass = (component['drawerPt'] as { root: { class: string } }).root
      .class as unknown as string;
    expect(rootClass).toContain('!w-full');
    expect(rootClass).toContain('sm:!w-[28rem]');
  });

  it('renders nothing in the content template when no audit event is selected', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    expect(document.body.textContent).not.toContain('organization.updated');
  });

  it('renders the base fields of the audit event', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('auditEvent', BASE_EVENT);
    fixture.detectChanges();

    const text: string = document.body.textContent as string;
    expect(text).toContain('organization.updated');
    expect(text).toContain('user');
    expect(text).toContain('alice@example.com');
    expect(text).toContain('#1');
    expect(text).toContain('chain-1');
    expect(text).toContain('hash-abc123');
  });

  it('falls back to the actor id when no actor email is present', () => {
    const { fixture } = createComponent();
    const event: AuditEventOutput = { ...BASE_EVENT, actorEmail: null, actorId: 'user-42' };
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('auditEvent', event);
    fixture.detectChanges();

    expect(document.body.textContent).toContain('user-42');
  });

  it('renders the subject block only when subject fields are present', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('auditEvent', BASE_EVENT);
    fixture.detectChanges();
    expect(document.body.textContent).not.toContain('Subject type');

    const event: AuditEventOutput = {
      ...BASE_EVENT,
      subjectType: 'facility',
      subjectId: 'facility-1',
    };
    fixture.componentRef.setInput('auditEvent', event);
    fixture.detectChanges();

    const text: string = document.body.textContent as string;
    expect(text).toContain('Subject type');
    expect(text).toContain('facility');
    expect(text).toContain('facility-1');
  });

  it('renders the client/tenant block only when those fields are present', () => {
    const { fixture } = createComponent();
    const event: AuditEventOutput = {
      ...BASE_EVENT,
      clientId: 'client-1',
      tenantId: 'tenant-1',
    };
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('auditEvent', event);
    fixture.detectChanges();

    const text: string = document.body.textContent as string;
    expect(text).toContain('client-1');
    expect(text).toContain('tenant-1');
  });

  it('renders the network block only when ip address or user agent is present', () => {
    const { fixture } = createComponent();
    const event: AuditEventOutput = {
      ...BASE_EVENT,
      ipAddress: '203.0.113.5',
      userAgent: 'Mozilla/5.0',
    };
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('auditEvent', event);
    fixture.detectChanges();

    const text: string = document.body.textContent as string;
    expect(text).toContain('203.0.113.5');
    expect(text).toContain('Mozilla/5.0');
  });

  it('renders the metadata block only when metadata carries entries', () => {
    const { fixture } = createComponent();
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('auditEvent', BASE_EVENT);
    fixture.detectChanges();
    expect(document.body.textContent).not.toContain('Metadata');

    const event: AuditEventOutput = { ...BASE_EVENT, metadata: { field: 'name', from: 'a' } };
    fixture.componentRef.setInput('auditEvent', event);
    fixture.detectChanges();

    const text: string = document.body.textContent as string;
    expect(text).toContain('Metadata');
    expect(text).toContain('field');
  });

  it('treats an empty metadata record as absent', () => {
    const { component } = createComponent();
    expect(component['hasMetadataEntries']({})).toBe(false);
    expect(component['hasMetadataEntries'](undefined)).toBe(false);
    expect(component['hasMetadataEntries']({ a: 1 })).toBe(true);
  });

  it('emits visibleChange when the underlying drawer toggles visibility', () => {
    const { component, fixture } = createComponent();
    const emitSpy = vi.spyOn(component.visibleChange, 'emit');
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    const drawer = fixture.nativeElement.querySelector('p-drawer');
    expect(drawer).toBeTruthy();

    component.visibleChange.emit(false);
    expect(emitSpy).toHaveBeenCalledWith(false);
  });
});
