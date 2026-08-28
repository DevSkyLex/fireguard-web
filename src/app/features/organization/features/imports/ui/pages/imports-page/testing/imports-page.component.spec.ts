import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { OrganizationPermissionService } from '@features/organization/access';
import type { ImportJobOutput } from '@features/organization/features/imports/models';
import { ImportJobsStore } from '@features/organization/features/imports/state';
import { ImportUploadForm } from '@features/organization/features/imports/ui/forms/import-upload-form';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
import { ImportsPage } from '../imports-page.component';

const createPage = async (): Promise<ComponentFixture<ImportsPage>> => {
  const created: ComponentFixture<ImportsPage> = TestBed.createComponent(ImportsPage);
  created.componentRef.setInput('organizationId', 'org-1');
  await created.whenStable();

  return created;
};

describe('ImportsPage', () => {
  let fixture: ComponentFixture<ImportsPage>;
  let load: ReturnType<typeof vi.fn>;
  let create: ReturnType<typeof vi.fn>;
  let hasPermission: ReturnType<typeof vi.fn>;

  const job: ImportJobOutput = {
    '@id': '/api/imports/job-1',
    '@type': 'ImportJob',
    id: 'job-1',
    organization: '/api/organizations/org-1',
    kind: 'equipment',
    status: 'pending',
    originalFilename: 'equipment.csv',
    dryRun: false,
    processedRows: 0,
    successfulRows: 0,
    failedRows: 0,
    errorReport: [],
    createdAt: '2026-01-18T00:00:00+00:00',
    updatedAt: '2026-01-18T00:00:00+00:00',
  };

  beforeEach(() => {
    load = vi.fn();
    create = vi.fn();
    hasPermission = vi.fn().mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
        provideRouter([]),
        {
          provide: ImportJobsStore,
          useValue: {
            load,
            create,
            refresh: vi.fn(),
            resetCreateOperation: vi.fn(),
            jobs: signal<readonly ImportJobOutput[]>([job]),
            totalJobs: signal(1),
            isLoading: signal(false),
            hasListError: signal(false),
            isCreating: signal(false),
            createError: signal<string | null>(null),
          },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission } },
      ],
    });
  });

  it('should load the first page for the active organization on arrival', async () => {
    fixture = await createPage();

    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        options: { page: 1, itemsPerPage: 30 },
      }),
    );
  });

  it('should fold the organization id into the upload submission', async () => {
    fixture = await createPage();

    (
      fixture.componentInstance as unknown as {
        upload(submission: { kind: string; file: File; dryRun: boolean }): void;
      }
    ).upload({ kind: 'equipment', file: new File([''], 'e.csv'), dryRun: true });

    expect(create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      kind: 'equipment',
      file: expect.any(File),
      dryRun: true,
    });
  });

  it('should open the report panel for the row activated on the table', async () => {
    fixture = await createPage();

    fixture.nativeElement.querySelector('[data-testid="import-job-table-view"]')?.click();
    await fixture.whenStable();

    expect(document.body.querySelector('[data-testid="import-job-detail-sheet"]')).not.toBeNull();
  });

  it('should render the upload card when the reader may write at least one kind', async () => {
    fixture = await createPage();

    expect(
      fixture.nativeElement.querySelector('[data-testid="imports-upload-card"]'),
    ).not.toBeNull();
    expect(hasPermission).toHaveBeenCalledWith(ORGANIZATION_PERMISSION.EQUIPMENT_WRITE);
    expect(hasPermission).toHaveBeenCalledWith(ORGANIZATION_PERMISSION.FACILITIES_WRITE);
    expect(hasPermission).toHaveBeenCalledWith(ORGANIZATION_PERMISSION.MEMBERS_MANAGE);
  });

  it('should hide the upload card entirely when the reader holds no write permission', async () => {
    hasPermission.mockReturnValue(false);
    fixture = await createPage();

    expect(fixture.nativeElement.querySelector('[data-testid="imports-upload-card"]')).toBeNull();
  });

  it('should offer only the kind the reader may write', async () => {
    hasPermission.mockImplementation(
      (permission: string) => permission === ORGANIZATION_PERMISSION.FACILITIES_WRITE,
    );
    fixture = await createPage();

    const form = fixture.debugElement.query(By.directive(ImportUploadForm))
      .componentInstance as ImportUploadForm;

    expect(form.kindOptions()).toEqual([{ label: 'Facilities', value: 'facility' }]);
  });

  it('should gate the member kind on organization.members.manage', async () => {
    hasPermission.mockImplementation(
      (permission: string) => permission === ORGANIZATION_PERMISSION.MEMBERS_MANAGE,
    );
    fixture = await createPage();

    const form = fixture.debugElement.query(By.directive(ImportUploadForm))
      .componentInstance as ImportUploadForm;

    expect(form.kindOptions()).toEqual([{ label: 'Members', value: 'member' }]);
  });

  it('should re-run the current query on retry', async () => {
    fixture = await createPage();
    load.mockClear();

    (fixture.componentInstance as unknown as { reload(): void }).reload();

    expect(load).toHaveBeenCalledWith({
      organizationId: 'org-1',
      options: { page: 1, itemsPerPage: 30 },
    });
  });
});
