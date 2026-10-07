import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ConnectivityService } from '@core/connectivity';
import { THEME_PORT } from '@core/theme';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { CustomerService } from '@features/organization/features/customers/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { MaintenanceExportService } from '@features/organization/features/maintenance-exports/data-access';
import { maintenanceExportFixture } from '@features/organization/features/maintenance-exports/models/export/testing/maintenance-export.fixture';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { MaintenanceExportsPage } from '../maintenance-exports-page.component';

describe('MaintenanceExportsPage', () => {
  let fixture: ComponentFixture<MaintenanceExportsPage>,
    api: Record<string, ReturnType<typeof vi.fn>>;
  const authenticated = signal(true),
    sessionRevision = signal(1),
    online = signal(true),
    grants = signal<readonly string[]>([]);
  const archive = maintenanceExportFixture();
  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const setup = async (platform = 'browser'): Promise<void> => {
    TestBed.configureTestingModule({
      imports: [MaintenanceExportsPage],
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: MaintenanceExportService, useValue: api },
        { provide: CustomerService, useValue: { list: vi.fn() } },
        { provide: FacilityService, useValue: { list: vi.fn() } },
        { provide: EquipmentService, useValue: { list: vi.fn() } },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (permission: string) => grants().includes(permission) },
        },
        {
          provide: AUTH_SESSION_PORT,
          useValue: { isAuthenticated: authenticated, sessionRevision },
        },
        { provide: ConnectivityService, useValue: { isOnline: online } },
        { provide: THEME_PORT, useValue: { resolvedTheme: signal('light') } },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal({ dateFormat: 'dd/MM/yyyy', timezone: 'UTC' }) },
        },
        { provide: BrowserDownloadService, useValue: { trigger: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(MaintenanceExportsPage);
    fixture.componentRef.setInput('organizationId', 'org');
    fixture.componentRef.setInput('exportId', archive.id);
    await fixture.whenStable();
  };
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });
  beforeEach(() => {
    authenticated.set(true);
    sessionRevision.set(1);
    online.set(true);
    grants.set([ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_READ]);
    api = {
      list: vi.fn().mockReturnValue(of({ member: [archive], totalItems: 1 })),
      read: vi.fn().mockReturnValue(of(archive)),
      listReferences: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      listSources: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      download: vi.fn().mockReturnValue(of(new Blob(['retained']))),
    };
  });
  it.each(['server', 'anonymous', 'no-read'])(
    'performs zero private calls and renders no archive identity in %s',
    async (mode) => {
      if (mode === 'anonymous') authenticated.set(false);
      if (mode === 'no-read') grants.set([]);
      await setup(mode === 'server' ? 'server' : 'browser');
      expect(api['list']).not.toHaveBeenCalled();
      expect(api['read']).not.toHaveBeenCalled();
      expect(api['listReferences']).not.toHaveBeenCalled();
      expect(root().querySelector('[data-testid=maintenance-export-detail]')).toBeNull();
    },
  );
  it('distinguishes a generated archive from an actually confirmed import in a read-only workspace', async () => {
    await setup();
    expect(root().textContent).toContain('No external import has been confirmed');
    expect(root().querySelector('[data-testid=maintenance-export-create]')).toBeNull();
    expect(root().textContent).toContain('Download retained JSON');
    expect(root().textContent).not.toContain('Confirm external import');
  });
  it('shows the actual import reference and keeps adjustments linked to their predecessor', async () => {
    api['read']?.mockReturnValue(
      of(
        maintenanceExportFixture({
          kind: 'adjustment',
          adjustmentOf: 'original',
          originalExportId: 'original',
          state: 'import_confirmed',
          confirmation: {
            clientOperationId: 'ack',
            externalImportReference: 'ERP-IMPORT-42',
            confirmedAt: '2026-10-07T12:01:00Z',
            actorId: 'member',
          },
        }),
      ),
    );
    await setup();
    expect(root().textContent).toContain('ERP-IMPORT-42');
    expect(root().textContent).toContain('Open corrected export');
    expect(root().textContent).not.toContain('No external import has been confirmed');
  });
  it('does not make source picker reads until the creation sheet is explicitly opened', async () => {
    grants.set([...grants(), ORGANIZATION_PERMISSION.MAINTENANCE_EXPORTS_MANAGE]);
    await setup();
    expect(api['listSources']).not.toHaveBeenCalled();
    root().querySelector<HTMLButtonElement>('[data-testid=maintenance-export-create]')?.click();
    await fixture.whenStable();
    expect(api['listSources']).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain('Generate a prestation export');
  });
  it('clears archive identities on account replacement and reloads within the new session', async () => {
    await setup();
    sessionRevision.set(2);
    api['list']?.mockReturnValue(of({ member: [], totalItems: 0 }));
    api['read']?.mockReturnValue(
      of(
        maintenanceExportFixture({
          id: 'new-session-archive',
          files: { ...archive.files, json: { ...archive.files.json, sha256: 'new-session-hash' } },
        }),
      ),
    );
    await fixture.whenStable();
    expect(root().textContent).not.toContain('original-json-hash');
    expect(api['list']).toHaveBeenCalledTimes(2);
  });
});
