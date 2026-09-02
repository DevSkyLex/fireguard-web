import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { PersonOption } from '../person-option.component';

describe('PersonOption', () => {
  let fixture: ComponentFixture<PersonOption>;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(PersonOption);
    fixture.componentRef.setInput('name', 'Ada Lovelace');
    fixture.componentRef.setInput('initials', 'AL');
    await fixture.whenStable();
  });

  it('should show the name and the initials when there is no picture', () => {
    expect(fixture.nativeElement.textContent).toContain('Ada Lovelace');
    expect(fixture.nativeElement.textContent).toContain('AL');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('should add the secondary line only when given', async () => {
    expect(fixture.nativeElement.textContent).not.toContain('Technician');

    fixture.componentRef.setInput('secondary', 'Technician');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Technician');
  });
});
