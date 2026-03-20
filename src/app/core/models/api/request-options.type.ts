import type { ApiRequestOptions } from './api-request-options.interface';
import type { PaginationOptions } from './pagination-options.interface';

export type RequestOptions = ApiRequestOptions & PaginationOptions;
