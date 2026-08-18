import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OrganizationApprovalSettings } from '@features/organization/models';
import { OrganizationApprovalSummaryCard } from '../organization-approval-summary-card.component';

function approval(
  overrides: Partial<OrganizationApprovalSettings> = {},
): OrganizationApprovalSettings {
  return {
    actionRules: {},
    allowSelfApproval: false,
    approvalTtlDays: 14,
    ...overrides,
  };
}

describe('OrganizationApprovalSummaryCard', () => {
  let fixture: ComponentFixture<OrganizationApprovalSummaryCard>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  async function createFixture(value: OrganizationApprovalSettings): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationApprovalSummaryCard);
    fixture.componentRef.setInput('approval', value);
    await fixture.whenStable();
  }

  it('should render no edit control', async () => {
    await createFixture(approval());

    expect(root().querySelector('button, input, select, hlm-switch')).toBeNull();
  });

  it('should state that every action type is unrestricted when there are no custom rules', async () => {
    await createFixture(approval());

    expect(root().querySelector('[data-testid="org-approval-rules-table"]')).toBeNull();
    expect(root().textContent).toContain('unrestricted');
  });

  it('should render one row per customized action rule', async () => {
    await createFixture(
      approval({
        actionRules: {
          nc_waiver: { enabled: true, minApproverRole: 'admin', minSeverity: 'critical' },
          equipment_decommission: { enabled: false, minApproverRole: 'owner', minSeverity: null },
        },
      }),
    );

    const rows: HTMLElement[] = Array.from(
      root().querySelectorAll('[data-testid="org-approval-rule-row"]'),
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('Nc waiver');
    expect(rows[0].textContent).toContain('admin');
    expect(rows[0].textContent).toContain('critical');
    expect(rows[1].textContent).toContain('Equipment decommission');
    expect(rows[1].textContent).toContain('—');
  });

  it('should render self-approval and the request TTL', async () => {
    await createFixture(approval({ allowSelfApproval: true, approvalTtlDays: 21 }));

    expect(
      root().querySelector('[data-testid="org-approval-self-approval"]')?.textContent,
    ).toContain('Yes');
    expect(root().querySelector('[data-testid="org-approval-ttl"]')?.textContent).toContain('21');
  });
});
