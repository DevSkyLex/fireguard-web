import { TestBed } from '@angular/core/testing';
import { AvatarStack } from '../avatar-stack.component';
import type { AvatarStackPerson } from '../models';

const PEOPLE: AvatarStackPerson[] = [
  { label: 'Amy Elsner' },
  { label: 'Onyama Limba' },
  { label: 'Xu Xuefeng' },
  { label: 'Ioni Bowcher' },
];

describe('AvatarStack', () => {
  function createStack(people: readonly AvatarStackPerson[] = PEOPLE, max = 3) {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(AvatarStack);
    fixture.componentRef.setInput('people', people);
    fixture.componentRef.setInput('max', max);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one avatar per visible person with derived initials', () => {
    const fixture = createStack();
    const avatars: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('p-avatar');

    expect(avatars.length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('AE');
  });

  it('collapses people beyond max into a +N overflow avatar', () => {
    const fixture = createStack(PEOPLE, 3);
    expect(fixture.nativeElement.textContent).toContain('+1');
  });

  it('renders no overflow avatar when under the max', () => {
    const fixture = createStack(PEOPLE.slice(0, 2), 3);
    expect(fixture.nativeElement.textContent).not.toContain('+');
  });

  it('derives a single-word initials fallback', () => {
    const fixture = createStack([{ label: 'Cher' }], 3);
    expect(fixture.nativeElement.textContent).toContain('CH');
  });
});
