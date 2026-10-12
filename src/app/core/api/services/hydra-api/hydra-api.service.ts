import {
  HttpClient,
  HttpHeaders,
  HttpParams,
  type HttpErrorResponse,
  type HttpResponse,
} from '@angular/common/http';
import { inject, LOCALE_ID, Service } from '@angular/core';
import { type Observable, catchError, map, throwError } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { EnvironmentConfig } from '@core/config/environment/environment-config.interface';
import { WriteOperationService } from '@core/request-state';
import {
  type ApiError,
  type ApiRequestOptions,
  type ConstraintViolation,
  type HydraCollection,
  type HydraItem,
  type RequestOptions,
} from '../../models';
import { isApiError } from '../../utils';

export type {
  ApiRequestOptions,
  PaginationOptions,
  RequestOptions,
  SearchOptions,
  SortDirection,
  SortingOptions,
} from '../../models';

/**
 * Service HydraApiService
 * @class HydraApiService
 *
 * @description
 * Abstract base class for API services.
 * Provides DRY methods for Hydra/JSON-LD API interactions.
 *
 * All domain-specific services should extend this class.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * @Service()
 * export class UserService extends HydraApiService {
 *   list(): Observable<HydraCollection<User>> {
 *     return this.getCollection<User>('/api/users');
 *   }
 *
 *   get(id: string): Observable<User> {
 *     return this.getOne<User>(`/api/users/${id}`);
 *   }
 * }
 * ```
 */
@Service({ autoProvided: false })
export abstract class HydraApiService {
  //#region Properties
  /**
   * Property http
   * @readonly
   *
   * @description
   * Angular HTTP client for making HTTP requests.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {HttpClient}
   */
  protected readonly http: HttpClient = inject<HttpClient>(HttpClient);

  /**
   * Property env
   * @readonly
   *
   * @description
   * Environment configuration containing API base URL and other settings.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {EnvironmentConfig}
   */
  protected readonly env: EnvironmentConfig = inject<EnvironmentConfig>(ENV_CONFIG);

  /**
   * Property localeId
   * @readonly
   *
   * @description
   * Active Angular bundle locale, shared by all Hydra requests.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly localeId: string = inject<string>(LOCALE_ID);

  /**
   * Property writeOperations
   * @readonly
   *
   * @description
   * Creates a stable identity before constructing each new mutation observable.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WriteOperationService}
   */
  protected readonly writeOperations: WriteOperationService = inject(WriteOperationService);

  /**
   * Property defaultHeaders
   * @readonly
   *
   * @description
   * Default HTTP headers for JSON-LD/Hydra API requests.
   * Sets JSON-LD media types and the active interface language.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {HttpHeaders}
   */
  protected readonly defaultHeaders: HttpHeaders = new HttpHeaders({
    'Content-Type': 'application/ld+json',
    Accept: 'application/ld+json',
    'Accept-Language': this.localeId.toLowerCase().split(/[-_]/)[0],
  });
  //#endregion

  //#region Protected Methods
  /**
   * Method buildUrl
   *
   * @description
   * Constructs the full API URL by combining base URL with endpoint.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} endpoint - API endpoint path (e.g., '/api/users').
   *
   * @returns {string} Full URL including base URL.
   */
  protected buildUrl(endpoint: string): string {
    return `${this.env.apiUrl}${endpoint}`;
  }

  /**
   * Method buildParams
   *
   * @description
   * Builds HttpParams from options object, including pagination, the
   * single-field `order[<field>]` sort and the `search` term, alongside any
   * hand-built `params` passthrough. A whitespace-only `search` is treated as
   * unset. Callers still forwarding sort or search through `options.params`
   * keep working unchanged — this method never deduplicates against it.
   * A readonly array value in `options.params` is appended as a repeated
   * `key[]=` param, one per member, the shape an `isAnyOf` narrowing sends —
   * a scalar value still sends the single `key=` form (§10.6).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {RequestOptions} [options] - Request options including pagination, sort and search.
   *
   * @returns {HttpParams} HttpParams instance with all parameters set.
   */
  protected buildParams(options?: RequestOptions): HttpParams {
    let params: HttpParams = new HttpParams();

    if (options?.page) {
      params = params.set('page', options.page.toString());
    }
    if (options?.itemsPerPage) {
      params = params.set('itemsPerPage', options.itemsPerPage.toString());
    }
    if (options?.sort) {
      params = params.set(`order[${options.sort.field}]`, options.sort.direction);
    }
    if (options?.search?.trim()) {
      params = params.set('search', options.search);
    }
    if (options?.params) {
      params = this.appendPassThroughParams(params, options.params);
    }

    return params;
  }

  /**
   * Method appendPassThroughParams
   *
   * @description
   * Adds scalar and repeated array query parameters without changing the
   * caller-supplied keys or filtering valid false and zero values.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {HttpParams} params - Parameters already built from standard options.
   * @param {NonNullable<ApiRequestOptions['params']>} values - Extra query parameters.
   *
   * @returns {HttpParams} Parameters with extra values appended.
   */
  private appendPassThroughParams(
    params: HttpParams,
    values: NonNullable<ApiRequestOptions['params']>,
  ): HttpParams {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined && item !== null) {
            params = params.append(`${key}[]`, String(item));
          }
        }
        continue;
      }

      params = params.set(key, String(value));
    }

    return params;
  }

  /**
   * Method buildHeaders
   *
   * @description
   * Builds HttpHeaders by merging default headers with custom options.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {ApiRequestOptions} [options] - Request options with additional headers.
   *
   * @returns {HttpHeaders} HttpHeaders instance with merged headers.
   */
  protected buildHeaders(options?: ApiRequestOptions): HttpHeaders {
    let headers: HttpHeaders = this.defaultHeaders;

    if (options?.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        headers = headers.set(key, value);
      }
    }

    return headers;
  }

  /**
   * Method buildWriteHeaders
   * @method buildWriteHeaders
   *
   * @description
   * Preserves an explicit operation key or creates one before HTTP observable construction.
   * Multipart requests remove Content-Type so the browser supplies its boundary.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ApiRequestOptions} [options] - Caller-owned immutable write identity and headers.
   * @param {boolean} [multipart] - Whether the body uses browser-managed multipart encoding.
   *
   * @returns {HttpHeaders} Headers retaining one idempotency key for all subscriptions.
   */
  protected buildWriteHeaders(options?: ApiRequestOptions, multipart = false): HttpHeaders {
    const headers = this.buildHeaders(options);
    const key =
      options?.idempotencyKey ??
      headers.get('Idempotency-Key') ??
      this.writeOperations.create().idempotencyKey;
    const keyed = headers.set('Idempotency-Key', key);
    return multipart ? keyed.delete('Content-Type') : keyed;
  }

  /**
   * Method postMultipart
   * @method postMultipart
   *
   * @description
   * Posts multipart data with a stable operation key and browser-managed Content-Type.
   *
   * @access protected
   * @since unreleased
   *
   * @template TOutput - Type of the returned transport resource.
   *
   * @param {string} endpoint - API endpoint path.
   * @param {FormData} body - Immutable upload intention.
   * @param {ApiRequestOptions} [options] - Caller-owned write identity.
   *
   * @returns {Observable<TOutput>} The upload response.
   */
  protected postMultipart<TOutput>(
    endpoint: string,
    body: FormData,
    options?: ApiRequestOptions,
  ): Observable<TOutput> {
    return this.http
      .post<TOutput>(this.buildUrl(endpoint), body, {
        headers: this.buildWriteHeaders(options, true),
        params: this.buildParams(options),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Method putMultipart
   * @method putMultipart
   *
   * @description
   * Replaces multipart data with a stable operation key and browser-managed Content-Type.
   *
   * @access protected
   * @since unreleased
   *
   * @template TOutput - Type of the returned transport resource.
   *
   * @param {string} endpoint - API endpoint path.
   * @param {FormData} body - Immutable upload intention.
   * @param {ApiRequestOptions} [options] - Caller-owned write identity.
   *
   * @returns {Observable<TOutput>} The upload response.
   */
  protected putMultipart<TOutput>(
    endpoint: string,
    body: FormData,
    options?: ApiRequestOptions,
  ): Observable<TOutput> {
    return this.http
      .put<TOutput>(this.buildUrl(endpoint), body, {
        headers: this.buildWriteHeaders(options, true),
        params: this.buildParams(options),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Method getOne
   *
   * @description
   * Performs a GET request for a single Hydra item resource.
   *
   * @access protected
   * @since 1.0.0
   *
   * @template T - Type of the item (must extend HydraItem).
   *
   * @param {string} endpoint - API endpoint path.
   * @param {ApiRequestOptions} [options] - Request options.
   *
   * @returns {Observable<T>} Observable emitting the item.
   */
  protected getOne<T extends HydraItem>(
    endpoint: string,
    options?: ApiRequestOptions,
  ): Observable<T> {
    return this.http
      .get<T>(this.buildUrl(endpoint), {
        headers: this.buildHeaders(options),
        params: this.buildParams(options),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Method getOneWithWriteIdentity
   * @method getOneWithWriteIdentity
   *
   * @description
   * Retrieves an explicitly stateful resource with one identity allocated before observable
   * construction. Use only when the server synchronizes persisted state during the GET.
   *
   * @access protected
   * @since unreleased
   *
   * @template T - Type of the returned Hydra item.
   *
   * @param {string} endpoint - Stateful API endpoint path.
   * @param {ApiRequestOptions} [options] - Caller-owned retry identity and request options.
   *
   * @returns {Observable<T>} State synchronized by this logical request.
   */
  protected getOneWithWriteIdentity<T extends HydraItem>(
    endpoint: string,
    options?: ApiRequestOptions,
  ): Observable<T> {
    return this.http
      .get<T>(this.buildUrl(endpoint), {
        headers: this.buildWriteHeaders(options),
        params: this.buildParams(options),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Method getCollection
   *
   * @description
   * Performs a GET request for a Hydra collection with pagination support.
   *
   * @access protected
   * @since 1.0.0
   *
   * @template T - Type of items in the collection (must extend HydraItem).
   *
   * @param {string} endpoint - API endpoint path.
   * @param {RequestOptions} [options] - Request and pagination options.
   *
   * @returns {Observable<HydraCollection<T>>} Observable emitting the collection.
   */
  protected getCollection<T extends HydraItem>(
    endpoint: string,
    options?: RequestOptions,
  ): Observable<HydraCollection<T>> {
    return this.http
      .get<HydraCollection<T>>(this.buildUrl(endpoint), {
        headers: this.buildHeaders(options),
        params: this.buildParams(options),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Method post
   *
   * @description
   * Performs a POST request to create a resource or execute an action.
   *
   * @access protected
   * @since 1.0.0
   *
   * @template TInput - Type of the request body.
   * @template TOutput - Type of the response (must extend HydraItem).
   *
   * @param {string} endpoint - API endpoint path.
   * @param {TInput} body - Request body payload.
   * @param {ApiRequestOptions} [options] - Request options.
   *
   * @returns {Observable<TOutput>} Observable emitting the response.
   */
  protected post<TInput, TOutput extends HydraItem>(
    endpoint: string,
    body: TInput,
    options?: ApiRequestOptions,
  ): Observable<TOutput> {
    return this.http
      .post<TOutput>(this.buildUrl(endpoint), body, {
        headers: this.buildWriteHeaders(options),
        params: this.buildParams(options),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Method postAction
   *
   * @description
   * Performs a POST request without body for actions (refresh, logout, etc.).
   *
   * @access protected
   * @since 1.0.0
   *
   * @template TOutput - Type of the response (must extend HydraItem).
   *
   * @param {string} endpoint - API endpoint path.
   * @param {ApiRequestOptions} [options] - Request options.
   *
   * @returns {Observable<TOutput>} Observable emitting the response.
   */
  protected postAction<TOutput extends HydraItem>(
    endpoint: string,
    options?: ApiRequestOptions,
  ): Observable<TOutput> {
    return this.http
      .post<TOutput>(this.buildUrl(endpoint), null, {
        headers: this.buildWriteHeaders(options),
        params: this.buildParams(options),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Method patch
   *
   * @description
   * Performs a PATCH request to partially update a resource.
   * Uses application/merge-patch+json content type.
   *
   * @access protected
   * @since 1.0.0
   *
   * @template TInput - Type of the request body.
   * @template TOutput - Type of the response (must extend HydraItem).
   *
   * @param {string} endpoint - API endpoint path.
   * @param {Partial<TInput>} body - Partial request body with fields to update.
   * @param {ApiRequestOptions} [options] - Request options.
   *
   * @returns {Observable<TOutput>} Observable emitting the updated resource.
   */
  protected patch<TInput, TOutput extends HydraItem>(
    endpoint: string,
    body: Partial<TInput>,
    options?: ApiRequestOptions,
  ): Observable<TOutput> {
    const headers: HttpHeaders = this.buildWriteHeaders(options).set(
      'Content-Type',
      'application/merge-patch+json',
    );

    return this.http
      .patch<TOutput>(this.buildUrl(endpoint), body, {
        headers,
        params: this.buildParams(options),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Method patchWithStatus
   *
   * @description
   * Performs a PATCH request identically to {@link patch}, but resolves the
   * full `HttpResponse` instead of unwrapping the body. Reaches for this
   * instead of {@link patch} only when a caller must distinguish two
   * genuinely different success statuses for the same endpoint (e.g. a
   * synchronous `200` versus an async-approval `202`) — `TOutput` is
   * therefore left unconstrained, since the alternate-status body is not
   * always a Hydra item.
   *
   * @access protected
   * @since 1.5.0
   *
   * @template TInput - Type of the request body.
   * @template TOutput - Type of the response body, for either status.
   *
   * @param {string} endpoint - API endpoint path.
   * @param {Partial<TInput>} body - Partial request body with fields to update.
   * @param {ApiRequestOptions} [options] - Request options.
   *
   * @returns {Observable<HttpResponse<TOutput>>} Observable emitting the full response.
   */
  protected patchWithStatus<TInput, TOutput>(
    endpoint: string,
    body: Partial<TInput>,
    options?: ApiRequestOptions,
  ): Observable<HttpResponse<TOutput>> {
    const headers: HttpHeaders = this.buildWriteHeaders(options).set(
      'Content-Type',
      'application/merge-patch+json',
    );

    return this.http
      .patch<TOutput>(this.buildUrl(endpoint), body, {
        headers,
        params: this.buildParams(options),
        withCredentials: true,
        observe: 'response',
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Method put
   *
   * @description
   * Performs a PUT request to fully replace a resource.
   *
   * @access protected
   * @since 1.0.0
   *
   * @template TInput - Type of the request body.
   * @template TOutput - Type of the response (must extend HydraItem).
   *
   * @param {string} endpoint - API endpoint path.
   * @param {TInput} body - Complete request body.
   * @param {ApiRequestOptions} [options] - Request options.
   *
   * @returns {Observable<TOutput>} Observable emitting the replaced resource.
   */
  protected put<TInput, TOutput extends HydraItem>(
    endpoint: string,
    body: TInput,
    options?: ApiRequestOptions,
  ): Observable<TOutput> {
    return this.http
      .put<TOutput>(this.buildUrl(endpoint), body, {
        headers: this.buildWriteHeaders(options),
        params: this.buildParams(options),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Method delete
   *
   * @description
   * Performs a DELETE request to remove a resource.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} endpoint - API endpoint path.
   * @param {ApiRequestOptions} [options] - Request options.
   *
   * @returns {Observable<void>} Observable completing on success.
   */
  protected delete(endpoint: string, options?: ApiRequestOptions): Observable<void> {
    return this.http
      .delete<void>(this.buildUrl(endpoint), {
        headers: this.buildWriteHeaders(options),
        params: this.buildParams(options),
        withCredentials: true,
      })
      .pipe(
        map(() => undefined),
        catchError(this.handleError),
      );
  }

  /**
   * Method deleteOne
   * @method deleteOne
   *
   * @description
   * Performs a DELETE request whose successful response contains the updated
   * Hydra resource. Use this when the server returns authoritative post-delete
   * state and a follow-up GET would duplicate the mutation contract.
   *
   * @access protected
   * @since 1.6.0
   *
   * @template TOutput - Type of the returned Hydra item.
   *
   * @param {string} endpoint - API endpoint path.
   * @param {ApiRequestOptions} [options] - Request options.
   *
   * @returns {Observable<TOutput>} Observable emitting the post-delete resource.
   */
  protected deleteOne<TOutput extends HydraItem>(
    endpoint: string,
    options?: ApiRequestOptions,
  ): Observable<TOutput> {
    return this.http
      .delete<TOutput>(this.buildUrl(endpoint), {
        headers: this.buildWriteHeaders(options),
        params: this.buildParams(options),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Property handleError
   *
   * @description
   * Centralized error handling that transforms HttpErrorResponse
   * into a structured ApiError following RFC 7807.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {(error: HttpErrorResponse) => Observable<never>}
   *
   * @param {HttpErrorResponse} error - HTTP error response from Angular.
   *
   * @returns {Observable<never>} Observable that throws the API error.
   */
  protected handleError: (error: HttpErrorResponse) => Observable<never> = (
    error: HttpErrorResponse,
  ): Observable<never> => {
    const body: unknown = error.error;
    const operationCompleted =
      typeof body === 'object' &&
      body !== null &&
      'operationCompleted' in body &&
      typeof body.operationCompleted === 'boolean'
        ? body.operationCompleted
        : undefined;
    if (isApiError(body)) {
      const problem: ApiError | ConstraintViolation =
        'operationCompleted' in body ? { ...body, status: error.status, operationCompleted } : body;

      return throwError(() => problem);
    }

    const detail =
      typeof body === 'object' &&
      body !== null &&
      'detail' in body &&
      typeof body.detail === 'string' &&
      body.detail.trim()
        ? body.detail
        : null;
    const code =
      typeof body === 'object' && body !== null && 'code' in body && typeof body.code === 'string'
        ? body.code
        : undefined;
    const fallbackTitle =
      error.status === 0
        ? $localize`:@@api.error.networkTitle:Network error`
        : $localize`:@@api.error.requestTitle:Request failed`;
    const title =
      typeof body === 'object' &&
      body !== null &&
      'title' in body &&
      typeof body.title === 'string' &&
      body.title.trim()
        ? body.title
        : fallbackTitle;
    const apiError: ApiError = {
      ...(code ? { code } : {}),
      ...(operationCompleted === undefined ? {} : { operationCompleted }),
      '@id': '',
      '@type': 'Error',
      status: error.status || 0,
      type: 'about:blank',
      title,
      detail:
        detail ??
        (error.status === 0
          ? $localize`:@@requestState.connectionUnavailable:The connection is unavailable. Check your network and try again.`
          : $localize`:@@requestState.requestFailed:The request could not be completed. Please try again.`),
    };

    return throwError(() => apiError);
  };
  //#endregion
}
