import { HttpClient, HttpHeaders, HttpParams, type HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Observable, catchError, throwError } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { EnvironmentConfig } from '@core/config/environment/environment-config.interface';
import {
  isApiError,
  type ApiError,
  type ApiRequestOptions,
  type ConstraintViolation,
  type HydraCollection,
  type HydraItem,
  type RequestOptions,
} from '@core/models/api';

export type { ApiRequestOptions, PaginationOptions, RequestOptions } from '@core/models/api';

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
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```typescript
 * @Injectable({ providedIn: 'root' })
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
@Injectable()
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
   * Property defaultHeaders
   * @readonly
   *
   * @description
   * Default HTTP headers for JSON-LD/Hydra API requests.
   * Sets Content-Type and Accept to application/ld+json.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {HttpHeaders}
   */
  protected readonly defaultHeaders: HttpHeaders = new HttpHeaders({
    'Content-Type': 'application/ld+json',
    Accept: 'application/ld+json',
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
   * Builds HttpParams from options object including pagination parameters.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {RequestOptions} [options] - Request options including pagination.
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
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null) {
          params = params.set(key, String(value));
        }
      }
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
        headers: this.buildHeaders(options),
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
        headers: this.buildHeaders(options),
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
    const headers: HttpHeaders = this.buildHeaders(options).set(
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
        headers: this.buildHeaders(options),
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
        headers: this.buildHeaders(options),
        params: this.buildParams(options),
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Method handleError
   *
   * @description
   * Centralized error handling that transforms HttpErrorResponse
   * into a structured ApiError following RFC 7807.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {HttpErrorResponse} error - HTTP error response from Angular.
   *
   * @returns {Observable<never>} Observable that throws the API error.
   */
  protected handleError = (error: HttpErrorResponse): Observable<never> => {
    // Check if server returned a structured API error
    if (isApiError(error.error)) {
      return throwError(() => error.error as ApiError | ConstraintViolation);
    }

    // Network error or non-structured error - create ApiError
    const apiError: ApiError = {
      '@id': '',
      '@type': 'Error',
      status: error.status || 0,
      type: 'about:blank',
      title: error.statusText || 'Network Error',
      detail: error.message || 'An unexpected error occurred',
      instance: null,
    };

    return throwError(() => apiError);
  };
  //#endregion
}
