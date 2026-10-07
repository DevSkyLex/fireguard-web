import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { EquipmentTypeOutput } from '@features/organization/features/equipments/models';
import { EquipmentTypeService } from '../equipment-type.service';

describe('EquipmentTypeService', () => {
  let service: EquipmentTypeService;
  let http: HttpTestingController;
  const url = 'https://api.test/api/organizations/org-1/equipment-types';
  const entry: EquipmentTypeOutput = {
    '@id': '/api/organizations/org-1/equipment-types/fire_blanket',
    '@type': 'EquipmentType',
    value: 'fire_blanket',
    label: 'Fire blanket',
    family: 'fire',
    archived: false,
    revision: 1,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EquipmentTypeService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(EquipmentTypeService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('creates a catalogue type inside the organization', () => {
    const input = { value: entry.value, label: entry.label, family: entry.family };
    let result: EquipmentTypeOutput | undefined;
    service.create('org-1', input).subscribe((value) => {
      result = value;
    });
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(input);
    request.flush(entry);
    expect(result).toEqual(entry);
  });

  it.each([
    { label: 'Blanket' },
    { family: 'safety' as const },
    { archived: true },
    { archived: false },
  ])('merge-patches explicit descriptor changes with the reviewed revision %s', (changes) => {
    service.update('org-1', entry.value, { revision: 4, ...changes }).subscribe();
    const request = http.expectOne(`${url}/${entry.value}`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
    expect(request.request.body).toEqual({ revision: 4, ...changes });
    expect(request.request.body).not.toHaveProperty('value');
    request.flush({ ...entry, ...changes, revision: 5 });
  });

  it('propagates a revision conflict without retrying a command', () => {
    let failure: unknown;
    service.update('org-1', entry.value, { revision: 1, archived: true }).subscribe({
      error: (error: unknown) => {
        failure = error;
      },
    });
    http
      .expectOne(`${url}/${entry.value}`)
      .flush(
        { status: 409, title: 'Conflict', detail: 'Equipment type revision is stale.' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(failure).toMatchObject({ status: 409, detail: 'Equipment type revision is stale.' });
    http.expectNone(`${url}/${entry.value}`);
  });

  it('reads all pages, including archived descriptors, before resolving the catalogue', () => {
    let result: readonly EquipmentTypeOutput[] | undefined;
    service.listAll('org-1').subscribe((entries) => {
      result = entries;
    });
    const first = http.expectOne(
      (request) => request.url === url && request.params.get('page') === '1',
    );
    expect(first.request.params.get('itemsPerPage')).toBe('200');
    const firstPage: EquipmentTypeOutput[] = Array.from({ length: 200 }, (_, index) => ({
      ...entry,
      value: `type_${index}`,
    }));
    first.flush({ member: firstPage, totalItems: 201 });
    expect(result).toBeUndefined();
    const second = http.expectOne(
      (request) => request.url === url && request.params.get('page') === '2',
    );
    const archived = { ...entry, value: 'old_type', archived: true };
    second.flush({ member: [archived], totalItems: 201 });
    expect(result).toEqual([...firstPage, archived]);
  });

  it('reads an unpaginated catalog with more than two hundred descriptors exactly once', () => {
    const descriptors: EquipmentTypeOutput[] = Array.from({ length: 201 }, (_, index) => ({
      ...entry,
      value: `type_${index}`,
    }));
    let result: readonly EquipmentTypeOutput[] | undefined;
    service.listAll('org-1').subscribe((entries) => {
      result = entries;
    });
    const request = http.expectOne((candidate) => candidate.url === url);
    request.flush({ member: descriptors, totalItems: descriptors.length });
    expect(result).toEqual(descriptors);
    expect(result).toHaveLength(201);
    http.expectNone((candidate) => candidate.url === url);
  });
});
