import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { AvatarPassThroughOptions } from 'primeng/avatar';
import type { MemberSelectOption } from '@features/organization/features/interventions/models';
import { InterventionMemberOption } from '../intervention-member-option.component';

type InterventionMemberOptionHarness = {
  readonly compact: () => boolean;
  readonly avatarPt: () => AvatarPassThroughOptions;
};

const member: MemberSelectOption = {
  value: '/api/members/1',
  label: 'Jane Doe',
  displayName: 'Jane Doe',
  roleLabel: 'Technician',
  avatarUrl: null,
  initials: 'JD',
};

describe('InterventionMemberOption', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InterventionMemberOption],
    }).overrideComponent(InterventionMemberOption, {
      set: {
        imports: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
  });

  function createComponent(compact = false): InterventionMemberOptionHarness {
    const fixture = TestBed.createComponent(InterventionMemberOption);
    fixture.componentRef.setInput('option', member);
    fixture.componentRef.setInput('compact', compact);
    fixture.detectChanges();

    return fixture.componentInstance as unknown as InterventionMemberOptionHarness;
  }

  it('should create', () => {
    const component = createComponent();

    expect(component).toBeTruthy();
    expect(component.compact()).toBe(false);
  });

  it('should style the avatar surface through the passthrough at full size by default', () => {
    const component = createComponent();
    const rootClass = (component.avatarPt().root as { class: string }).class;

    expect(rootClass).toContain('bg-surface-100');
    expect(rootClass).not.toContain('size-5');
  });

  it('should shrink the avatar through the passthrough in compact mode', () => {
    const component = createComponent(true);
    const rootClass = (component.avatarPt().root as { class: string }).class;

    expect(rootClass).toContain('size-5');
  });
});
