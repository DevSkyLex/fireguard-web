import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { OrganizationQuotaItemOutput } from '@features/organization/models';
import { OrganizationQuotaStore } from '@features/organization/state';
import { OrganizationQuotaMeters } from '../organization-quota-meters.component';

describe('OrganizationQuotaMeters', () => {
  const items = signal<ReadonlyArray<OrganizationQuotaItemOutput>>([]);

  beforeEach(() => {
    items.set([]);

    TestBed.configureTestingModule({
      imports: [OrganizationQuotaMeters],
      providers: [{ provide: OrganizationQuotaStore, useValue: { items } }],
    });
  });

  it('should render nothing when there is no quota data', () => {
    const fixture = TestBed.createComponent(OrganizationQuotaMeters);
    fixture.detectChanges();

    expect((fixture.nativeElement.textContent as string).trim()).toBe('');
  });

  it('should render a usage row per resource with used and limit', () => {
    items.set([
      { resource: 'members', used: 3, limit: 5 },
      { resource: 'facilities', used: 2, limit: 2 },
      { resource: 'equipment', used: 10, limit: null },
    ]);

    const fixture = TestBed.createComponent(OrganizationQuotaMeters);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Usage');
    expect(text).toContain('Members');
    expect(text).toContain('3 / 5');
    expect(text).toContain('Facilities');
    expect(text).toContain('2 / 2');
    // Unlimited resources show the usage count without a hard limit.
    expect(text).toContain('Equipment');
    expect(text).toContain('10');
  });
});
