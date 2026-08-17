import type { ApiRequestOptions } from './api-request-options.interface';
import type { PaginationOptions } from './pagination-options.interface';
import type { SearchOptions } from './search-options.interface';
import type { SortingOptions } from './sorting-options.interface';

/**
 * Type RequestOptions
 *
 * @description
 * Complete request options shape supported by API
 * service methods, combining generic request,
 * pagination, sorting and search parameters.
 */
export type RequestOptions = ApiRequestOptions & PaginationOptions & SortingOptions & SearchOptions;
