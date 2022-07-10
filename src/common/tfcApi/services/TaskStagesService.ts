/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetaPagination } from '../models/MetaPagination';
import type { TaskStage } from '../models/TaskStage';

import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class TaskStagesService {

  constructor(public readonly httpRequest: BaseHttpRequest) {}

  /**
   * Show a task stages in a run
   * @param runId The id of the run
   * @param include Additional resources to include in the response
   * @returns any List Task Stages Response
   * @throws ApiError
   */
  public listRunTaskStages(
runId: string,
include?: Array<string>,
): CancelablePromise<{
data: Array<TaskStage>;
meta?: {
pagination?: MetaPagination;
};
}> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/runs/{run_id}/task-stages',
      path: {
        'run_id': runId,
      },
      query: {
        'include': include,
      },
      errors: {
        404: `HTTP 404 Not Found Response`,
      },
    });
  }

}
