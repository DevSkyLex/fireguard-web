import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityForm } from '../facility-form.component';

type FacilityFormTestApi = FacilityForm & {
  form: {
    getRawValue(): Record<string, unknown>;
    controls: { type: { disabled: boolean }; name: { setValue(value: string): void } };
  };
};

const facility: FacilityOutput = {
  '@id': '/api/facilities/facility-1',
  '@type': 'Facility',
  id: 'facility-1',
  organizationId: 'org-1',
  parentFacilityId: null,
  hasChildren: false,
  type: 'building',
  name: 'Warehouse B',
  code: 'WH-B',
  status: 'active',
  address: '12 Dock Road',
  metadata: {},
  latitude: 48.85,
  longitude: 2.35,
  createdAt: '2026-06-01T08:00:00.000Z',
  updatedAt: '2026-06-01T08:00:00.000Z',
} as FacilityOutput;

describe('FacilityForm', () => {
  let fixture: ComponentFixture<FacilityForm>;

  const build = (): FacilityFormTestApi => {
    fixture = TestBed.createComponent(FacilityForm);
    fixture.detectChanges();
    return fixture.componentInstance as unknown as FacilityFormTestApi;
  };

  it('should start empty in create mode', () => {
    const component = build();

    expect(component.form.getRawValue()['name']).toBe('');
    expect(component.form.controls.type.disabled).toBe(false);
  });

  it('should pre-fill from a facility supplied before the first render', () => {
    fixture = TestBed.createComponent(FacilityForm);
    fixture.componentRef.setInput('facility', facility);
    fixture.detectChanges();

    const values = (fixture.componentInstance as unknown as FacilityFormTestApi).form.getRawValue();
    expect(values['name']).toBe('Warehouse B');
    expect(values['code']).toBe('WH-B');
    expect(values['latitude']).toBe(48.85);
  });

  it('should pre-fill from a facility that only arrives after the first render', () => {
    const component = build();
    expect(component.form.getRawValue()['name']).toBe('');

    // The regression this guards: prefilling from `ngOnInit` read the input once,
    // so a facility resolved after mount never reached the form. It happened to
    // work only because every caller gated rendering behind its own loading check.
    fixture.componentRef.setInput('facility', facility);
    fixture.detectChanges();

    expect(component.form.getRawValue()['name']).toBe('Warehouse B');
  });

  it('should disable the type control in edit mode', () => {
    const component = build();

    fixture.componentRef.setInput('facility', facility);
    fixture.detectChanges();

    // Facility type is immutable once created.
    expect(component.form.controls.type.disabled).toBe(true);
  });

  it('should surface a server message on the field it names', () => {
    const component = build();

    fixture.componentRef.setInput('serverError', {
      error: {
        '@id': '',
        '@type': 'ConstraintViolation',
        status: 422,
        type: 't',
        title: 'Unprocessable Entity',
        detail: 'Validation failed',
        violations: [{ propertyPath: 'code', message: 'This code is already used.' }],
      },
    });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'This code is already used.',
    );
    expect(component).toBeTruthy();
  });
});
