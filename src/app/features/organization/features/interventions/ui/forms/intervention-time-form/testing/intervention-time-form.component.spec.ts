import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionTimeWrite } from '@features/organization/features/interventions/models';
import { InterventionTimeForm } from '../intervention-time-form.component';
describe('InterventionTimeForm', () => {
  afterEach(() => vi.unstubAllGlobals());
  let fixture: ComponentFixture<InterventionTimeForm>;
  let writes: InterventionTimeWrite[];
  const initial = {
    id: 'stable',
    memberId: 'member',
    workedOn: '2026-09-16',
    minutes: '',
    note: '',
    baseRevision: null,
  };
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const fill = async (id: string, value: string): Promise<void> => {
    const field = root().querySelector<HTMLInputElement>(id);
    if (!field) throw new Error(id);
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    root()
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
  };
  beforeEach(async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      },
    );
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(InterventionTimeForm);
    fixture.componentRef.setInput('initial', initial);
    fixture.componentRef.setInput('today', '2026-09-16');
    writes = [];
    fixture.componentInstance.submitted.subscribe((value) => writes.push(value));
    await fixture.whenStable();
  });
  it('requires positive whole minutes', async () => {
    await fill('#time-minutes', '0');
    await submit();
    await fill('#time-minutes', '1.5');
    await submit();
    expect(writes).toEqual([]);
  });

  it('displays the selected organization identity without changing the contributor identifier', async () => {
    fixture.componentRef.setInput('manageOthers', true);
    fixture.componentRef.setInput('members', [
      {
        value: '/api/organizations/org/members/member',
        label: 'Alex Rivera',
        displayName: 'Alex Rivera',
        roleLabel: 'Technician, Planner',
        avatarUrl: null,
        initials: 'AR',
      },
    ]);
    await fixture.whenStable();
    const picker = root().querySelector('#time-contributor')?.closest('[data-slot="input-group"]');
    expect(picker?.textContent).toContain('Technician, Planner');
    expect(picker?.querySelector('hlm-avatar')?.textContent).toContain('AR');
    await fill('#time-minutes', '60');
    await submit();
    expect(writes[0]).toMatchObject({ kind: 'create', input: { memberId: 'member', minutes: 60 } });
  });
  it('keeps the stable ID and never sends remaining work or a task status', async () => {
    await fill('#time-minutes', '120');
    await submit();
    expect(writes).toEqual([
      {
        kind: 'create',
        input: {
          id: 'stable',
          memberId: 'member',
          workedOn: '2026-09-16',
          minutes: 120,
          note: null,
        },
      },
    ]);
  });
  it('retains the reviewed revision for a correction', async () => {
    fixture.componentRef.setInput('initial', { ...initial, baseRevision: 4, minutes: '90' });
    await fixture.whenStable();
    await submit();
    expect(writes[0]).toMatchObject({ kind: 'correct', revision: 4, input: { minutes: 90 } });
  });
  it('rejects future work dates in the organization timezone', async () => {
    await fill('#time-minutes', '60');
    await fill('#time-date', '2026-09-17');
    await submit();
    expect(writes).toEqual([]);
  });
  it('retains a draft while preventing a duplicate submit', async () => {
    await fill('#time-minutes', '60');
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();
    await submit();
    expect(writes).toEqual([]);
  });
});
