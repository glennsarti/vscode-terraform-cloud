/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { DownloadService } from './downloadService';

import type { BaseHttpRequest } from '../tfcApi/core/BaseHttpRequest';
import type { OpenAPIConfig } from '../tfcApi/core/OpenAPI';

export type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;

export class HttpClient {
  public readonly download: DownloadService;

  public readonly request: BaseHttpRequest;

  constructor(config: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor) {
    this.request = new HttpRequest({
      BASE: '',
      VERSION: '',
      WITH_CREDENTIALS: false,
      CREDENTIALS: 'omit',
      TOKEN: undefined,
      USERNAME: undefined,
      PASSWORD: undefined,
      HEADERS: config?.HEADERS,
      ENCODE_PATH: config?.ENCODE_PATH,
    });

    this.download = new DownloadService(this.request);
  }
}
