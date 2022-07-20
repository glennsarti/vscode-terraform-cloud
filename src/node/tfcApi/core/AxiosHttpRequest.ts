/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiRequestOptions } from '../../../common/tfcApi/core/ApiRequestOptions';
import { BaseHttpRequest } from '../../../common/tfcApi/core/BaseHttpRequest';
import type { CancelablePromise } from '../../../common/tfcApi/core/CancelablePromise';
import type { OpenAPIConfig } from '../../../common/tfcApi/core/OpenAPI';
import { request as __request } from './request';

export class AxiosHttpRequest extends BaseHttpRequest {

  constructor(config: OpenAPIConfig) {
    super(config);
  }

  /**
   * Request method
   * @param options The request options from the service
   * @returns CancelablePromise<T>
   * @throws ApiError
   */
  public override request<T>(options: ApiRequestOptions): CancelablePromise<T> {
    return __request(this.config, options);
  }
}
