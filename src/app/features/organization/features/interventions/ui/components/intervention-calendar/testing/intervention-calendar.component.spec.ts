import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { InterventionCalendar } from '../intervention-calendar.component';

function makeIntervention(
  id: string,
  name: string,
  plannedStartAt: string | null,
): InterventionOutput {
  return {
    id,
    name,
    status: 'planned',
    priority: 'normal',
    responsible: '/api/organizations/org-1/members/m1',
    participants: [],
    plannedStartAt,
    dueAt: null,
  } as unknown as InterventionOutput;
}

describe('InterventionCalendar', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    });
  });

  function createFixture() {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    const fixture = TestBed.createComponent(InterventionCalendar);
    fixture.componentRef.setInput('interventions', [
      makeIntervention('a', 'Quarterly audit', new Date().toISOString()),
      makeIntervention('b', 'Backlog draft', null),
    ]);
    fixture.componentRef.setInput('currentMemberIri', '/api/organizations/org-1/members/m1');
    fixture.detectChanges();
    return fixture;
  }

  it('plots dated interventions and omits undated ones', () => {
    const fixture = createFixture();
    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Quarterly audit');
    expect(text).not.toContain('Backlog draft');
  });

  it('renders the New intervention action', () => {
    const fixture = createFixture();
    const text: string = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('New intervention');
  });

  it('emits the intervention behind a clicked event', () => {
    const fixture = createFixture();
    const selected: InterventionOutput[] = [];
    fixture.componentInstance.selectIntervention.subscribe((i: InterventionOutput) =>
      selected.push(i),
    );

    const chip: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'button[aria-label="Open Quarterly audit"]',
    );
    chip?.click();

    expect(selected.map((i) => i.id)).toEqual(['a']);
  });

  it('exposes status and assignment filter groups', () => {
    const fixture = createFixture();
    const groups = (
      fixture.componentInstance as unknown as {
        categoryGroups: { id: string }[];
      }
    ).categoryGroups;
    expect(groups.map((g) => g.id)).toEqual(['status', 'assignment']);
  });
});
