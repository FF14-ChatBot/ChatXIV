export interface HttpClientConfig {
  baseUrl: string;
  getHeaders?: (method: string, path: string, body?: unknown) => Record<string, string>;
}
