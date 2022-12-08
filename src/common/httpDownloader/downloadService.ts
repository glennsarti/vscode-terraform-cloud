/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../tfcApi/core/CancelablePromise';
import type { BaseHttpRequest } from '../tfcApi/core/BaseHttpRequest';

export class DownloadService {

  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * Download from a GET url
   * @param url The url to download
   * @returns any
   * @throws ApiError
   */
  public get(
url: string,
): CancelablePromise<{
data: any;
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: url,
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }
}
