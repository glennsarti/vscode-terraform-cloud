/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Plan } from '../models/Plan';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class PlansService {

  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * Show a Plan
   * @param planId The id of the plan
   * @returns any Show Plan Response
   * @throws ApiError
   */
  public showPlan(
planId: string,
): CancelablePromise<{
data: Plan;
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/plans/{plan_id}',
      path: {
        'plan_id': planId,
      },
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }

  /**
   * Retrieve the JSON execution plan
   * @param planId The id of the plan
   * @returns any The 200 OK result assumes the the underlying client follows the HTTP 307 redirect.
   * @throws ApiError
   */
  public retrievePlanJson(
planId: string,
): CancelablePromise<any> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/plans/{plan_id}/json-output',
      path: {
        'plan_id': planId,
      },
      errors: {
        307: `HTTP 307 Temporary Redirect`,
        422: `HTTP 422 Unprocessable Entity Response`,
      },
    });
  }

}
