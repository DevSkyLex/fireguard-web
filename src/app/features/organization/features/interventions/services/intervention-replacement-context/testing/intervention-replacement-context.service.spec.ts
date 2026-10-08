import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, Subject, throwError, type Observable } from 'rxjs';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { InterventionReplacementContextService } from '../intervention-replacement-context.service';

describe('InterventionReplacementContextService', () => {
  const organizationId = 'org-1';
  const equipmentId = '76ebd96a-c1f3-4c04-8c77-9d2b4ba9b1a4';
  const successorId = 'd1d145d0-e1c5-4e9c-a36e-1b2f267068ce';
  const unrelatedId = '5da7fd7c-30d2-4c3b-8a27-bb060a6de3e3';
  const original = {
    '@id': `/api/organizations/${organizationId}/equipment/${equipmentId}`,
    '@type': 'Equipment',
    id: equipmentId,
    organizationId,
    status: 'decommissioned',
    recordStatus: 'published',
    successorEquipmentId: successorId,
  } as EquipmentOutput;
  const successor = {
    '@id': `/api/organizations/${organizationId}/equipment/${successorId}`,
    '@type': 'Equipment',
    id: successorId,
    organizationId,
    status: 'operational',
    recordStatus: 'published',
    predecessorEquipmentId: equipmentId,
  } as EquipmentOutput;
  const equipment = {
    get: vi.fn<(organization: string, id: string) => Observable<EquipmentOutput>>(),
  };
  let service: InterventionReplacementContextService;

  beforeEach(() => {
    equipment.get.mockReset();
    equipment.get.mockReturnValueOnce(of(original)).mockReturnValueOnce(of(successor));
    TestBed.configureTestingModule({
      providers: [
        InterventionReplacementContextService,
        { provide: EquipmentService, useValue: equipment },
      ],
    });
    service = TestBed.inject(InterventionReplacementContextService);
  });

  it('reads both scoped records and confirms their reciprocal published replacement', async () => {
    expect(await firstValueFrom(service.load(organizationId, equipmentId))).toEqual({
      original,
      successor,
    });
    expect(equipment.get).toHaveBeenNthCalledWith(1, organizationId, equipmentId);
    expect(equipment.get).toHaveBeenNthCalledWith(2, organizationId, successorId);
  });

  it('waits for the original record before resolving the server-declared successor', async () => {
    const response = new Subject<EquipmentOutput>();
    equipment.get.mockReset();
    equipment.get.mockReturnValueOnce(response).mockReturnValueOnce(of(successor));
    const context = firstValueFrom(service.load(organizationId, equipmentId));
    expect(equipment.get).toHaveBeenCalledTimes(1);
    response.next(original);
    response.complete();
    expect((await context).successor).toEqual(successor);
    expect(equipment.get).toHaveBeenCalledTimes(2);
  });

  it.each([
    { successorEquipmentId: null },
    { successorEquipmentId: undefined },
    { successorEquipmentId: '/api/equipment/arbitrary-reference' },
    { successorEquipmentId: equipmentId },
    { status: 'operational' },
    { organizationId: 'org-2' },
    { id: unrelatedId },
    { '@id': `/api/equipment/${unrelatedId}` },
  ] as const)(
    'does not confirm or fetch an unverified original relationship %j',
    async (fields) => {
      const unverified = { ...original, ...fields } as EquipmentOutput;
      equipment.get.mockReset();
      equipment.get.mockReturnValueOnce(of(unverified));
      expect(await firstValueFrom(service.load(organizationId, equipmentId))).toEqual({
        original: unverified,
        successor: null,
      });
      expect(equipment.get).toHaveBeenCalledExactlyOnceWith(organizationId, equipmentId);
    },
  );

  it.each([
    { recordStatus: 'draft' },
    { recordStatus: undefined },
    { predecessorEquipmentId: null },
    { predecessorEquipmentId: unrelatedId },
    { organizationId: 'org-2' },
    { id: unrelatedId },
    { '@id': `/api/organizations/org-2/equipment/${successorId}` },
    { '@id': `/api/equipment/${unrelatedId}` },
  ] as const)('keeps an unconfirmed successor out of the result %j', async (fields) => {
    equipment.get.mockReset();
    equipment.get
      .mockReturnValueOnce(of(original))
      .mockReturnValueOnce(of({ ...successor, ...fields }));
    expect(await firstValueFrom(service.load(organizationId, equipmentId))).toEqual({
      original,
      successor: null,
    });
    expect(equipment.get).toHaveBeenCalledTimes(2);
  });

  it('recognizes the canonical equipment resource identities without accepting arbitrary IRIs', async () => {
    const canonicalOriginal = { ...original, '@id': `/api/equipment/${equipmentId}` };
    const canonicalSuccessor = { ...successor, '@id': `/api/equipment/${successorId}` };
    equipment.get.mockReset();
    equipment.get
      .mockReturnValueOnce(of(canonicalOriginal))
      .mockReturnValueOnce(of(canonicalSuccessor));
    expect(await firstValueFrom(service.load(organizationId, equipmentId))).toEqual({
      original: canonicalOriginal,
      successor: canonicalSuccessor,
    });
  });

  it('refuses a free-form target before making a resource request', async () => {
    await expect(
      firstValueFrom(service.load(organizationId, '/api/equipment/free-text')),
    ).rejects.toThrow('The replacement target must be an equipment UUID.');
    expect(equipment.get).not.toHaveBeenCalled();
  });

  it.each(['original', 'successor'] as const)(
    'propagates %s read failures for the owning query state',
    async (failedRead) => {
      const failure = { status: 403, detail: 'Equipment read unavailable.' };
      equipment.get.mockReset();
      if (failedRead === 'successor') equipment.get.mockReturnValueOnce(of(original));
      equipment.get.mockReturnValueOnce(throwError(() => failure));
      await expect(firstValueFrom(service.load(organizationId, equipmentId))).rejects.toBe(failure);
    },
  );
});
