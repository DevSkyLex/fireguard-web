import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { ApprovalActionTypeOutput } from '@features/organization/features/approvals/models';
import type { OrganizationApprovalSettings } from '@features/organization/models';
import type { OrganizationApprovalFormValues } from '../models';
import { OrganizationApprovalForm } from '../organization-approval-form.component';

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

const ACTION_TYPES: ApprovalActionTypeOutput[] = [
  {
    '@id': '/api/approvals/action-types/nc_waiver',
    '@type': 'ApprovalActionType',
    value: 'nc_waiver',
    label: 'Non-conformity waiver',
  },
  {
    '@id': '/api/approvals/action-types/equipment_decommission',
    '@type': 'ApprovalActionType',
    value: 'equipment_decommission',
    label: 'Equipment decommission',
  },
];

describe('OrganizationApprovalForm', () => {
  let fixture: ComponentFixture<OrganizationApprovalForm>;
  let submissions: OrganizationApprovalFormValues[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="org-approval-submit"]') as HTMLButtonElement;
  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationApprovalForm);
    fixture.componentRef.setInput('approval', approval());
    fixture.componentRef.setInput('actionTypes', ACTION_TYPES);
    await fixture.whenStable();

    submissions = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
  });

  it('should render one row per catalog action type, defaulted to disabled', async () => {
    expect(root().textContent).toContain('Non-conformity waiver');
    expect(root().textContent).toContain('Equipment decommission');
    expect(root().querySelector('[data-testid="org-approval-enabled-nc_waiver"]')).not.toBeNull();
  });

  it('should group each row under a fieldset whose legend names the action type', async () => {
    const fieldsets = root().querySelectorAll('fieldset');
    expect(fieldsets.length).toBe(ACTION_TYPES.length);

    const legend = root()
      .querySelector('[data-testid="org-approval-enabled-nc_waiver"]')
      ?.closest('fieldset')
      ?.querySelector('legend');
    expect(legend?.textContent).toContain('Non-conformity waiver');
  });

  it('should give the enabled switch its own accessible name distinct from the group legend', async () => {
    const switchLabel = root()
      .querySelector('[for="org-approval-enabled-nc_waiver"]')
      ?.textContent?.trim();

    expect(switchLabel).toBe('Require approval');
    expect(switchLabel).not.toContain('Non-conformity waiver');
  });

  it('should render a minimum-severity select only for nc_waiver', async () => {
    expect(root().querySelector('[data-testid="org-approval-severity-nc_waiver"]')).not.toBeNull();
    expect(
      root().querySelector('[data-testid="org-approval-severity-equipment_decommission"]'),
    ).toBeNull();
  });

  it('should seed a customized row from the settings and keep an uncustomized row at its default', async () => {
    fixture.componentRef.setInput(
      'approval',
      approval({
        actionRules: {
          nc_waiver: { enabled: true, minApproverRole: 'admin', minSeverity: 'critical' },
        },
      }),
    );
    await fixture.whenStable();

    const ttlInput = root().querySelector('[data-testid="org-approval-ttl"]') as HTMLInputElement;
    ttlInput.value = '20';
    ttlInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    await submit();

    expect(submissions).toEqual([
      {
        actionRules: {
          nc_waiver: { enabled: true, minApproverRole: 'admin', minSeverity: 'critical' },
          equipment_decommission: { enabled: false, minApproverRole: 'admin', minSeverity: null },
        },
        allowSelfApproval: false,
        approvalTtlDays: 20,
      },
    ]);
  });

  it('should keep the submit control disabled until the tree changes', async () => {
    expect(submitButton().disabled).toBe(true);
  });

  it('should proactively announce the TTL bound via a field description', async () => {
    const ttlField = root().querySelector('[data-testid="org-approval-ttl"]')?.closest('hlm-field');

    expect(ttlField?.textContent).toContain('Between 1 and 90 days.');
  });

  it('should reject a TTL outside the 1-90 day range and not submit', async () => {
    const ttlInput = root().querySelector('[data-testid="org-approval-ttl"]') as HTMLInputElement;
    ttlInput.value = '120';
    ttlInput.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    await submit();

    expect(submissions).toEqual([]);
    expect(ttlInput.parentElement?.textContent).toContain('90');
  });

  it('should lock the submit control and swap its label while a save is in flight', async () => {
    const ttlInput = root().querySelector('[data-testid="org-approval-ttl"]') as HTMLInputElement;
    ttlInput.value = '30';
    ttlInput.dispatchEvent(new Event('input'));
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Saving…');
  });
});
