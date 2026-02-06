import { Injectable, inject } from '@angular/core';
import { MessageService, type ToastMessageOptions } from 'primeng/api';

/**
 * Service ToastService
 *
 * @description
 * Wrapper around PrimeNG MessageService for application toast notifications.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  //#region Properties
  /**
   * Property messageService
   * @readonly
   *
   * @description
   * PrimeNG message service.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessageService}
   */
  private readonly messageService: MessageService =
    inject<MessageService>(MessageService);
  //#endregion

  //#region Methods
  /**
   * Method error
   *
   * @description
   * Displays an error toast.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} detail - Message body.
   * @param {string} [summary] - Optional summary.
   *
   * @returns {void}
   */
  public error(detail: string, summary: string = 'Error'): void {
    this.messageService.add({
      severity: 'error',
      summary: summary,
      detail: detail,
      life: 5000,
    });
  }

  /**
   * Method success
   *
   * @description
   * Displays a success toast.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} detail - Message body.
   * @param {string} [summary] - Optional summary.
   *
   * @returns {void}
   */
  public success(detail: string, summary: string = 'Success'): void {
    this.messageService.add({
      severity: 'success',
      summary: summary,
      detail: detail,
      life: 4000,
    });
  }

  /**
   * Method info
   *
   * @description
   * Displays an info toast.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} detail - Message body.
   * @param {string} [summary] - Optional summary.
   *
   * @returns {void}
   */
  public info(detail: string, summary: string = 'Info'): void {
    this.messageService.add({
      severity: 'info',
      summary: summary,
      detail: detail,
      life: 4000,
    });
  }

  /**
   * Method warn
   *
   * @description
   * Displays a warning toast.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} detail - Message body.
   * @param {string} [summary] - Optional summary.
   *
   * @returns {void}
   */
  public warn(detail: string, summary: string = 'Warning'): void {
    this.messageService.add({
      severity: 'warn',
      summary: summary,
      detail: detail,
      life: 4000,
    });
  }

  /**
   * Method show
   *
   * @description
   * Displays a toast using raw PrimeNG options.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {ToastMessageOptions} options - PrimeNG toast options.
   *
   * @returns {void}
   */
  public show(options: ToastMessageOptions): void {
    this.messageService.add(options);
  }

  /**
   * Method clear
   *
   * @description
   * Clears all current toasts.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public clear(): void {
    this.messageService.clear();
  }
  //#endregion
}
