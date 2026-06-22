import { DatePipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule, type TablePassThroughOptions } from 'primeng/table';
import type { InvoiceOutput } from '@features/organization/models';
import { EmptyState, Tag, type TagDescriptor } from '@shared/components';

/**
 * Component BillingInvoiceTable
 * @class BillingInvoiceTable
 *
 * @description
 * Presentational billing-history table that lists the organization's recent
 * invoices (number, date, amount, status and a link to the hosted invoice /
 * PDF). Follows the app's carded-table pattern: a bordered `p-card` whose header
 * owns the section title and whose body hosts an edge-to-edge `p-table` with
 * skeleton loading rows, status tags and an empty state. Owns no orchestration:
 * data is passed in and error handling stays with the parent.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-billing-invoice-table',
  imports: [ButtonModule, CardModule, DatePipe, EmptyState, SkeletonModule, TableModule, Tag],
  templateUrl: './billing-invoice-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingInvoiceTable {
  //#region Dependencies
  /**
   * Property document
   * @readonly
   *
   * @description
   * Injected document used to open invoice URLs in a new tab in an SSR-safe way
   * (`defaultView` is null on the server).
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);
  //#endregion

  //#region Inputs
  /**
   * Input invoices
   * @readonly
   *
   * @description
   * The recent invoices to render, newest first.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InvoiceOutput[]>}
   */
  public readonly invoices: InputSignal<readonly InvoiceOutput[]> = input.required();

  /**
   * Input loading
   * @readonly
   *
   * @description
   * Whether the invoices are currently being loaded.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input(false);
  //#endregion

  //#region Properties
  /**
   * Property cardPt
   * @readonly
   *
   * @description
   * PrimeNG card pass-through classes giving the table a bordered, shadowless
   * surface whose body has no padding so rows reach the card edges.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class:
        'flex flex-col overflow-hidden border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-900 shadow-none',
    },
    body: {
      class: 'p-0 flex flex-col',
    },
  };

  /**
   * Property tablePt
   * @readonly
   *
   * @description
   * PrimeNG table pass-through classes used for the carded table layout. The
   * paginator is pinned to the bottom of the card, right-aligned, and hidden
   * while loading or when there are no invoices to page through.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<TablePassThroughOptions>}
   */
  protected readonly tablePt: Signal<TablePassThroughOptions> = computed(
    (): TablePassThroughOptions => ({
      table: {
        class: 'text-sm',
      },
      pcPaginator: {
        root: {
          class:
            'mt-auto rounded-t-none rounded-b-2xl bg-surface-0 dark:bg-surface-900 justify-end' +
            (this.loading() || this.invoices().length === 0 ? ' hidden' : ''),
        },
      },
    }),
  );

  /**
   * Property rows
   * @readonly
   *
   * @description
   * Default number of invoice rows per page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number}
   */
  protected readonly rows: number = 10;

  /**
   * Property rowsPerPageOptions
   * @readonly
   *
   * @description
   * Page-size choices offered by the paginator.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {number[]}
   */
  protected readonly rowsPerPageOptions: number[] = [10, 20, 50];

  /**
   * Property skeletonItems
   * @readonly
   *
   * @description
   * Placeholder rows displayed while loading.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {undefined[]}
   */
  protected readonly skeletonItems: undefined[] = Array(5);
  //#endregion

  //#region Methods
  /**
   * Method openInvoice
   *
   * @description
   * Opens the invoice's PDF (or hosted invoice page as a fallback) in a new tab.
   * SSR-safe: `defaultView` is null on the server.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InvoiceOutput} invoice - Invoice to open.
   * @returns {void}
   */
  protected openInvoice(invoice: InvoiceOutput): void {
    const url: string | null | undefined = invoice.invoicePdf ?? invoice.hostedInvoiceUrl;

    if (url) {
      this.document.defaultView?.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Method amountLabel
   *
   * @description
   * Formats an invoice amount (minor currency unit) as a localized currency
   * string.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InvoiceOutput} invoice - Invoice to format.
   * @returns {string} The formatted amount.
   */
  protected amountLabel(invoice: InvoiceOutput): string {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: invoice.currency,
      maximumFractionDigits: 2,
    }).format(invoice.amount / 100);
  }

  /**
   * Method statusDescriptor
   *
   * @description
   * Resolves an invoice status into a shared {@link TagDescriptor} (label,
   * severity, icon) so the status renders through the app-standard `app-tag`
   * and never relies on colour alone.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} status - Raw invoice status.
   * @returns {TagDescriptor} The presentation descriptor for the status.
   */
  protected statusDescriptor(status: string): TagDescriptor {
    switch (status) {
      case 'paid':
        return {
          label: $localize`:@@invoiceStatus.paid:Paid`,
          severity: 'success',
          icon: 'pi pi-check-circle',
        };
      case 'open':
        return {
          label: $localize`:@@invoiceStatus.open:Open`,
          severity: 'warn',
          icon: 'pi pi-clock',
        };
      case 'draft':
        return {
          label: $localize`:@@invoiceStatus.draft:Draft`,
          severity: 'secondary',
          icon: 'pi pi-pencil',
        };
      case 'void':
        return {
          label: $localize`:@@invoiceStatus.void:Void`,
          severity: 'danger',
          icon: 'pi pi-ban',
        };
      case 'uncollectible':
        return {
          label: $localize`:@@invoiceStatus.uncollectible:Uncollectible`,
          severity: 'danger',
          icon: 'pi pi-times-circle',
        };
      default:
        return { label: status, severity: 'secondary', icon: 'pi pi-info-circle' };
    }
  }
  //#endregion
}
