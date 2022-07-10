/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CostEstimate } from '../models/CostEstimate';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class CostEstimatesService {

  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * Show a cost estimate
   * @param costEstimateId The id of the cost estimate
   * @returns any Show Cost Estimate Response
   * @throws ApiError
   */
  public showCostEstimate(
costEstimateId: string,
): CancelablePromise<{
data: CostEstimate;
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/cost-estimates/{cost_estimate_id}',
      path: {
        'cost_estimate_id': costEstimateId,
      },
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }

}
