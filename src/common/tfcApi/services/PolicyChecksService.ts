/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetaPagination } from '../models/MetaPagination';
import type { PolicyCheck } from '../models/PolicyCheck';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class PolicyChecksService {

  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * Perform the override action on a Policy Check
   * @param policyCheckId The id of the policy check
   * @param requestBody Policy Check action comment
   * @returns any HTTP 202 Accepted Response
   * @throws ApiError
   */
  public overridePolicyCheck(
policyCheckId: string,
requestBody?: {
comment?: string;
},
): CancelablePromise<any> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/policy-checks/{policy_check_id}/actions/override',
      path: {
        'policy_check_id': policyCheckId,
      },
      body: requestBody,
      mediaType: 'application/vnd.api+json',
      errors: {
        404: `HTTP 404 Not Found Response`,
        409: `HTTP 409 Conflict Response`,
      },
    });
  }

  /**
   * Show policy checks in a run
   * @param runId The id of the run
   * @param pageNumber The page to request. Defaults to the first page
   * @param pageSize The page size to request. Defaults to the 20.
   * @returns any List Policy Checks Response
   * @throws ApiError
   */
  public listRunPolicyChecks(
runId: string,
pageNumber?: number,
pageSize: number = 20,
): CancelablePromise<{
data: Array<PolicyCheck>;
meta?: {
pagination?: MetaPagination;
};
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/runs/{run_id}/policy-checks',
      path: {
        'run_id': runId,
      },
      query: {
        'page[number]': pageNumber,
        'page[size]': pageSize,
      },
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }

}
