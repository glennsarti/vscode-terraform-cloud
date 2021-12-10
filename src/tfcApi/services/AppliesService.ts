/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Apply } from '../models/Apply';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class AppliesService {

  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * Show an Apply
   * @param applyId The id of the apply
   * @returns any Show Apply Response
   * @throws ApiError
   */
  public showApply(
applyId: string,
): CancelablePromise<{
data: Apply;
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/applies/{apply_id}',
      path: {
        'apply_id': applyId,
      },
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }

}
