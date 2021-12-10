import { TfcClient } from '../tfcApi';

/* eslint-disable */
export function createTfcClient(token: string, baseUrl: string): TfcClient {
  // TODO Actually check using the wellknown URL.
  if (!baseUrl.endsWith("/api/v2")) {
    baseUrl += "/api/v2";
  }
  return new TfcClient({ TOKEN: token, BASE: baseUrl });
}
