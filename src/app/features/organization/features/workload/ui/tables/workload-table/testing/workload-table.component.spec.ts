import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  INTERACTION_CAPABILITIES_PORT,
  type InteractionCapabilitiesPort,
} from '@core/interaction-capabilities';
import type {
  WorkloadDayOutput,
  WorkloadProjectionOutput,
} from '@features/organization/features/workload/models';
import type { MemberSelectOption } from '@features/organization/models';
import { WorkloadTable } from '../workload-table.component';

describe('WorkloadTable', () => {
  let fixture: ComponentFixture<WorkloadTable>;
  const mobile = signal(false);
  const identity: MemberSelectOption = {
    value: 'member-2',
    label: 'Sofia Moreau',
    displayName: 'Sofia Moreau',
    avatarUrl: null,
    initials: 'SM',
    roleLabel: 'Planner, Technician',
  };
  const day: WorkloadDayOutput = {
    date: '2026-09-16',
    capacityMinutes: 420,
    actualMinutes: 0,
    remainingMinutes: 240,
    draftMinutes: 0,
    overloadMinutes: 0,
    utilizationPercent: 57,
    completeness: 'complete',
    availability: 'available',
    contributions: [],
  };
  const projection: WorkloadProjectionOutput = {
    startsOn: day.date,
    endsOn: day.date,
    today: day.date,
    timezone: 'Europe/Paris',
    firstDayOfWeek: 'monday',
    calculatedAt: '2026-09-16T10:00:00Z',
    completeness: 'complete',
    members: [
      { memberId: identity.value, displayName: identity.displayName, days: [day], unallocated: [] },
    ],
    unassigned: [],
  };

  beforeEach(() => {
    mobile.set(false);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: { isMobileInteractionMode: mobile } satisfies Pick<
            InteractionCapabilitiesPort,
            'isMobileInteractionMode'
          >,
        },
      ],
    });
    fixture = TestBed.createComponent(WorkloadTable);
    fixture.componentRef.setInput('projection', projection);
    fixture.componentRef.setInput('members', [
      {
        ...identity,
        value: 'other-member',
        displayName: 'Other member',
        initials: 'OM',
        roleLabel: 'Administrator',
      },
      identity,
    ]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('marks a full column only when every displayed member has zero capacity on that date', async () => {
    const days: WorkloadDayOutput[] = [
      { ...day, capacityMinutes: 0, remainingMinutes: 0, availability: 'unavailable' },
      { ...day, date: '2026-09-17' },
    ];
    fixture.componentRef.setInput('projection', {
      ...projection,
      members: [
        { ...projection.members[0], days },
        { ...projection.members[0], memberId: 'other-member', days: days.toReversed() },
      ],
    });
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(
      Array.from(root.querySelectorAll('col[data-date]'), (column) =>
        column.getAttribute('data-unavailable'),
      ),
    ).toEqual(['true', 'false']);
    expect(root.querySelector('th[aria-current="date"]')?.textContent).toContain('Wed 16');
    expect(root.querySelector('th[aria-current="date"]')?.classList.contains('bg-muted')).toBe(
      false,
    );
    expect(root.querySelectorAll('td[data-unavailable="true"]')).toHaveLength(0);
  });

  it.each([420, null, undefined])(
    'keeps a personal absence in its cell when another member has capacity %s',
    async (capacityMinutes) => {
      const unavailableDay: WorkloadDayOutput = { ...day, capacityMinutes: 0 };
      fixture.componentRef.setInput('projection', {
        ...projection,
        members: [
          { ...projection.members[0], days: [unavailableDay] },
          {
            ...projection.members[0],
            memberId: 'other-member',
            days: capacityMinutes === undefined ? [] : [{ ...day, capacityMinutes }],
          },
        ],
      });
      await fixture.whenStable();
      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('col[data-date]')?.getAttribute('data-unavailable')).toBe('false');
      expect(root.querySelectorAll('td[data-unavailable="true"]')).toHaveLength(1);
      expect(root.querySelector('th[aria-current="date"]')?.classList.contains('bg-muted')).toBe(
        true,
      );
    },
  );

  it('updates shared column shading when the member page or capacity changes', async () => {
    fixture.componentRef.setInput('projection', {
      ...projection,
      members: [{ ...projection.members[0], days: [{ ...day, capacityMinutes: 0 }] }],
    });
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('col[data-date]')?.getAttribute('data-unavailable')).toBe('true');
    fixture.componentRef.setInput('projection', projection);
    await fixture.whenStable();
    expect(root.querySelector('col[data-date]')?.getAttribute('data-unavailable')).toBe('false');
    fixture.componentRef.setInput('projection', { ...projection, members: [] });
    await fixture.whenStable();
    expect(root.querySelectorAll('col[data-date]')).toHaveLength(0);
  });

  for (const isMobile of [false, true]) {
    describe(isMobile ? 'mobile list' : 'desktop matrix', () => {
      beforeEach(() => mobile.set(isMobile));

      it('matches avatars and organization roles by member id rather than directory position', async () => {
        await fixture.whenStable();
        const root: HTMLElement = fixture.nativeElement;
        const header = root.querySelector(isMobile ? 'section > div' : 'th[scope="row"]');
        expect(header?.textContent).toContain('Sofia Moreau');
        expect(header?.textContent).toContain('Planner, Technician');
        expect(header?.textContent).not.toContain('Administrator');
        expect(header?.querySelector('[hlmAvatarFallback]')?.textContent?.trim()).toBe('SM');
        expect(header?.querySelector('hlm-avatar')?.getAttribute('aria-hidden')).toBe('true');
        if (isMobile) {
          expect(root.querySelector('h2')?.textContent?.trim()).toBe('Sofia Moreau');
          expect(root.querySelector('section')?.getAttribute('aria-labelledby')).toBe(
            'workload-member-member-2',
          );
        }
      });

      it('passes the avatar source to Spartan and keeps initials until the image has loaded', async () => {
        const imageSource = vi.spyOn(HTMLImageElement.prototype, 'src', 'set');
        fixture.componentRef.setInput('members', [{ ...identity, avatarUrl: '/avatar-sofia.png' }]);
        await fixture.whenStable();
        expect(imageSource).toHaveBeenCalledWith('/avatar-sofia.png');
        const root: HTMLElement = fixture.nativeElement;
        expect(root.querySelector('[hlmAvatarFallback]')?.textContent?.trim()).toBe('SM');
      });

      it('updates the displayed roles when member metadata changes', async () => {
        await fixture.whenStable();
        fixture.componentRef.setInput('members', [{ ...identity, roleLabel: 'No assigned role' }]);
        await fixture.whenStable();
        const root: HTMLElement = fixture.nativeElement;
        expect(root.textContent).toContain('No assigned role');
        expect(root.textContent).not.toContain('Planner, Technician');
      });

      it('keeps the projected name when identity metadata is unavailable without inventing a role', async () => {
        fixture.componentRef.setInput('members', []);
        await fixture.whenStable();
        const root: HTMLElement = fixture.nativeElement;
        const header = root.querySelector(isMobile ? 'section > div' : 'th[scope="row"]');
        expect(header?.textContent).toContain('Sofia Moreau');
        expect(header?.textContent).toContain('—');
        expect(header?.textContent).not.toContain('No assigned role');
        expect(header?.querySelector('[hlmAvatarFallback]')?.textContent?.trim()).toBe('?');
      });

      it('opens the original projected member and day without replacing them with identity metadata', async () => {
        const opened = vi.fn();
        fixture.componentInstance.dayOpened.subscribe(opened);
        await fixture.whenStable();
        const root: HTMLElement = fixture.nativeElement;
        root.querySelector<HTMLButtonElement>('button')?.click();
        expect(opened).toHaveBeenCalledExactlyOnceWith({ member: projection.members[0], day });
      });

      it('marks only zero capacity as unavailable, keeping unknown and available days distinct', async () => {
        const days: WorkloadDayOutput[] = [
          { ...day, capacityMinutes: 0, remainingMinutes: 0, availability: 'unavailable' },
          {
            ...day,
            date: '2026-09-17',
            capacityMinutes: null,
            utilizationPercent: null,
            completeness: 'partial',
            availability: 'unknown',
          },
          { ...day, date: '2026-09-18' },
        ];
        fixture.componentRef.setInput('projection', {
          ...projection,
          members: [{ ...projection.members[0], days }],
        });
        await fixture.whenStable();
        const root: HTMLElement = fixture.nativeElement;
        const buttons = root.querySelectorAll<HTMLButtonElement>('button');
        expect(Array.from(buttons, (button) => button.getAttribute('data-unavailable'))).toEqual([
          'true',
          'false',
          'false',
        ]);
        expect(buttons[0].textContent).toContain('Unavailable');
        expect(buttons[0].textContent).toContain('0 min / 0 min');
        expect(buttons[0].querySelector('[role="progressbar"]')).toBeNull();
        expect(buttons[1].textContent).toContain('Capacity not configured');
        expect(buttons[2].textContent).toContain('Available');
      });

      it('keeps unavailable days interactive and preserves recorded work and overload warnings', async () => {
        const unavailableDay: WorkloadDayOutput = {
          ...day,
          capacityMinutes: 0,
          actualMinutes: 120,
          remainingMinutes: 0,
          overloadMinutes: 120,
          utilizationPercent: null,
          availability: 'unavailable',
        };
        const member = { ...projection.members[0], days: [unavailableDay] };
        fixture.componentRef.setInput('projection', { ...projection, members: [member] });
        const opened = vi.fn();
        fixture.componentInstance.dayOpened.subscribe(opened);
        await fixture.whenStable();
        const root: HTMLElement = fixture.nativeElement;
        const button = root.querySelector<HTMLButtonElement>('button');
        expect(button?.disabled).toBe(false);
        expect(button?.getAttribute('data-unavailable')).toBe('true');
        expect(button?.textContent).toContain('2 h / 0 min');
        expect(button?.querySelector('.text-destructive')?.textContent?.trim()).toBe('Unavailable');
        button?.click();
        expect(opened).toHaveBeenCalledExactlyOnceWith({ member, day: unavailableDay });
      });
    });
  }
});
