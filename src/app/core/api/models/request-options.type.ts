import type { ApiRequestOptions } from './api-request-options.interface';
import type { PaginationOptions } from './pagination-options.interface';

/**
 * Type RequestOptions
 *
 * @description
 * Complete request options shape supported by API
 * service methods, combining generic request and
 * pagination parameters.
 */
export type RequestOptions = ApiRequestOptions & PaginationOptions;
