import { TfcClient } from '../tfcApi';
import { HttpClient } from '../httpDownloader/httpClient';
import { HttpRequestConstructor } from '../tfcApi/TfcClient';

// A minor hack to change the request type depending on node vs web
let httpConstructor: HttpRequestConstructor;
export function setHttpRequestConstructor(contructor: HttpRequestConstructor) {
  httpConstructor = contructor;
}

/* eslint-disable */
export function createTfcClient(token: string, baseUrl: string): TfcClient {
  // TODO Actually check using the wellknown URL.
  if (!baseUrl.endsWith("/api/v2")) {
    baseUrl += "/api/v2";
  }

  let defaultHeaders = {
    'Accept': 'application/vnd.api+json'
  }

  return new TfcClient({
    TOKEN: token,
    BASE: baseUrl,
    HEADERS: defaultHeaders
  }, httpConstructor);
}

/* eslint-disable */
export function createDownloadClient(): HttpClient {
  return new HttpClient({
  }, httpConstructor);
}
