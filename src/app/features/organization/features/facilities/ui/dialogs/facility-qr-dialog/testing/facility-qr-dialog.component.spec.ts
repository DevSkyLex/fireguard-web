import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityQrDialog } from '../facility-qr-dialog.component';

const toDataURL = vi.fn(
  async (_text: string, _options: Record<string, unknown>): Promise<string> =>
    'data:image/png;base64,stub',
);

vi.mock('qrcode', () => ({
  toDataURL: (text: string, options: Record<string, unknown>) => toDataURL(text, options),
}));

const FACILITY: FacilityOutput = {
  id: 'facility-1',
  '@id': '/api/facilities/facility-1',
  '@type': 'Facility',
  organizationId: 'org-1',
  name: 'Central Warehouse',
  code: 'WH-01',
  type: 'site',
  status: 'active',
  address: null,
  metadata: {},
  latitude: null,
  longitude: null,
  parentFacilityId: null,
  hasChildren: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const content = (): HTMLElement =>
  document.querySelector('[data-testid="facility-qr-dialog"]') as HTMLElement;
const inDialog = (selector: string): HTMLElement | null => content()?.querySelector(selector);

describe('FacilityQrDialog', () => {
  let fixture: ComponentFixture<FacilityQrDialog>;

  const open = async (facility: FacilityOutput | null = FACILITY): Promise<void> => {
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('facility', facility);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    toDataURL.mockClear();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(FacilityQrDialog);
    fixture.componentRef.setInput('organizationId', 'org-1');
    await fixture.whenStable();
  });

  it('should stay closed while not visible', () => {
    expect(content()).toBeNull();
  });

  it('should render the facility name and code once open', async () => {
    await open();

    expect(content().textContent).toContain('Central Warehouse');
    expect(content().textContent).toContain('WH-01');
  });

  it('should encode the absolute facility URL', async () => {
    await open();

    expect(toDataURL).toHaveBeenCalledWith(
      expect.stringMatching(/^https?:\/\/[^/]+\/organizations\/org-1\/facilities\/facility-1$/),
      expect.objectContaining({ errorCorrectionLevel: 'M' }),
    );
  });

  it('should give the QR image a meaningful alt text', async () => {
    await open();

    const image = inDialog('img') as HTMLImageElement;
    expect(image.alt).toBe('QR code linking to Central Warehouse');
  });

  it('should disable Print and Download until the QR has rendered', async () => {
    toDataURL.mockImplementationOnce(() => new Promise(() => undefined));
    await open();

    expect((inDialog('[data-testid="facility-qr-print"]') as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((inDialog('[data-testid="facility-qr-download"]') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('should call window.print on Print', async () => {
    const printSpy = vi.spyOn(globalThis, 'print').mockImplementation(() => undefined);
    await open();

    (inDialog('[data-testid="facility-qr-print"]') as HTMLButtonElement).click();

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('should trigger a PNG download on Download', async () => {
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string, options?: ElementCreationOptions) => {
        const element = originalCreateElement(tag, options);
        if (tag === 'a') (element as HTMLAnchorElement).click = clickSpy;
        return element;
      });
    await open();

    (inDialog('[data-testid="facility-qr-download"]') as HTMLButtonElement).click();

    const anchor = createElementSpy.mock.results.at(-1)?.value as HTMLAnchorElement;
    expect(anchor.href).toContain('data:image/png;base64,stub');
    expect(anchor.download).toBe('wh-01-qr.png');
    expect(clickSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
  });

  it('should emit dismissed on close', async () => {
    const dismissed = vi.fn();
    fixture.componentInstance.dismissed.subscribe(dismissed);
    await open();

    (inDialog('button[hlmDialogClose]') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(dismissed).toHaveBeenCalled();
  });

  it('should clear the rendered QR when reopened without a facility', async () => {
    await open();
    expect(inDialog('img')).not.toBeNull();

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();
    fixture.componentRef.setInput('facility', null);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(inDialog('img')).toBeNull();
  });
});
