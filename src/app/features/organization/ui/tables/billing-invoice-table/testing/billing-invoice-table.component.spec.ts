import { TestBed } from '@angular/core/testing';
import type { InvoiceOutput } from '@features/organization/models';
import { BillingInvoiceTable } from '../billing-invoice-table.component';

const invoice = (overrides: Partial<InvoiceOutput> = {}): InvoiceOutput =>
  ({
    '@id': '/api/invoices/inv-1',
    '@type': 'Invoice',
    id: 'inv-1',
    number: 'INV-0001',
    status: 'paid',
    amount: 4900,
    currency: 'USD',
    createdAt: '2026-01-15T00:00:00Z',
    hostedInvoiceUrl: 'https://billing.example.com/inv-1',
    invoicePdf: 'https://billing.example.com/inv-1.pdf',
    ...overrides,
  }) as InvoiceOutput;

describe('BillingInvoiceTable', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BillingInvoiceTable] });
  });

  const createFixture = (overrides: { invoices?: readonly InvoiceOutput[]; loading?: boolean } = {}) => {
    const fixture = TestBed.createComponent(BillingInvoiceTable);
    fixture.componentRef.setInput('invoices', overrides.invoices ?? []);
    fixture.componentRef.setInput('loading', overrides.loading ?? false);
    fixture.detectChanges();
    return fixture;
  };

  it('should render the table without invoice rows while loading', () => {
    const fixture = createFixture({ loading: true });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('p-table')).toBeTruthy();
    expect(host.textContent).not.toContain('No invoices yet');
  });

  it('should render the empty state when there are no invoices', () => {
    const fixture = createFixture({ invoices: [] });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('No invoices yet');
  });

  it('should render an invoice row with number, date, amount and status', () => {
    const fixture = createFixture({ invoices: [invoice()] });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('INV-0001');
    expect(host.textContent).toMatch(/49[.,]00/);
    expect(host.textContent).toContain('Paid');
  });

  it('should fall back to the invoice id when number is missing', () => {
    const fixture = createFixture({ invoices: [invoice({ number: null })] });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('inv-1');
  });

  it('should show the download action when a PDF or hosted URL is available', () => {
    const fixture = createFixture({ invoices: [invoice()] });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('button[aria-label="Download invoice"]')).toBeTruthy();
  });

  it('should hide the download action when no PDF or hosted URL is available', () => {
    const fixture = createFixture({
      invoices: [invoice({ invoicePdf: null, hostedInvoiceUrl: null })],
    });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('button[aria-label="Download invoice"]')).toBeNull();
  });

  it('should open the invoice PDF in a new tab when the download action is clicked', () => {
    const fixture = createFixture({ invoices: [invoice()] });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLElement>('button[aria-label="Download invoice"]')?.click();

    expect(openSpy).toHaveBeenCalledWith(
      'https://billing.example.com/inv-1.pdf',
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });

  it('should fall back to the hosted invoice URL when no PDF is available', () => {
    const fixture = createFixture({ invoices: [invoice({ invoicePdf: null })] });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLElement>('button[aria-label="Download invoice"]')?.click();

    expect(openSpy).toHaveBeenCalledWith(
      'https://billing.example.com/inv-1',
      '_blank',
      'noopener,noreferrer',
    );
    openSpy.mockRestore();
  });

  it('should not open a window when clicking without a valid URL', () => {
    const fixture = createFixture();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    fixture.componentInstance['openInvoice'](invoice({ invoicePdf: null, hostedInvoiceUrl: null }));

    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it.each([
    ['paid', 'Paid'],
    ['open', 'Open'],
    ['draft', 'Draft'],
    ['void', 'Void'],
    ['uncollectible', 'Uncollectible'],
    ['unknown_status', 'unknown_status'],
  ])('should resolve the %s status descriptor', (status, label) => {
    const fixture = createFixture();
    const descriptor = fixture.componentInstance['statusDescriptor'](status);

    expect(descriptor.label).toBe(label);
  });

  it('should render multiple invoice rows', () => {
    const fixture = createFixture({
      invoices: [invoice({ id: 'inv-1', number: 'INV-0001' }), invoice({ id: 'inv-2', number: 'INV-0002' })],
    });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('INV-0001');
    expect(host.textContent).toContain('INV-0002');
  });
});
