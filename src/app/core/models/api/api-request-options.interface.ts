export interface ApiRequestOptions {
  readonly params?: Record<string, string | number | boolean>;
  readonly headers?: Record<string, string>;
}
