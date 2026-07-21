import { DatePipe } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { AuditEventOutput } from '@features/organization/models';
import { DashboardRecentActivity } from '../dashboard-recent-activity.component';

type DashboardRecentActivityHarness = {
  actorLabel(event: AuditEventOutput): string;
  actorInitials(event: AuditEventOutput): string;
  eventLabel(action: string): string;
};

const auditEvent = {
  id: 'evt-1',
  action: 'organization.member_added',
  actorType: 'user',
  actorEmail: 'claire.lefevre@example.com',
  occurredAt: '2026-07-20T09:30:00+00:00',
  recordedAt: '2026-07-20T09:30:01+00:00',
  chainId: 'chain-1',
  sequence: 12,
  eventHash: 'hash-1',
} as unknown as AuditEventOutput;

describe('DashboardRecentActivity', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardRecentActivity],
    }).overrideComponent(DashboardRecentActivity, {
      set: { imports: [DatePipe], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });
  });

  function createComponent(
    events: readonly AuditEventOutput[] = [auditEvent],
    loading = false,
  ): ComponentFixture<DashboardRecentActivity> {
    const fixture = TestBed.createComponent(DashboardRecentActivity);
    fixture.componentRef.setInput('events', events);
    fixture.componentRef.setInput('loading', loading);
    fixture.detectChanges();

    return fixture;
  }

  it('should create', () => {
    expect(createComponent().componentInstance).toBeTruthy();
  });

  it('should label the actor with the email when disclosed, else the actor type', () => {
    const harness = createComponent()
      .componentInstance as unknown as DashboardRecentActivityHarness;

    expect(harness.actorLabel(auditEvent)).toBe('claire.lefevre@example.com');
    expect(harness.actorLabel({ ...auditEvent, actorEmail: null } as AuditEventOutput)).toBe(
      'user',
    );
  });

  it('should derive at most two uppercase initials from the email local part', () => {
    const harness = createComponent()
      .componentInstance as unknown as DashboardRecentActivityHarness;

    expect(harness.actorInitials(auditEvent)).toBe('CL');
    expect(
      harness.actorInitials({ ...auditEvent, actorEmail: 'admin@example.com' } as AuditEventOutput),
    ).toBe('A');
    expect(
      harness.actorInitials({
        ...auditEvent,
        actorEmail: null,
        actorType: 'system',
      } as AuditEventOutput),
    ).toBe('S');
  });

  it('should humanize dotted-snake ledger actions', () => {
    const harness = createComponent()
      .componentInstance as unknown as DashboardRecentActivityHarness;

    expect(harness.eventLabel('organization.member_added')).toBe('organization member added');
  });

  it('should emit retry from the error state', () => {
    const fixture = createComponent();
    let retried = 0;
    fixture.componentInstance.retry.subscribe(() => {
      retried += 1;
    });

    fixture.componentInstance.retry.emit();

    expect(retried).toBe(1);
  });
});
